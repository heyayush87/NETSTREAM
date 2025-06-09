import React from "react";
import { useSelector } from "react-redux";
import MovieList from "./MovieList";

const GptMovieSuggestion = () => {
  const gptState = useSelector((store) => store.Gpt);
  const movieNames = gptState?.movieNames || [];
  const movieResults = gptState?.movieResults || [];

  if (!movieNames.length || !movieResults.length) {
    console.warn("GptMovieSuggestion: No movie suggestions available");
    return (
      <div className="p-2 sm:p-4 m-2 sm:m-4 text-white w-full text-center bg-black bg-opacity-30 rounded">
        <p>No movie suggestions available. Please try searching again.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-2 sm:p-4 m-0 flex flex-col gap-4">
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
