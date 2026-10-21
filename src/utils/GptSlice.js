import { createSlice } from "@reduxjs/toolkit";

const GptSlice = createSlice({
  name: "Gpt",
  initialState: {
    showgptsearch: false,
    searchQuery: "", // what the user typed
    searchResults: [], // TMDB matches for that name (poster + trailer)
    movieNames: [],
    movieResults: [],
  },
  reducers: {
    toggleGptsearch: (state) => {
      state.showgptsearch = !state.showgptsearch;
    },
    // Deterministic setter for programmatic navigation (the agent can't "toggle" safely).
    setGptsearch: (state, action) => {
      state.showgptsearch = Boolean(action.payload);
    },
    addGptMovieResult: (state, action) => {
      state.searchQuery = typeof action.payload.searchQuery === "string" ? action.payload.searchQuery : "";
      state.searchResults = Array.isArray(action.payload.searchResults) ? action.payload.searchResults : [];
      state.movieResults = Array.isArray(action.payload.movieResults)
        ? action.payload.movieResults
        : [];
      state.movieNames = Array.isArray(action.payload.movieNames)
        ? action.payload.movieNames
        : [];
    },
  },
});

export const { toggleGptsearch, setGptsearch, addGptMovieResult } = GptSlice.actions;
export default GptSlice.reducer;
