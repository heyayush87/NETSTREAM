// Pure watch-party helpers (no Firebase imports) so they can be unit-tested directly.

export const PARTY_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_PARTY_CANDIDATES = 8;

/** Net score for one movie: sum of every member's +1 / -1. */
export function netScore(votes = {}, movieId) {
  return Object.values(votes).reduce((sum, mine) => sum + (Number(mine?.[movieId]) || 0), 0);
}

/** Up / down counts, for the live tally. */
export function voteCounts(votes = {}, movieId) {
  let up = 0;
  let down = 0;
  for (const mine of Object.values(votes)) {
    const v = mine?.[movieId];
    if (v === 1) up++;
    else if (v === -1) down++;
  }
  return { up, down, net: up - down };
}

/** Highest net score wins; ties go to the agent's fitScore, then to the earlier (better-ranked) candidate. */
export function pickWinner(candidates = [], votes = {}) {
  let best = null;
  candidates.forEach((c, i) => {
    const net = netScore(votes, c.id);
    const fit = Number(c.fitScore) || 0;
    if (!best || net > best.net || (net === best.net && fit > best.fit)) best = { id: c.id, net, fit, i };
  });
  return best ? candidates[best.i] : null;
}

export const isExpired = (party, now = Date.now()) => !party || now >= (party.expiresAt || 0);

// Keep the Firestore doc small: strip the long overview and any unknown fields.
const slimCandidate = (c) => ({
  id: c.id,
  title: c.title,
  year: c.year ?? null,
  rating: c.rating ?? null,
  poster_path: c.poster_path ?? null,
  backdrop_path: c.backdrop_path ?? null,
  overview: String(c.overview || "").slice(0, 240),
  genres: Array.isArray(c.genres) ? c.genres.slice(0, 5) : [],
  fitScore: Number(c.fitScore) || 0,
  whyEveryone: String(c.whyEveryone || "").slice(0, 300),
});

/** Document written by the host when the agent hands over a draft. Shape is enforced by firestore.rules. */
export function buildPartyDoc({ draft, hostUid, hostName, now = Date.now() }) {
  const c = draft.constraints || {};
  return {
    hostUid,
    name: String(draft.name || "Movie night").slice(0, 50),
    createdAt: now,
    expiresAt: now + PARTY_TTL_MS,
    status: "voting",
    constraints: {
      maxRuntime: Number.isInteger(c.maxRuntime) ? c.maxRuntime : null,
      region: /^[A-Z]{2}$/.test(c.region) ? c.region : "IN",
      services: Array.isArray(c.services) ? c.services.filter((s) => typeof s === "string").slice(0, 5) : [],
    },
    members: { [hostUid]: { displayName: String(hostName || "Host").slice(0, 30), joinedAt: now } },
    candidates: (draft.candidates || []).slice(0, MAX_PARTY_CANDIDATES).map(slimCandidate),
    votes: {},
    winnerId: null,
  };
}
