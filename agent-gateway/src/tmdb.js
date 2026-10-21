// Server-side TMDB client. The TMDB token lives only in Worker secrets.
// Only allowlisted read endpoints can be reached (unlike the current open `?url=` proxy).

const TMDB_BASE = "https://api.themoviedb.org/3";

// TMDB movie genre ids are stable; hardcoding avoids an extra round trip per request.
export const GENRES = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749,
  science_fiction: 878, tv_movie: 10770, thriller: 53, war: 10752, western: 37,
};
export const GENRE_NAMES = Object.keys(GENRES);
const GENRE_BY_ID = Object.fromEntries(Object.entries(GENRES).map(([k, v]) => [v, k]));

const ALLOWED = [
  /^\/discover\/movie$/,
  /^\/search\/(movie|keyword)$/,
  /^\/movie\/\d+(\/(videos|recommendations|similar|watch\/providers))?$/,
  /^\/watch\/providers\/movie$/,
  /^\/search\/person$/,
  /^\/person\/\d+\/movie_credits$/,
  /^\/movie\/(now_playing|popular|top_rated|upcoming)$/,
];

// Provider catalogs are per region and TMDB changes ids over time, so never hardcode them.
// Cached per Worker isolate for 24h.
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const catalogCache = new Map(); // region -> { at, map }
export const resetProviderCatalogCache = () => catalogCache.clear();

const normName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Fuzzy-match free-text service names ("prime", "Hotstar") against a { name: id } catalog.
 * A name matches when either normalized string contains the other (short catalog names excluded
 * from the reverse check so "MX" can't match everything).
 */
export function matchProviders(names = [], catalog = {}) {
  const entries = Object.entries(catalog).map(([name, id]) => [normName(name), id]);
  const ids = new Set();
  const unmatched = [];
  for (const raw of names) {
    const q = normName(raw);
    const hits = q.length < 3 ? [] : entries.filter(([n]) => n === q || n.includes(q) || (n.length >= 4 && q.includes(n)));
    if (hits.length) hits.forEach(([, id]) => ids.add(id));
    else unmatched.push(raw);
  }
  return { ids: [...ids], unmatched };
}

const shapeProvider = (p) => ({ id: p.provider_id, name: p.provider_name, logo_path: p.logo_path || null });

export function createTmdb(env) {
  async function get(path, params = {}) {
    if (!ALLOWED.some((re) => re.test(path))) throw new Error(`TMDB path not allowed: ${path}`);
    const url = new URL(TMDB_BASE + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, {
      headers: { accept: "application/json", Authorization: `Bearer ${env.TMDB_READ_TOKEN}` },
      cf: { cacheTtl: 300, cacheEverything: true }, // edge-cache identical queries for 5 min
    });
    if (!res.ok) throw new Error(`TMDB ${path} -> ${res.status}`);
    return res.json();
  }

  async function providerCatalog(region = "IN") {
    const hit = catalogCache.get(region);
    if (hit && Date.now() - hit.at < CATALOG_TTL_MS) return hit.map;
    const data = await get("/watch/providers/movie", { watch_region: region, language: "en-US" });
    const map = Object.fromEntries((data.results || []).map((p) => [p.provider_name, p.provider_id]));
    catalogCache.set(region, { at: Date.now(), map });
    return map;
  }

  return {
    get,
    providerCatalog,
    searchPersonId: async (name) => (await get("/search/person", { query: name, include_adult: false, page: 1 })).results?.[0]?.id ?? null,
    // Ids of every movie the person is credited in as cast.
    castMovieIds: async (personId) => new Set(((await get(`/person/${personId}/movie_credits`)).cast || []).map((m) => m.id)),
    watchProviders: async (id, region = "IN") => {
      const r = (await get(`/movie/${id}/watch/providers`)).results?.[region] || {};
      return {
        link: r.link || null,
        flatrate: (r.flatrate || []).map(shapeProvider),
        rent: (r.rent || []).map(shapeProvider),
        buy: (r.buy || []).map(shapeProvider),
      };
    },
    discover: (params) => get("/discover/movie", { include_adult: false, language: "en-US", page: 1, ...params }),
    searchMovie: async (query) => (await get("/search/movie", { query, include_adult: false, page: 1 })).results || [],
    searchKeywordIds: async (words = []) => {
      const ids = await Promise.all(
        words.slice(0, 4).map(async (w) => (await get("/search/keyword", { query: w })).results?.[0]?.id)
      );
      return ids.filter(Boolean);
    },
    recommendations: async (id) => (await get(`/movie/${id}/recommendations`, { page: 1 })).results || [],
    details: (id) => get(`/movie/${id}`),
    videos: async (id) => (await get(`/movie/${id}/videos`, { language: "en-US" })).results || [],
  };
}

export const genreIds = (names = []) => names.map((n) => GENRES[n]).filter(Boolean);

// Compact card shape shared with the client. Keeps payloads (and model context) small.
export function toCard(m) {
  return {
    id: m.id,
    title: m.title || m.original_title,
    original_title: m.original_title,
    year: (m.release_date || "").slice(0, 4) || null,
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    poster_path: m.poster_path || null,
    backdrop_path: m.backdrop_path || null,
    overview: m.overview || "",
    genres: (m.genre_ids || []).map((g) => GENRE_BY_ID[g]).filter(Boolean),
  };
}

// What the model sees: ids + titles only, never full overviews (token budget).
export const forModel = (cards) => cards.map((c) => `${c.id}|${c.title} (${c.year ?? "?"}) ★${c.rating ?? "-"}`);
