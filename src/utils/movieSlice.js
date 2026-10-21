import { createSlice } from "@reduxjs/toolkit";

const movieSlice = createSlice({
  name: "movies",
  initialState: {
    nowPlayingMovies: null,
    Trailer: null,
    PopularMovies: null,
    TrendingMovies: null,
    UpcomingMovies: null,
    agentRows: [], // rows created by the AI agent: { rowId, title, subtitle, movies }
  },

  reducers: {
    addNowPlayingMovies: (state, action) => {
      state.nowPlayingMovies = action.payload;
    },
    addTrailer: (state, action) => {
      state.Trailer = action.payload;
    },
    addPopularMovies: (state, action) => {
      state.PopularMovies = action.payload;
    },
    addTrendingMovies: (state, action) => {
      state.TrendingMovies = action.payload;
    },
    addUpcomingMovies: (state, action) => {
      state.UpcomingMovies = action.payload;
    },
    addAgentRow: (state, action) => {
      const { placement, ...row } = action.payload;
      const rest = placement === "replace_all" ? [] : state.agentRows;
      state.agentRows = [row, ...rest].slice(0, 5); // cap so the page doesn't grow forever
    },
    removeAgentRow: (state, action) => {
      state.agentRows = state.agentRows.filter((r) => r.rowId !== action.payload);
    },
  },
});

export const {
  addNowPlayingMovies,
  addTrailer,
  addPopularMovies,
  addTrendingMovies,
  addUpcomingMovies,
  addAgentRow,
  removeAgentRow,
} = movieSlice.actions;
export default movieSlice.reducer;
