import { configureStore } from "@reduxjs/toolkit";
import movies from "../utils/movieSlice";
import Gpt from "../utils/GptSlice";
import player from "../utils/playerSlice";
import watchlists from "../utils/watchlistSlice";
import { applyToolResult } from "./toolHandlers";

const setup = () => {
  const store = configureStore({ reducer: { movies, Gpt, player, watchlists } });
  const navigate = jest.fn();
  return { store, ctx: { dispatch: store.dispatch, getState: store.getState, navigate } };
};
const card = { id: 1, title: "Arrival", poster_path: "/a.jpg" };

test("SHOW_MOVIE_ROW adds a row, leaves AI search and navigates", () => {
  const { store, ctx } = setup();
  store.dispatch({ type: "Gpt/setGptsearch", payload: true });
  const label = applyToolResult(
    { name: "filter_and_display_movies", ok: true, directive: { type: "SHOW_MOVIE_ROW", payload: { rowId: "r1", title: "Sci-Fi", movies: [card, { bad: true }] } } },
    ctx
  );
  expect(store.getState().movies.agentRows[0].movies).toHaveLength(1);
  expect(store.getState().Gpt.showgptsearch).toBe(false);
  expect(ctx.navigate).toHaveBeenCalledWith("/browse");
  expect(label).toMatch(/Sci-Fi/);
});

test("rejects a directive that doesn't belong to the tool", () => {
  const { store, ctx } = setup();
  applyToolResult({ name: "filter_and_display_movies", ok: true, directive: { type: "OPEN_PLAYER", payload: { movie: card } } }, ctx);
  expect(store.getState().player.isOpen).toBe(false);
});

test("OPEN_PLAYER and CREATE_WATCHLIST update their slices", () => {
  const { store, ctx } = setup();
  applyToolResult({ name: "play_or_preview_title", ok: true, directive: { type: "OPEN_PLAYER", payload: { movie: card, videoKey: "yt", mode: "play" } } }, ctx);
  expect(store.getState().player).toMatchObject({ isOpen: true, videoKey: "yt", mode: "play" });
  applyToolResult({ name: "curate_mood_watchlist", ok: true, directive: { type: "CREATE_WATCHLIST", payload: { id: "w1", name: "Rainy", mood: "cozy", items: [card] } } }, ctx);
  expect(store.getState().watchlists.activeId).toBe("w1");
});

describe("check_where_to_watch", () => {
  const providers = { flatrate: [{ id: 8, name: "Netflix", logo_path: "/n.jpg" }, { bad: true }], rent: [], buy: [] };

  test("SHOW_WATCH_PROVIDERS opens a preview with a cleaned providers block", () => {
    const { store, ctx } = setup();
    const label = applyToolResult(
      { name: "check_where_to_watch", ok: true, directive: { type: "SHOW_WATCH_PROVIDERS", payload: { movie: card, region: "IN", providers, link: "https://tmdb.test/w" } } },
      ctx
    );
    const p = store.getState().player;
    expect(p).toMatchObject({ isOpen: true, mode: "preview" });
    expect(p.providers.flatrate).toEqual([{ id: 8, name: "Netflix", logo_path: "/n.jpg" }]);
    expect(p.providers).toMatchObject({ region: "IN", link: "https://tmdb.test/w" });
    expect(label).toMatch(/streams on 1 service/);
  });

  test("drops non-https links", () => {
    const { store, ctx } = setup();
    applyToolResult(
      { name: "check_where_to_watch", ok: true, directive: { type: "SHOW_WATCH_PROVIDERS", payload: { movie: card, region: "IN", providers, link: "javascript:alert(1)" } } },
      ctx
    );
    expect(store.getState().player.providers.link).toBeNull();
  });

  test("rejects a directive that doesn't belong to the tool", () => {
    const { store, ctx } = setup();
    applyToolResult({ name: "check_where_to_watch", ok: true, directive: { type: "OPEN_PLAYER", payload: { movie: card } } }, ctx);
    expect(store.getState().player.isOpen).toBe(false);
  });

  test("OPEN_PLAYER carries providers through", () => {
    const { store, ctx } = setup();
    applyToolResult({ name: "play_or_preview_title", ok: true, directive: { type: "OPEN_PLAYER", payload: { movie: card, videoKey: "yt", mode: "preview", providers: { region: "IN", link: null, ...providers } } } }, ctx);
    expect(store.getState().player.providers.flatrate).toHaveLength(1);
  });
});
