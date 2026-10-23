import { CLOUDLFARE_PROXY_URL } from "../utils/constant";

// Prefer the locked-down gateway proxy; fall back to the existing worker until it's retired.
const GATEWAY = process.env.REACT_APP_AGENT_URL?.replace(/\/$/, "");

const viaProxy = (path) => `${CLOUDLFARE_PROXY_URL}?url=${encodeURIComponent(`https://api.themoviedb.org/3${path}`)}`;

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

// If the gateway is down or unreachable (e.g. local dev without it running), fall back to the
// proxy so trailers and availability keep working instead of silently failing.
async function tmdbGet(path) {
  if (!GATEWAY) return getJson(viaProxy(path));
  try {
    return await getJson(`${GATEWAY}/api/tmdb${path}`);
  } catch {
    return getJson(viaProxy(path));
  }
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
