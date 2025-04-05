import React, { useRef, useState } from "react";
import lang from "../utils/LanguageConstant";
import { useDispatch, useSelector } from "react-redux";
import { API_OPTIONS, Gemini_Key } from "../utils/constant";
import { addGptMovieResult } from "../utils/GptSlice";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GptSearchbarPage = () => {
  const langKey = useSelector((store) => store.Config.lang);
  const searchtext = useRef(null);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SEARCH MOVIE API FROM TMDB
  const searchMovieTmdb = async (movie) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${movie}&include_adult=false&language=en-US&page=1`,
        API_OPTIONS
      );
      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }
      const jsonData = await response.json();
      console.log(jsonData);
      return jsonData.results || [];
    } catch (error) {
      console.error("Error fetching movie details from TMDB:", error);
      return [];
    }
  };

  const handleSearchClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const gptQuery =
        "Act as a movie Recommendation System and suggest some movies for the query: " +
        searchtext.current.value +
        ". Only give me 10 movies, comma-separated, like this format: 'Movie1, Movie2, Movie3, Movie4, Movie5'.";

      // Initialize the Gemini AI client
      const genAI = new GoogleGenerativeAI(Gemini_Key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let result;
      let retries = 3;
      while (retries > 0) {
        try {
          result = await model.generateContent(gptQuery);
          break;
        } catch (error) {
          if (error.message.includes("429")) {
            console.warn("Rate limit hit, retrying in 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            retries--;
          } else {
            throw error;
          }
        }
      }

      if (
        !result ||
        !result.response ||
        typeof result.response.text !== "function"
      ) {
        throw new Error("Invalid response from Gemini API");
      }

      const text = await result.response.text();
      const gptMovies = text.split(",").map((movie) => movie.trim());

      if (gptMovies.length === 0) {
        throw new Error("No movies found in GPT response.");
      }

      const promiseArray = gptMovies.map((movie) => searchMovieTmdb(movie));
      const movieResults = await Promise.all(promiseArray);

      dispatch(
        addGptMovieResult({
          movieNames: gptMovies,
          movieResults: movieResults.filter((result) => result.length > 0),
        })
      );
    } catch (error) {
      console.error("Error in handling search:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[10%] flex justify-center">
      <div className="absolute"></div>
      <form
        className="w-1/2 bg-black grid grid-cols-12"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          ref={searchtext}
          className="p-4 m-4 col-span-9"
          type="text"
          placeholder={
            lang[langKey]?.gptsearchPlaceholder || "Search for movies..."
          }
        />
        <button
          className="col-span-3 m-2 bg-red-600 rounded-lg"
          onClick={handleSearchClick}
          disabled={loading}
        >
          {loading ? "Searching..." : lang[langKey]?.search || "Search"}
        </button>
      </form>

      {loading && (
        <div className="text-white mt-4">Fetching recommendations...</div>
      )}
      {error && <div className="text-red-500 mt-4">{error}</div>}
    </div>
  );
};

export default GptSearchbarPage;
