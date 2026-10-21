import React from "react";
import { useDispatch } from "react-redux";
import { IMG_CDN_URL } from "../utils/constant";
import { openPlayer } from "../utils/playerSlice";

// mode "preview" = muted trailer with details; "play" = full-screen trailer with sound.
const MovieCard = ({ posterpath, movie, mode = "preview" }) => {
  const dispatch = useDispatch();
  if (!posterpath) return null;

  const title = movie?.title || movie?.original_title || "Movie";
  const preview = () =>
    movie &&
    dispatch(
      openPlayer({
        mode,
        movie: {
          id: movie.id,
          title,
          year: (movie.release_date || "").slice(0, 4) || movie.year || null,
          rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : movie.rating ?? null,
          overview: movie.overview,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
        },
      })
    );

  return (
    <button
      type="button"
      onClick={preview}
      className="w-28 xs:w-32 sm:w-40 md:w-44 lg:w-48 xl:w-52 2xl:w-56 pr-2 sm:pr-4 shrink-0 text-left"
      aria-label={mode === "play" ? `Play trailer for ${title}` : `Preview ${title}`}
    >
      <div className="relative">
        <img
          src={`${IMG_CDN_URL}${posterpath}`}
          alt={title}
          loading="lazy"
          className="rounded-lg shadow-md hover:scale-105 transition-transform duration-300 ease-in-out w-full h-auto object-cover"
        />
        {mode === "play" && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-xl text-white ring-2 ring-white/70">
              ▶
            </span>
          </span>
        )}
      </div>
    </button>
  );
};

export default MovieCard;
