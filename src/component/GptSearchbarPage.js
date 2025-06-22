import React, { useRef, useState } from "react";
import lang from "../utils/LanguageConstant";
import { useDispatch, useSelector } from "react-redux";
import {
  API_OPTIONS,
  Gemini_Key
} from "../utils/constant";
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
      const CLOUDLFARE_PROXY_URL =
        "https://broken-band-3f7c.heyayush0709.workers.dev";
      const encodedUrl = encodeURIComponent(
        `https://api.themoviedb.org/3/search/movie?query=${movie}&include_adult=false&language=en-US&page=1`
      );

      const response = await fetch(`${CLOUDLFARE_PROXY_URL}?url=${encodedUrl}`);

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} - ${movie}`);
      }

      const jsonData = await response.json();
      return jsonData.results || [];
    } catch (error) {
      console.error("Error fetching movie details from TMDB:", error);
      return [];
    }
  };
  

  const handleSearchClick = async () => {
    const query = searchtext.current.value.trim();

    if (!query) {
      setError("Please enter something to search.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gptQuery =
        "Act as a movie Recommendation System and suggest some movies for the query: " +
        query +
        ". Only give me 10 movies, comma-separated, like this format: 'Movie1, Movie2, Movie3, Movie4, Movie5'.";

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
    <div className="pt-10 flex flex-col items-center w-full">
      <form
        className="w-full max-w-2xl bg-black bg-opacity-40 rounded-lg grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-2 sm:p-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          ref={searchtext}
          className="col-span-1 sm:col-span-9 p-3 rounded text-base bg-gray-800 text-white placeholder-gray-400 outline-none"
          placeholder={
            lang[langKey]?.gptsearchPlaceholder || "Search for movies..."
          }
        />
        <button
          className="col-span-1 sm:col-span-3 p-3 bg-red-600 rounded-lg text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
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
