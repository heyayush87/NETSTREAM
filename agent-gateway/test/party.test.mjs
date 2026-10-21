// Feature 3: watch-party scoring. Least-misery ranking, genre vetoes, constraint checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { executeTool, scoreForParty } from "../src/tools.js";

const G = { comedy: 35, horror: 27, science_fiction: 878, drama: 18, romance: 10749, thriller: 53 };
const raw = (id, title, genres, extra = {}) => ({ id, title, poster_path: "/p.jpg", release_date: "2019-05-05", vote_average: 7, genre_ids: genres.map((g) => G[g]), ...extra });
const card = (id, title, genres, rating = 7) => ({ id, title, genres, rating, year: "2019", poster_path: "/p.jpg" });

const RIYA = { name: "Riya", likes_genres: ["comedy"], hard_no_genres: ["horror"] };
const ARJUN = { name: "Arjun", loved_titles: ["Superbad", "Interstellar"] };

test("least misery: the movie nobody hates beats the one half the group loves", () => {
  const members = [{ name: "A", likes_genres: ["comedy"] }, { name: "B", likes_genres: ["drama"] }];
  const ranked = scoreForParty(
    [card(1, "Comedy only", ["comedy"], 9), card(2, "Both", ["comedy", "drama"], 6), card(3, "Neither", ["thriller"], 9)],
    members
  );
  assert.deepEqual(ranked.map((m) => m.id), [2, 1, 3]);
  assert.equal(ranked[0].minScore, 1);
  assert.match(ranked[0].whyEveryone, /A: comedy ✓ · B: drama ✓/);
});

test("members with no stated taste are neutral (0.5) and don't veto", () => {
  const ranked = scoreForParty([card(1, "X", ["comedy"])], [{ name: "A", likes_genres: ["comedy"] }, { name: "B" }]);
  assert.equal(ranked[0].minScore, 0.5);
  assert.match(ranked[0].whyEveryone, /B: open to anything/);
});

test("loved-title recommendations count as a hit and are explained", () => {
  const seedFor = new Map([[1, new Map([[1, "Superbad"]])]]);
  const [m] = scoreForParty([card(1, "Booksmart", ["comedy"])], [RIYA, ARJUN], seedFor);
  assert.match(m.whyEveryone, /Riya: comedy ✓ · Arjun: from 'Superbad' recs/);
  assert.equal(m.minScore, 1);
});

function stub({ discoverResults, recs = {}, details = {}, prov = {} } = {}) {
  const calls = { discover: [] };
  return {
    calls,
    tmdb: {
      providerCatalog: async () => ({ Netflix: 8, "Amazon Prime Video": 119 }),
      discover: async (p) => (calls.discover.push(p), { results: discoverResults }),
      searchMovie: async (q) => [raw(q === "Superbad" ? 100 : 200, q, ["comedy"])],
      recommendations: async (id) => recs[id] || [],
      details: async (id) => details[id] || { runtime: 100 },
      watchProviders: async (id) => prov[id] || { flatrate: [{ id: 8, name: "Netflix" }], rent: [], buy: [] },
    },
  };
}
const args = (extra = {}) => ({ name: "Friday night", members: [RIYA, ARJUN, { name: "Me" }], ...extra });

test("vetoes reach discover as without_genres and filter every candidate, including recs", async () => {
  const { tmdb, calls } = stub({
    discoverResults: [raw(1, "Fun", ["comedy"]), raw(2, "Scary", ["horror"])],
    recs: { 100: [raw(3, "Slasher Comedy", ["comedy", "horror"]), raw(4, "Nice Rec", ["comedy"])] },
  });
  const out = await executeTool("create_watch_party", args(), { tmdb });
  assert.equal(calls.discover[0].without_genres, String(G.horror));
  const ids = out.directive.payload.candidates.map((c) => c.id);
  assert.ok(ids.includes(1) && ids.includes(4));
  assert.ok(!ids.includes(2) && !ids.includes(3), "no horror anywhere");
  assert.equal(out.directive.type, "CREATE_WATCH_PARTY_DRAFT");
  assert.ok(out.directive.payload.candidates.every((c) => c.whyEveryone.includes("Riya")));
});

test("recommendation-sourced movies must satisfy runtime and service constraints", async () => {
  const { tmdb, calls } = stub({
    discoverResults: [raw(1, "Fun", ["comedy"])],
    recs: { 100: [raw(10, "Too Long", ["comedy"]), raw(11, "Not On Services", ["comedy"]), raw(12, "Just Right", ["comedy"])] },
    details: { 10: { runtime: 170 }, 11: { runtime: 95 }, 12: { runtime: 110 } },
    prov: { 11: { flatrate: [{ id: 999, name: "Other" }], rent: [], buy: [] } },
  });
  const out = await executeTool("create_watch_party", args({ max_runtime_minutes: 120, services: ["Netflix", "Prime"] }), { tmdb, region: "IN" });
  const ids = out.directive.payload.candidates.map((c) => c.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [1, 12]);
  const d = calls.discover[0];
  assert.equal(d["with_runtime.lte"], 120);
  assert.deepEqual(d.with_watch_providers.split("|").map(Number).sort((a, b) => a - b), [8, 119]);
  assert.equal(d.watch_region, "IN");
  assert.deepEqual(out.directive.payload.constraints, { maxRuntime: 120, region: "IN", services: ["Netflix", "Prime"] });
});

test("candidates are capped at 8 and the model only sees the top 5", async () => {
  const many = Array.from({ length: 15 }, (_, i) => raw(i + 1, `M${i + 1}`, ["comedy"]));
  const { tmdb } = stub({ discoverResults: many });
  const out = await executeTool("create_watch_party", args(), { tmdb });
  assert.equal(out.directive.payload.candidates.length, 8);
  assert.equal(out.result.top.length, 5);
  assert.ok(out.directive.payload.candidates.every((c) => !("minScore" in c)));
});

test("unknown-only services give an honest result and no directive", async () => {
  const { tmdb, calls } = stub({ discoverResults: [raw(1, "Fun", ["comedy"])] });
  const out = await executeTool("create_watch_party", args({ services: ["Zee5"] }), { tmdb });
  assert.equal(out.directive, undefined);
  assert.deepEqual(out.result.unmatched_services, ["Zee5"]);
  assert.equal(calls.discover.length, 0);
});

test("no movie satisfies the group -> no directive and a note", async () => {
  const { tmdb } = stub({ discoverResults: [raw(2, "Scary", ["horror"])] });
  const out = await executeTool("create_watch_party", args(), { tmdb });
  assert.equal(out.directive, undefined);
  assert.equal(out.result.ok, false);
});
