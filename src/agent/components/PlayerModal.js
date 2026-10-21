import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closePlayer, advanceQueue, setPlayerVideo } from "../../utils/playerSlice";
import { IMG_CDN_URL } from "../../utils/constant";
import { fetchTrailerKey } from "../tmdbClient";

const PlayerModal = () => {
  const dispatch = useDispatch();
  const { isOpen, mode, movie, videoKey, queue, queueIndex } = useSelector((s) => s.player);

  // Items opened from a card or a watchlist arrive without a trailer key — resolve it here.
  useEffect(() => {
    if (!isOpen || !movie || videoKey) return;
    let cancelled = false;
    fetchTrailerKey(movie.id).then((key) => !cancelled && key && dispatch(setPlayerVideo(key)));
    return () => {
      cancelled = true;
    };
  }, [isOpen, movie, videoKey, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && dispatch(closePlayer());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, dispatch]);

  if (!isOpen || !movie) return null;
  const isPlay = mode === "play";
  const src = videoKey
    ? `https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&mute=${isPlay ? 0 : 1}&rel=0&modestbranding=1&playsinline=1`
    : null;

  return (
    <div
      className="fixed inset-0 z-[45] flex items-center justify-center bg-black/80 p-0 sm:p-6"
      onClick={() => dispatch(closePlayer())}
      role="dialog"
      aria-modal="true"
      aria-label={`${movie.title} player`}
    >
      <div
        className={`relative w-full overflow-hidden bg-gray-950 text-white shadow-2xl ${isPlay ? "h-full sm:h-auto sm:max-w-6xl" : "max-w-3xl rounded-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full bg-black">
          {src ? (
            <iframe className="h-full w-full" src={src} title={`${movie.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : movie.backdrop_path ? (
            <img src={`${IMG_CDN_URL}${movie.backdrop_path}`} alt="" className="h-full w-full object-cover opacity-60" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">Loading trailer…</div>
          )}
          <button onClick={() => dispatch(closePlayer())} className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-sm hover:bg-black" aria-label="Close player">
            ✕
          </button>
        </div>

        <div className="space-y-2 p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-xl font-bold sm:text-2xl">{movie.title}</h2>
            <span className="text-sm text-gray-400">
              {[movie.year, movie.rating && `★ ${movie.rating}`, movie.runtime && `${movie.runtime} min`].filter(Boolean).join(" · ")}
            </span>
          </div>
          {!isPlay && <p className="line-clamp-3 text-sm text-gray-300">{movie.overview}</p>}
          {queue.length > 1 && (
            <div className="flex items-center gap-3 pt-2 text-sm">
              <button disabled={queueIndex === 0} onClick={() => dispatch(advanceQueue(-1))} className="rounded bg-gray-800 px-3 py-1.5 disabled:opacity-30">
                ‹ Prev
              </button>
              <span className="text-gray-400">{queueIndex + 1} / {queue.length}</span>
              <button disabled={queueIndex >= queue.length - 1} onClick={() => dispatch(advanceQueue(1))} className="rounded bg-gray-800 px-3 py-1.5 disabled:opacity-30">
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerModal;
