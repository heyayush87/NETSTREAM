import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import lang from "../utils/LanguageConstant";
import { addGptMovieResult } from "../utils/GptSlice";
import { GroqApi } from "../utils/GroqApi";
import { CLOUDLFARE_PROXY_URL } from "../utils/constant";

// TMDB search via the Cloudflare proxy. Returns [] on any failure so callers never throw.
export const searchMovieTmdb = async (movie) => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movie)}&language=en-US&page=1`;
    const res = await fetch(`${CLOUDLFARE_PROXY_URL}?url=${encodeURIComponent(tmdbUrl)}`);
    const json = await res.json();
    return json.results || [];
  } catch {
    return [];
  }
};

const GptSearchbarPage = () => {
  const langKey = useSelector((store) => store.Config.lang);
  const searchtext = useRef(null);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (loading) return;

    const query = searchtext.current.value.trim();
    if (!query) {
      setError("Enter a movie name");
      return;
    }

    setLoading(true);
    setError(null);

    // 1) Show the movie the user typed (poster + trailer on click) right away.
    const found = (await searchMovieTmdb(query)).filter((m) => m.poster_path).slice(0, 12);
    dispatch(addGptMovieResult({ searchQuery: query, searchResults: found, movieNames: [], movieResults: [] }));
    if (!found.length) setError(`No movie found for "${query}"`);

    // 2) Then add AI "similar movies". If this fails, the search results above stay on screen.
    try {
      const text = await GroqApi(`
Suggest exactly 10 movies similar to "${query}".
Return only comma-separated movie names.
`);
      const movieNames = text
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      const movieResults = await Promise.all(movieNames.map((m) => searchMovieTmdb(m)));
      dispatch(addGptMovieResult({ searchQuery: query, searchResults: found, movieNames, movieResults }));
    } catch {
      if (found.length) setError("Couldn't load similar movies right now.");
      else setError("Something went wrong while fetching movies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-10 flex flex-col items-center w-full">
      <form
        className="w-full max-w-2xl bg-black bg-opacity-40 rounded-lg grid grid-cols-12 gap-4 p-4"
        onSubmit={handleSearch}
      >
        <input
          ref={searchtext}
          className="col-span-9 p-3 rounded bg-gray-800 text-white"
          placeholder={lang[langKey]?.gptsearchPlaceholder || "Search movies"}
          aria-label="Movie name"
        />
        <button type="submit" className="col-span-3 bg-red-600 rounded text-white" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default GptSearchbarPage;
