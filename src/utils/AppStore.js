import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./UserSlice";
import moviesReducer from "./movieSlice";
import GptReducer from "./GptSlice";
import ConfigReducer from "./ConfigSlice";
import agentReducer from "./agentSlice";
import playerReducer from "./playerSlice";
import watchlistReducer, { persistWatchlists } from "./watchlistSlice";

const AppStore = configureStore({
  reducer: {
    user: userReducer,
    movies: moviesReducer,
    Gpt: GptReducer,
    Config: ConfigReducer,
    agent: agentReducer,
    player: playerReducer,
    watchlists: watchlistReducer,
  },
});

// Persist watchlists only when they change (reference check keeps this cheap).
let lastLists = AppStore.getState().watchlists.lists;
AppStore.subscribe(() => {
  const { lists } = AppStore.getState().watchlists;
  if (lists !== lastLists) {
    lastLists = lists;
    persistWatchlists(lists);
  }
});

export default AppStore;
