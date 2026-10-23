import React, { useEffect, useRef, useState } from "react";
import MovieCard from "./MovieCard";
import { GENRES, LANGUAGES, SORTS, discoverMovies } from "../utils/tmdbApi";

const YEARS = Array.from({ length: new Date().getFullYear() - 1979 }, (_, i) => new Date().getFullYear() - i);

const selectCls = "min-h-10 rounded bg-gray-800 px-2 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-red-600";

/**
 * Browse popular movies and narrow them with filters. Clicking a poster plays the trailer.
 * Frontend only: talks to TMDB through the existing proxy.
 */
const MovieExplorer = () => {
  const [filters, setFilters] = useState({ genre: "", year: "", language: "", sort: "popular" });
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0); // ignore answers from a filter the user has already changed

  const load = async (nextFilters, nextPage) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const { results, totalPages: tp } = await discoverMovies({ ...nextFilters, page: nextPage });
      if (id !== latest.current) return;
      setMovies((prev) => (nextPage === 1 ? results : [...prev, ...results.filter((m) => !prev.some((p) => p.id === m.id))]));
      setPage(nextPage);
      setTotalPages(tp);
    } catch {
      if (id === latest.current) setError("Couldn't load movies. Check your connection and try again.");
    } finally {
      if (id === latest.current) setLoading(false);
    }
  };

  useEffect(() => {
    load(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const active = filters.genre || filters.year || filters.language;
  const heading = SORTS.find((s) => s.value === filters.sort).label + (active ? " (filtered)" : " movies");

  return (
    <section className="w-full" aria-label="Browse movies">
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-6">
        <label className="sr-only" htmlFor="f-sort">Sort by</label>
        <select id="f-sort" className={selectCls} value={filters.sort} onChange={set("sort")}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-genre">Genre</label>
        <select id="f-genre" className={selectCls} value={filters.genre} onChange={set("genre")}>
          <option value="">All genres</option>
          {GENRES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-year">Year</label>
        <select id="f-year" className={selectCls} value={filters.year} onChange={set("year")}>
          <option value="">Any year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="sr-only" htmlFor="f-lang">Language</label>
        <select id="f-lang" className={selectCls} value={filters.language} onChange={set("language")}>
          <option value="">Any language</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        {active && (
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, genre: "", year: "", language: "" }))}
            className="min-h-10 rounded px-3 text-sm text-gray-300 underline hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      <h2 className="px-2 sm:px-6 my-3 text-lg sm:text-2xl text-white font-semibold">{heading}</h2>

      {error && (
        <p className="px-2 sm:px-6 text-red-400" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={() => load(filters, 1)}>Retry</button>
        </p>
      )}
      {!loading && !error && movies.length === 0 && <p className="px-2 sm:px-6 text-gray-300">No movies match these filters.</p>}

      <div className="flex flex-wrap gap-y-3 px-2 sm:px-6">
        {movies.map((m) => (
          <MovieCard key={m.id} posterpath={m.poster_path} movie={m} mode="play" />
        ))}
      </div>

      <div className="flex justify-center py-4">
        {loading ? (
          <span className="text-gray-300" role="status">Loading…</span>
        ) : (
          page < totalPages && !error && (
            <button type="button" onClick={() => load(filters, page + 1)} className="min-h-10 rounded bg-gray-800 px-5 text-sm text-white hover:bg-gray-700">
              Load more
            </button>
          )
        )}
      </div>
    </section>
  );
};

export default MovieExplorer;
