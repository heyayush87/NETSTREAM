import { createSlice } from "@reduxjs/toolkit";

const GptSlice = createSlice({
  name: "Gpt",
  initialState: {
    showgptsearch: false,
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
