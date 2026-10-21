import { createSlice } from "@reduxjs/toolkit";

// The existing `movies.Trailer` is a single global used by the hero background, so the
// player gets its own slice to avoid clobbering the hero when a modal opens.
const playerSlice = createSlice({
  name: "player",
  initialState: {
    isOpen: false,
    mode: "preview", // preview (muted, details) | play (fullscreen, sound)
    movie: null,
    videoKey: null,
    queue: [], // movie cards, used when playing a watchlist
    queueIndex: 0,
  },
  reducers: {
    openPlayer: (s, a) => {
      const { movie, videoKey = null, mode = "preview", queue, queueIndex = 0 } = a.payload;
      s.isOpen = true;
      s.movie = movie;
      s.videoKey = videoKey;
      s.mode = mode;
      if (queue) {
        s.queue = queue;
        s.queueIndex = queueIndex;
      }
    },
    setPlayerVideo: (s, a) => {
      s.videoKey = a.payload;
    },
    advanceQueue: (s, a) => {
      const next = s.queueIndex + (a.payload ?? 1);
      if (next < 0 || next >= s.queue.length) return;
      s.queueIndex = next;
      s.movie = s.queue[next];
      s.videoKey = null; // PlayerModal resolves the trailer for queued items
    },
    closePlayer: (s) => {
      s.isOpen = false;
      s.queue = [];
      s.queueIndex = 0;
    },
  },
});

export const { openPlayer, setPlayerVideo, advanceQueue, closePlayer } = playerSlice.actions;
export default playerSlice.reducer;
