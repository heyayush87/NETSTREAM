import { CLOUDLFARE_PROXY_URL } from "./constant";

// Frontend-only TMDB access through the existing Cloudflare proxy (no agent, no gateway).
export async function tmdbFetch(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  const res = await fetch(`${CLOUDLFARE_PROXY_URL}?url=${encodeURIComponent(url.toString())}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// TMDB movie genre ids (stable).
export const GENRES = [
  { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" }, { id: 10751, name: "Family" }, { id: 14, name: "Fantasy" },
  { id: 36, name: "History" }, { id: 27, name: "Horror" }, { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" }, { id: 10752, name: "War" }, { id: 37, name: "Western" },
];

export const LANGUAGES = [
  { code: "en", name: "English" }, { code: "hi", name: "Hindi" }, { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" }, { code: "ml", name: "Malayalam" }, { code: "ko", name: "Korean" },
  { code: "ja", name: "Japanese" }, { code: "es", name: "Spanish" }, { code: "fr", name: "French" },
];

export const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "top_rated", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Turn the filter bar's choices into TMDB /discover/movie query params. */
export function buildDiscoverParams({ genre = "", year = "", language = "", sort = "popular", page = 1 } = {}) {
  const base = {
    include_adult: false,
    language: "en-US",
    page,
    with_genres: genre,
    primary_release_year: year,
    with_original_language: language,
    // Only released films: unreleased sequels have huge "popularity" but nothing to watch yet.
    "primary_release_date.lte": today(),
  };
  if (sort === "top_rated") return { ...base, sort_by: "vote_average.desc", "vote_count.gte": 500 }; // floor keeps 10/10 one-vote films out
  if (sort === "newest") return { ...base, sort_by: "primary_release_date.desc", "vote_count.gte": 20 };
  return { ...base, sort_by: "popularity.desc", "vote_count.gte": 100 };
}

export async function discoverMovies(filters) {
  const data = await tmdbFetch("/discover/movie", buildDiscoverParams(filters));
  return { results: (data.results || []).filter((m) => m.poster_path), totalPages: data.total_pages || 1 };
}
