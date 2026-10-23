import React from "react";
import { useSelector } from "react-redux";
import MovieList from "./MovieList";

const GptMovieSuggestion = () => {
  const gptState = useSelector((store) => store.Gpt);
  const searchQuery = gptState?.searchQuery || "";
  const searchResults = gptState?.searchResults || [];
  const movieNames = gptState?.movieNames || [];
  const movieResults = gptState?.movieResults || [];

  // Nothing searched yet: the popular-movies browser below fills the page.
  if (!searchResults.length && !movieNames.length) return null;

  return (
    <div className="w-full p-2 sm:p-4 m-0 flex flex-col gap-4">
      {/* The movie the user typed: click a poster to play its trailer. */}
      <MovieList title={`Results for "${searchQuery}"`} movies={searchResults} mode="play" />
      {movieNames.length > 0 && <h2 className="px-2 sm:px-6 text-sm text-gray-300">Similar movies you might like</h2>}
      {movieNames.map((movieName, index) => (
        <MovieList key={movieName} title={movieName} movies={movieResults[index] || []} />
      ))}
    </div>
  );
};

export default GptMovieSuggestion;
