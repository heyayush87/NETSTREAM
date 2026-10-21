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
  /^\/movie\/\d+(\/(videos|recommendations|similar))?$/,
  /^\/movie\/(now_playing|popular|top_rated|upcoming)$/,
];

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

  return {
    get,
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
