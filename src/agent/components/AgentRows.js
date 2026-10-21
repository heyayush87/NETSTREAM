import React from "react";
import { useDispatch, useSelector } from "react-redux";
import MovieList from "../../component/MovieList";
import { removeAgentRow } from "../../utils/movieSlice";

// Rows the agent created via filter_and_display_movies. Rendered above the stock rows
// in SecondaryContainer, reusing the existing MovieList/MovieCard components.
const AgentRows = () => {
  const dispatch = useDispatch();
  const rows = useSelector((s) => s.movies.agentRows);
  if (!rows.length) return null;

  return (
    <section aria-label="Picked by your assistant">
      {rows.map((row) => (
        <div key={row.rowId} id={`agent-row-${row.rowId}`} className="relative scroll-mt-24">
          <div className="flex items-center gap-2 px-2 sm:px-6">
            <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">AI pick</span>
            {row.subtitle && <span className="truncate text-xs text-gray-400">{row.subtitle}</span>}
            <button
              onClick={() => dispatch(removeAgentRow(row.rowId))}
              className="ml-auto text-xs text-gray-500 hover:text-white"
              aria-label={`Remove row ${row.title}`}
            >
              Dismiss
            </button>
          </div>
          <MovieList title={row.title} movies={row.movies} />
        </div>
      ))}
    </section>
  );
};

export default AgentRows;
