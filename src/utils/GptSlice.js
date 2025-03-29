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

export const { toggleGptsearch, addGptMovieResult } = GptSlice.actions;
export default GptSlice.reducer;
