import { CLOUDLFARE_PROXY_URL } from "../utils/constant";

// Prefer the locked-down gateway proxy; fall back to the existing worker until it's retired.
const GATEWAY = process.env.REACT_APP_AGENT_URL?.replace(/\/$/, "");

async function tmdbGet(path) {
  const url = GATEWAY
    ? `${GATEWAY}/api/tmdb${path}`
    : `${CLOUDLFARE_PROXY_URL}?url=${encodeURIComponent(`https://api.themoviedb.org/3${path}`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

const shape = (list = []) => list.map((p) => ({ id: p.provider_id, name: p.provider_name, logo_path: p.logo_path || null }));

/** Where a movie streams/rents/sells in a region. Resolves to an empty block (never throws) so the UI can say "not streaming". */
export async function fetchWatchProviders(movieId, region = "IN") {
  try {
    const r = (await tmdbGet(`/movie/${movieId}/watch/providers`)).results?.[region] || {};
    return { region, link: r.link || null, flatrate: shape(r.flatrate), rent: shape(r.rent), buy: shape(r.buy) };
  } catch {
    return null; // lookup failed: stay in the "unknown" state rather than claiming nothing streams
  }
}

export async function fetchTrailerKey(movieId) {
  try {
    const { results = [] } = await tmdbGet(`/movie/${movieId}/videos`);
    const yt = results.filter((v) => v.site === "YouTube");
    return (yt.find((v) => v.type === "Trailer" && v.official) || yt.find((v) => v.type === "Trailer") || yt[0])?.key || null;
  } catch {
    return null;
  }
}
