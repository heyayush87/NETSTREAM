// Feature 1: where to watch. Tools are exercised directly with a stub TMDB client.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchProviders, createTmdb, resetProviderCatalogCache } from "../src/tmdb.js";
import { executeTool } from "../src/tools.js";

const CATALOG = { Netflix: 8, "Amazon Prime Video": 119, JioHotstar: 2336, "Netflix basic with Ads": 1796 };
const poster = (id, title) => ({ id, title, poster_path: "/p.jpg", release_date: "2020-01-01", vote_average: 7, genre_ids: [53] });

function stub(overrides = {}) {
  const calls = { discover: [] };
  return {
    calls,
    tmdb: {
      providerCatalog: async () => CATALOG,
      discover: async (params) => (calls.discover.push(params), { results: [poster(1, "Heat"), poster(2, "Se7en")] }),
      searchKeywordIds: async () => [],
      searchMovie: async () => [poster(27205, "Inception")],
      details: async (id) => ({ ...poster(id, "Inception"), genres: [{ name: "Thriller" }], runtime: 148 }),
      videos: async () => [{ site: "YouTube", type: "Trailer", official: true, key: "abc" }],
      watchProviders: async () => ({
        link: "https://tmdb.test/watch",
        flatrate: [{ id: 8, name: "Netflix", logo_path: "/n.jpg" }],
        rent: [{ id: 2, name: "Apple TV", logo_path: "/a.jpg" }],
        buy: [],
      }),
      ...overrides,
    },
  };
}

test("matchProviders is case-insensitive, fuzzy, and reports unknown services", () => {
  const { ids, unmatched } = matchProviders(["prime", "NETFLIX", "Zee5"], CATALOG);
  assert.deepEqual(ids.sort((a, b) => a - b), [8, 119, 1796]);
  assert.deepEqual(unmatched, ["Zee5"]);
  assert.deepEqual(matchProviders(["hotstar"], CATALOG).ids, [2336]);
  assert.deepEqual(matchProviders(["x"], CATALOG).unmatched, ["x"], "too-short names never match");
});

test("streaming_on becomes with_watch_providers/watch_region/flatrate on discover", async () => {
  const { tmdb, calls } = stub();
  const out = await executeTool("filter_and_display_movies", { row_title: "T", intent_summary: "x", streaming_on: ["Netflix"], with_genres: ["thriller"] }, { tmdb, region: "IN" });
  const p = calls.discover[0];
  assert.equal(p.watch_region, "IN");
  assert.equal(p.with_watch_monetization_types, "flatrate");
  assert.deepEqual(p.with_watch_providers.split("|").map(Number).sort((a, b) => a - b), [8, 1796]);
  assert.equal(out.directive.type, "SHOW_MOVIE_ROW");
});

test("partially unknown services are reported but still filter", async () => {
  const { tmdb } = stub();
  const out = await executeTool("filter_and_display_movies", { row_title: "T", intent_summary: "x", streaming_on: ["Netflix", "Zee5"] }, { tmdb });
  assert.deepEqual(out.result.unmatched_services, ["Zee5"]);
  assert.ok(out.directive);
});

test("only-unknown services return an honest empty result with no directive", async () => {
  const { tmdb, calls } = stub();
  const out = await executeTool("filter_and_display_movies", { row_title: "T", intent_summary: "x", streaming_on: ["Zee5"] }, { tmdb });
  assert.equal(out.directive, undefined);
  assert.deepEqual(out.result.unmatched_services, ["Zee5"]);
  assert.equal(calls.discover.length, 0, "must not fall back to an unfiltered discover");
});

test("check_where_to_watch returns names for the model and a typed directive for the UI", async () => {
  const { tmdb } = stub();
  const out = await executeTool("check_where_to_watch", { title_query: "Inception" }, { tmdb, region: "US" });
  assert.deepEqual(out.result, { ok: true, title: "Inception", region: "US", stream: ["Netflix"], rent: ["Apple TV"], buy: [] });
  assert.equal(out.directive.type, "SHOW_WATCH_PROVIDERS");
  assert.equal(out.directive.payload.providers.flatrate[0].logo_path, "/n.jpg");
  assert.equal(out.directive.payload.link, "https://tmdb.test/watch");
});

test("play_or_preview_title includes providers, and survives a provider failure", async () => {
  const ok = await executeTool("play_or_preview_title", { movie_id: 1, mode: "preview" }, stub().tmdb && { tmdb: stub().tmdb });
  assert.equal(ok.directive.payload.providers.region, "IN");
  assert.equal(ok.directive.payload.providers.flatrate[0].name, "Netflix");
  const bad = await executeTool("play_or_preview_title", { movie_id: 1, mode: "play" }, { tmdb: stub({ watchProviders: async () => { throw new Error("boom"); } }).tmdb });
  assert.equal(bad.directive.type, "OPEN_PLAYER");
  assert.equal(bad.directive.payload.providers, null);
});

test("watch-provider paths are allowlisted and the catalog is cached", async () => {
  resetProviderCatalogCache();
  const seen = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    seen.push(url.pathname);
    if (url.pathname.endsWith("/watch/providers/movie")) return Response.json({ results: [{ provider_name: "Netflix", provider_id: 8 }] });
    if (url.pathname.endsWith("/watch/providers")) return Response.json({ results: { IN: { link: "l", flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n" }] } } });
    return Response.json({});
  };
  const tmdb = createTmdb({ TMDB_READ_TOKEN: "t" });
  await tmdb.providerCatalog("IN");
  await tmdb.providerCatalog("IN");
  assert.equal(seen.filter((p) => p === "/3/watch/providers/movie").length, 1, "second call served from cache");
  const wp = await tmdb.watchProviders(5, "IN");
  assert.equal(wp.flatrate[0].name, "Netflix");
  assert.deepEqual((await tmdb.watchProviders(5, "ZZ")).flatrate, []);
  await assert.rejects(tmdb.get("/account/1"), /not allowed/);
});

test("an ambiguous title resolves to the exact match, not the hyped sequel, and reports the others", async () => {
  const hit = (id, title, year, popularity) => ({ id, title, original_title: title, release_date: `${year}-01-01`, popularity, poster_path: "/p.jpg", vote_average: 7, genre_ids: [] });
  const hits = [
    hit(1003596, "Avengers: Doomsday", 2026, 1087),
    hit(299534, "Avengers: Endgame", 2019, 81),
    hit(24428, "The Avengers", 2012, 63),
    hit(99861, "Avengers: Age of Ultron", 2015, 52),
    hit(9320, "The Avengers", 1998, 6),
  ];
  const { tmdb } = stub({ searchMovie: async () => hits, details: async (id) => ({ ...hits.find((h) => h.id === id), genres: [], runtime: 143 }) });
  const out = await executeTool("play_or_preview_title", { title_query: "Avengers", mode: "preview" }, { tmdb });
  assert.equal(out.directive.payload.movie.id, 24428, "exact title, most popular");
  assert.ok(out.result.other_matches.some((m) => m.includes("Doomsday")), "alternatives are reported to the model");
  const byYear = await executeTool("play_or_preview_title", { title_query: "Avengers", release_year: 2015, mode: "preview" }, { tmdb: stub({ searchMovie: async () => hits, details: async (id) => ({ ...hits.find((h) => h.id === id), genres: [] }) }).tmdb });
  assert.equal(byYear.directive.payload.movie.id, 99861, "an explicit year wins even when the title is not an exact match");
});
