import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "netstream.watchlists.v1";

export const loadWatchlists = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const persistWatchlists = (lists) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch {
    /* storage full or blocked — watchlists stay in memory */
  }
};

const watchlistSlice = createSlice({
  name: "watchlists",
  initialState: { lists: loadWatchlists(), activeId: null },
  reducers: {
    createWatchlist: (s, a) => {
      s.lists = [a.payload, ...s.lists.filter((l) => l.id !== a.payload.id)].slice(0, 20);
      s.activeId = a.payload.id;
    },
    deleteWatchlist: (s, a) => {
      s.lists = s.lists.filter((l) => l.id !== a.payload);
      if (s.activeId === a.payload) s.activeId = null;
    },
    removeWatchlistItem: (s, a) => {
      const list = s.lists.find((l) => l.id === a.payload.listId);
      if (list) list.items = list.items.filter((m) => m.id !== a.payload.movieId);
    },
    moveWatchlistItem: (s, a) => {
      const { listId, from, to } = a.payload;
      const list = s.lists.find((l) => l.id === listId);
      if (!list || to < 0 || to >= list.items.length) return;
      const [item] = list.items.splice(from, 1);
      list.items.splice(to, 0, item);
    },
    setActiveWatchlist: (s, a) => {
      s.activeId = a.payload;
    },
  },
});

export const { createWatchlist, deleteWatchlist, removeWatchlistItem, moveWatchlistItem, setActiveWatchlist } =
  watchlistSlice.actions;
export default watchlistSlice.reducer;
