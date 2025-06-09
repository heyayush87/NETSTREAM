import React from "react";
import MovieList from "./MovieList";
import { useSelector } from "react-redux";

const SecondaryContainer = () => {
  const movies = useSelector((store) => store.movies);

  return (
    movies && (
      <div className="bg-black w-full">
        <div className="mt-4 sm:mt-8 md:mt-12 lg:mt-16 px-1 sm:px-2 md:px-4 lg:px-6 xl:px-8 w-full max-w-full">
          <MovieList title={"Now Playing"} movies={movies.nowPlayingMovies} />
          <MovieList title={"Trending"} movies={movies.TrendingMovies} />
          <MovieList title={"Popular"} movies={movies.PopularMovies} />
          <MovieList title={"Upcoming Movies"} movies={movies.UpcomingMovies} />
        </div>
      </div>
    )
  );
};

export default SecondaryContainer;
