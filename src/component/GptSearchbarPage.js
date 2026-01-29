import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import lang from "../utils/LanguageConstant";
import { addGptMovieResult } from "../utils/GptSlice";
import { GroqApi} from "../utils/GroqApi";

const GptSearchbarPage = () => {
  const langKey = useSelector((store) => store.Config.lang);
  const searchtext = useRef(null);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // TMDB search via Cloudflare proxy (unchanged)
  const searchMovieTmdb = async (movie) => {
    try {
      const proxy =
        "https://broken-band-3f7c.heyayush0709.workers.dev";

      const encoded = encodeURIComponent(
        `https://api.themoviedb.org/3/search/movie?query=${movie}&language=en-US&page=1`
      );

      const res = await fetch(`${proxy}?url=${encoded}`);
      const json = await res.json();
      return json.results || [];
    } catch {
      return [];
    }
  };

  const handleSearchClick = async () => {
    if (loading) return;

    const query = searchtext.current.value.trim();
    if (!query) {
      setError("Enter a movie name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prompt = `
Suggest exactly 10 movies similar to "${query}".
Return only comma-separated movie names.
`;

      // 🔥 GROQ CALL
      const text = await GroqApi(prompt);

      const movieNames = text
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      const movieResults = await Promise.all(
        movieNames.map((m) => searchMovieTmdb(m))
      );

      dispatch(
        addGptMovieResult({
          movieNames,
          movieResults,
        })
      );
    } catch (err) {
      setError("Something went wrong while fetching movies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-10 flex flex-col items-center w-full">
      <form
        className="w-full max-w-2xl bg-black bg-opacity-40 rounded-lg grid grid-cols-12 gap-4 p-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          ref={searchtext}
          className="col-span-9 p-3 rounded bg-gray-800 text-white"
          placeholder={
            lang[langKey]?.gptsearchPlaceholder || "Search movies"
          }
        />
        <button
          className="col-span-3 bg-red-600 rounded text-white"
          onClick={handleSearchClick}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default GptSearchbarPage;
