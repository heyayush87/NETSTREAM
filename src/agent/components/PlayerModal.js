import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closePlayer, advanceQueue, setPlayerVideo, setPlayerProviders } from "../../utils/playerSlice";
import { IMG_CDN_URL } from "../../utils/constant";
import { fetchTrailerKey, fetchWatchProviders } from "../tmdbClient";

const LOGO_CDN = "https://image.tmdb.org/t/p/w92";
const GROUPS = [
  ["flatrate", "Stream"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];

// Availability block. `providers === null` means "still loading / lookup failed", not "nowhere".
export function WhereToWatch({ providers, region }) {
  const regionName = region === "IN" ? "India" : region;
  const groups = providers ? GROUPS.filter(([k]) => providers[k]?.length) : [];
  return (
    <section className="space-y-2 border-t border-white/10 pt-3" aria-label="Where to watch">
      <h3 className="text-sm font-semibold text-gray-200">Where to watch</h3>
      {!providers ? (
        <p className="text-sm text-gray-500">Checking availability…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-400">Not streaming in {regionName} right now</p>
      ) : (
        groups.map(([key, label]) => (
          <div key={key} className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs uppercase tracking-wide text-gray-500">{label}</span>
            {providers[key].map((p) => {
              const logo = p.logo_path ? (
                <img src={`${LOGO_CDN}${p.logo_path}`} alt={p.name} title={p.name} className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
              ) : (
                <span className="flex h-10 items-center rounded-lg bg-gray-800 px-3 text-xs">{p.name}</span>
              );
              return providers.link ? (
                <a key={p.id ?? p.name} href={providers.link} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} — ${label}`}>
                  {logo}
                </a>
              ) : (
                <span key={p.id ?? p.name}>{logo}</span>
              );
            })}
          </div>
        ))
      )}
      <p className="text-[11px] text-gray-500">Streaming data by JustWatch</p>
    </section>
  );
}

const PlayerModal = () => {
  const dispatch = useDispatch();
  const { isOpen, mode, movie, videoKey, providers, queue, queueIndex } = useSelector((s) => s.player);
  const region = useSelector((s) => s.Config?.region) || "IN";
  const [noTrailerFor, setNoTrailerFor] = useState(null); // movie id whose trailer lookup found nothing

  // Items opened from a card or a watchlist arrive without a trailer key — resolve it here.
  useEffect(() => {
    if (!isOpen || !movie || videoKey) return;
    let cancelled = false;
    fetchTrailerKey(movie.id).then((key) => {
      if (cancelled) return;
      if (key) dispatch(setPlayerVideo(key));
      else setNoTrailerFor(movie.id);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, movie, videoKey, dispatch]);

  // Cards and watchlist items open without availability — fetch it lazily for the user's region.
  useEffect(() => {
    if (!isOpen || !movie || providers) return;
    let cancelled = false;
    fetchWatchProviders(movie.id, region).then((p) => !cancelled && p && dispatch(setPlayerProviders(p)));
    return () => {
      cancelled = true;
    };
  }, [isOpen, movie, providers, region, dispatch]);

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
        className={`relative max-h-full w-full overflow-y-auto bg-gray-950 text-white shadow-2xl ${isPlay ? "h-full sm:h-auto sm:max-w-6xl" : "max-w-3xl rounded-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video w-full bg-black">
          {src ? (
            <iframe className="h-full w-full" src={src} title={`${movie.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <>
              {movie.backdrop_path && <img src={`${IMG_CDN_URL}${movie.backdrop_path}`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-200" role="status">
                {noTrailerFor === movie.id ? (
                  <>
                    <span>Trailer not available for this title.</span>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year || ""} trailer`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
                    >
                      Search on YouTube
                    </a>
                  </>
                ) : (
                  <span>Loading trailer…</span>
                )}
              </div>
            </>
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
          {videoKey && (
            <a href={`https://www.youtube.com/watch?v=${videoKey}`} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-gray-400 underline hover:text-white">
              Video not loading? Open on YouTube
            </a>
          )}
          {!isPlay && <p className="line-clamp-3 text-sm text-gray-300">{movie.overview}</p>}
          <WhereToWatch providers={providers} region={providers?.region || region} />
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
