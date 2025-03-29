import { createSlice } from "@reduxjs/toolkit";

const movieSlice = createSlice({
  name: "movies",
  initialState: {
    nowPlayingMovies: null,
    Trailer: null,
    PopularMovies: null,
    TrendingMovies: null,
    UpcomingMovies: null,
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
  },
});

export const {
  addNowPlayingMovies,
  addTrailer,
  addPopularMovies,
  addTrendingMovies,
  addUpcomingMovies,
} = movieSlice.actions;
export default movieSlice.reducer;
