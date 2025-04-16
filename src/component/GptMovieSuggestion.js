import React from "react";
import { useSelector } from "react-redux";
import MovieList from "./MovieList";

const GptMovieSuggestion = () => {
  const gptState = useSelector((store) => store.Gpt);
  const movieNames = gptState?.movieNames || [];
  const movieResults = gptState?.movieResults || [];

  // console.log("MOVIE NAMES:", movieNames);
  // console.log("MOVIE RESULTS:", movieResults);

  if (!movieNames.length || !movieResults.length) {
    console.warn("GptMovieSuggestion: No movie suggestions available");
    return (
      <div className="p-4 m-4 text-white text-center text-sm sm:text-base">
        <p>No movie suggestions available. Please try searching again.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 m-4 space-y-6">
      {movieNames.map((movieName, index) => (
        <MovieList
          key={movieName}
          title={movieName}
          movies={movieResults[index] || []}
        />
      ))}
    </div>
  );
};

export default GptMovieSuggestion;
