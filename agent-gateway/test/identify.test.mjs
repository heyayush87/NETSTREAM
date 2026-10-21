// Feature 2: tip-of-my-tongue finder. The model proposes, the server verifies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { executeTool } from "../src/tools.js";
import { createTmdb } from "../src/tmdb.js";

const movie = (id, title, year, extra = {}) => ({ id, title, original_title: title, release_date: `${year}-02-02`, poster_path: "/p.jpg", vote_average: 7, genre_ids: [35], ...extra });
const DB = {
  "Groundhog Day": [movie(137, "Groundhog Day", 1993)],
  "Palm Springs": [movie(587996, "Palm Springs", 2020)],
  Dune: [movie(841, "Dune", 1984), movie(438631, "Dune", 2021)],
  // fuzzy TMDB behaviour: returns an unrelated film for a made-up title
  "Zorblax Quantum Heist": [movie(9, "Heist School", 2011)],
};
const CAST = { "Bill Murray": new Set([137]) };

const tmdb = {
  searchMovie: async (q) => DB[q] || [],
  searchPersonId: async (n) => (CAST[n] ? n : null),
  castMovieIds: async (id) => CAST[id],
};
const run = (args) => executeTool("identify_movie_from_description", { description: "d", ...args }, { tmdb });
const cand = (title, confidence, extra = {}) => ({ title, reason: "r", confidence, ...extra });

test("unverified and made-up titles are dropped, never shown", async () => {
  const out = await run({ candidates: [cand("Zorblax Quantum Heist", 0.9), cand("Not In TMDB At All", 0.8), cand("Groundhog Day", 0.7)] });
  const titles = out.directive.payload.candidates.map((c) => c.title);
  assert.deepEqual(titles, ["Groundhog Day"]);
  assert.equal(out.result.length, 1);
});

test("zero verified candidates -> found: 0 and no directive", async () => {
  const out = await run({ candidates: [cand("Zorblax Quantum Heist", 0.9)] });
  assert.deepEqual(out.result, { found: 0 });
  assert.equal(out.directive, undefined);
});

test("prefers the hit within ±1 year of the proposed year", async () => {
  const out = await run({ candidates: [cand("Dune", 0.6, { year: 2021 })] });
  assert.equal(out.directive.payload.candidates[0].id, 438631);
});

test("result is compact, sorted by confidence, with reasons capped at 160 chars", async () => {
  const out = await run({ candidates: [cand("Palm Springs", 0.4), cand("Groundhog Day", 0.82, { reason: "x".repeat(300) })] });
  assert.deepEqual(out.result, ["137|Groundhog Day (1993) conf=0.82", "587996|Palm Springs (2020) conf=0.4"]);
  assert.equal(out.directive.payload.candidates[0].reason.length, 160);
  assert.equal(out.directive.type, "SHOW_CANDIDATES");
});

test("year-range penalty (-0.2) applies outside the remembered range only", async () => {
  const out = await run({ remembered: { approx_year_from: 2015, approx_year_to: 2022 }, candidates: [cand("Groundhog Day", 0.9), cand("Palm Springs", 0.8)] });
  const [first, second] = out.directive.payload.candidates;
  assert.equal(first.title, "Palm Springs");
  assert.equal(first.confidence, 0.8);
  assert.equal(second.confidence, 0.7);
});

test("actor boost (+0.15) only when the actor is in the candidate's cast", async () => {
  const out = await run({ remembered: { actors: ["Bill Murray"] }, candidates: [cand("Palm Springs", 0.8), cand("Groundhog Day", 0.7)] });
  const [first, second] = out.directive.payload.candidates;
  assert.equal(first.title, "Groundhog Day");
  assert.equal(first.confidence, 0.85);
  assert.equal(second.confidence, 0.8);
});

test("confidence is clamped to [0,1]", async () => {
  const out = await run({ remembered: { actors: ["Bill Murray"] }, candidates: [cand("Groundhog Day", 0.95)] });
  assert.equal(out.directive.payload.candidates[0].confidence, 1);
});

test("person search and credits are allowlisted, other person paths are not", async () => {
  globalThis.fetch = async (input) => {
    const u = new URL(String(input));
    if (u.pathname === "/3/search/person") return Response.json({ results: [{ id: 5 }] });
    if (u.pathname === "/3/person/5/movie_credits") return Response.json({ cast: [{ id: 137 }] });
    return Response.json({});
  };
  const t = createTmdb({ TMDB_READ_TOKEN: "t" });
  assert.equal(await t.searchPersonId("Bill Murray"), 5);
  assert.ok((await t.castMovieIds(5)).has(137));
  await assert.rejects(t.get("/person/5"), /not allowed/);
  await assert.rejects(t.get("/person/5/combined_credits"), /not allowed/);
});
