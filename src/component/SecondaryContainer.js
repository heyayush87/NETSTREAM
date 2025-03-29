import React from "react";
import MovieList from "./MovieList";
import { useSelector } from "react-redux";

const SecondaryContainer = () => {
  const movies = useSelector((store) => store.movies);

  return (
    movies && (
      <div className="bg-black">
        <div className="-mt-48 pl-12 relative z-30">
          <MovieList title={"Now Playing"} movies={movies.nowPlayingMovies} />
          <MovieList title={"Trending"} movies={movies.TrendingMovies} />
          <MovieList title={"popular"} movies={movies.PopularMovies} />
          <MovieList title={"Upcoming Movies"} movies={movies.UpcomingMovies} />
          {/* {
    MovieList-Popular
      MoviesCard-*n
    MovieList-NowPlaying
    MovieList-Trending
    MovieList-Horror
    } */}
        </div>
      </div>
    )
  );
};

export default SecondaryContainer;
