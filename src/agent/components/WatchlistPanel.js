import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IMG_CDN_URL } from "../../utils/constant";
import { openPlayer } from "../../utils/playerSlice";
import { deleteWatchlist, moveWatchlistItem, removeWatchlistItem, setActiveWatchlist } from "../../utils/watchlistSlice";

// Interactive playlist produced by curate_mood_watchlist: play all, play one, reorder, remove.
const WatchlistPanel = () => {
  const dispatch = useDispatch();
  const { lists, activeId } = useSelector((s) => s.watchlists);
  if (!lists.length) return null;
  const active = lists.find((l) => l.id === activeId) || lists[0];

  const play = (index) => dispatch(openPlayer({ movie: active.items[index], mode: "play", queue: active.items, queueIndex: index }));

  return (
    <section id={`watchlist-${active.id}`} className="mx-2 my-6 scroll-mt-24 rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-4 sm:mx-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {lists.map((l) => (
          <button
            key={l.id}
            onClick={() => dispatch(setActiveWatchlist(l.id))}
            className={`rounded-full px-3 py-1 text-xs ${l.id === active.id ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{active.name}</h2>
          <p className="text-sm text-gray-400">{active.mood} · {active.items.length} titles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => play(0)} disabled={!active.items.length} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-40">
            ▶ Play all
          </button>
          <button onClick={() => dispatch(deleteWatchlist(active.id))} className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
            Delete
          </button>
        </div>
      </div>

      <ol className="divide-y divide-white/5">
        {active.items.map((m, i) => (
          <li key={m.id} className="group flex items-center gap-3 py-2">
            <span className="w-5 text-right text-sm text-gray-500">{i + 1}</span>
            <button onClick={() => play(i)} className="shrink-0" aria-label={`Play ${m.title}`}>
              <img src={`${IMG_CDN_URL}${m.poster_path}`} alt="" className="h-16 w-11 rounded object-cover transition group-hover:scale-105" loading="lazy" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{m.title}</p>
              <p className="text-xs text-gray-500">{[m.year, m.rating && `★ ${m.rating}`].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex gap-1 text-gray-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button onClick={() => dispatch(moveWatchlistItem({ listId: active.id, from: i, to: i - 1 }))} className="rounded p-1.5 hover:bg-white/10" aria-label="Move up">↑</button>
              <button onClick={() => dispatch(moveWatchlistItem({ listId: active.id, from: i, to: i + 1 }))} className="rounded p-1.5 hover:bg-white/10" aria-label="Move down">↓</button>
              <button onClick={() => dispatch(removeWatchlistItem({ listId: active.id, movieId: m.id }))} className="rounded p-1.5 hover:bg-white/10" aria-label="Remove">✕</button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default WatchlistPanel;
