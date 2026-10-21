// Client half of each tool: turns a server-validated directive into Redux actions and
// navigation. This is the ONLY place the agent can change the UI, so it is the security
// boundary on the client — unknown directive types are dropped, payloads are re-checked.

import { addAgentRow } from "../utils/movieSlice";
import { setGptsearch } from "../utils/GptSlice";
import { openPlayer } from "../utils/playerSlice";
import { createWatchlist } from "../utils/watchlistSlice";
import { candidatesShown } from "../utils/agentSlice";

const isCard = (m) => m && Number.isInteger(m.id) && typeof m.title === "string";

// Re-validate provider blocks: only well-formed entries reach the UI, and only https links.
const cleanList = (l) => (Array.isArray(l) ? l.filter((p) => p && typeof p.name === "string").map((p) => ({ id: p.id, name: p.name, logo_path: typeof p.logo_path === "string" ? p.logo_path : null })) : []);
const cleanProviders = (p, region, link) =>
  p && typeof p === "object"
    ? { region: /^[A-Z]{2}$/.test(region || p.region) ? region || p.region : "IN", link: /^https:\/\//.test(link || p.link || "") ? link || p.link : null, flatrate: cleanList(p.flatrate), rent: cleanList(p.rent), buy: cleanList(p.buy) }
    : null;

// Leave the AI-search view, go to /browse, and scroll an element into view once it renders.
function showOnBrowse({ dispatch, navigate, getState }, elementId) {
  if (getState().Gpt.showgptsearch) dispatch(setGptsearch(false));
  if (window.location.pathname !== "/browse") navigate("/browse");
  if (!elementId) return;
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(elementId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    else if (tries++ < 20) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export const TOOL_HANDLERS = {
  filter_and_display_movies: {
    label: "Finding movies",
    directiveType: "SHOW_MOVIE_ROW",
    run(payload, ctx) {
      const movies = (payload.movies || []).filter(isCard);
      if (!movies.length) return "No titles to show";
      ctx.dispatch(addAgentRow({ ...payload, movies }));
      showOnBrowse(ctx, `agent-row-${payload.rowId}`);
      return `Added “${payload.title}” · ${movies.length} titles`;
    },
  },

  play_or_preview_title: {
    label: "Opening player",
    directiveType: "OPEN_PLAYER",
    run(payload, { dispatch }) {
      if (!isCard(payload.movie)) return "Couldn't open that title";
      dispatch(openPlayer({ movie: payload.movie, videoKey: payload.videoKey, mode: payload.mode, providers: cleanProviders(payload.providers) }));
      return payload.videoKey ? `Playing ${payload.movie.title}` : `${payload.movie.title} (no trailer available)`;
    },
  },

  identify_movie_from_description: {
    label: "Searching my memory",
    directiveType: "SHOW_CANDIDATES",
    run(payload, { dispatch }) {
      const items = (payload.candidates || []).filter(isCard).map((c) => ({
        ...c,
        reason: typeof c.reason === "string" ? c.reason.slice(0, 160) : "",
        confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0)),
      }));
      if (!items.length) return "No verified matches";
      dispatch(candidatesShown({ query: String(payload.query || "").slice(0, 500), items }));
      return `${items.length} possible match${items.length > 1 ? "es" : ""}`;
    },
  },

  check_where_to_watch: {
    label: "Checking where to watch",
    directiveType: "SHOW_WATCH_PROVIDERS",
    run(payload, { dispatch }) {
      if (!isCard(payload.movie)) return "Couldn't find that title";
      const providers = cleanProviders(payload.providers, payload.region, payload.link);
      dispatch(openPlayer({ movie: payload.movie, mode: "preview", providers }));
      const n = providers ? providers.flatrate.length : 0;
      return n ? `${payload.movie.title} streams on ${n} service${n > 1 ? "s" : ""}` : `${payload.movie.title} · availability`;
    },
  },

  curate_mood_watchlist: {
    label: "Curating watchlist",
    directiveType: "CREATE_WATCHLIST",
    run(payload, ctx) {
      const items = (payload.items || []).filter(isCard);
      if (!items.length) return "Watchlist was empty";
      ctx.dispatch(createWatchlist({ ...payload, items }));
      showOnBrowse(ctx, `watchlist-${payload.id}`);
      return `Saved “${payload.name}” · ${items.length} titles`;
    },
  },
};

/** Executes a tool_result event. Returns a short human label for the tool chip. */
export function applyToolResult(evt, ctx) {
  const handler = TOOL_HANDLERS[evt.name];
  if (!handler) return null;
  if (!evt.ok) return evt.result?.error ? "Tool failed" : null;
  if (!evt.directive) return evt.result?.note || null;
  if (evt.directive.type !== handler.directiveType) {
    console.warn("Rejected directive", evt.directive.type, "for", evt.name);
    return null;
  }
  return handler.run(evt.directive.payload || {}, ctx);
}
