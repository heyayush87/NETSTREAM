// Client half of each tool: turns a server-validated directive into Redux actions and
// navigation. This is the ONLY place the agent can change the UI, so it is the security
// boundary on the client — unknown directive types are dropped, payloads are re-checked.

import { addAgentRow } from "../utils/movieSlice";
import { setGptsearch } from "../utils/GptSlice";
import { openPlayer } from "../utils/playerSlice";
import { createWatchlist } from "../utils/watchlistSlice";

const isCard = (m) => m && Number.isInteger(m.id) && typeof m.title === "string";

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
      dispatch(openPlayer({ movie: payload.movie, videoKey: payload.videoKey, mode: payload.mode }));
      return payload.videoKey ? `Playing ${payload.movie.title}` : `${payload.movie.title} (no trailer available)`;
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
