import React from "react";
import { IMG_CDN_URL } from "../../utils/constant";

/**
 * "Is it this?" list for the tip-of-my-tongue finder. Every candidate was verified against
 * TMDB by the gateway; this component only renders them and reports the user's choice.
 */
const CandidatePicker = ({ candidates, disabled, onPreview, onConfirm, onNone }) => (
  <div className="w-full space-y-2" role="list" aria-label="Possible matches">
    {candidates.map((c) => {
      const pct = Math.round(c.confidence * 100);
      return (
        <div key={c.id} role="listitem" className="flex gap-3 rounded-xl border border-white/10 bg-gray-900/80 p-2">
          {c.poster_path ? (
            <img src={`${IMG_CDN_URL}${c.poster_path}`} alt="" className="h-24 w-16 flex-none rounded-md object-cover" loading="lazy" />
          ) : (
            <div className="h-24 w-16 flex-none rounded-md bg-gray-800" aria-hidden />
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="truncate text-sm font-semibold text-white">{c.title}</h3>
              {c.year && <span className="text-xs text-gray-400">{c.year}</span>}
            </div>
            <div className="flex items-center gap-2" title={`${pct}% confident`}>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Confidence">
                <div className="h-full rounded-full bg-red-600" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-9 text-right text-[11px] text-gray-400">{pct}%</span>
            </div>
            {c.reason && <p className="text-xs leading-snug text-gray-300">{c.reason}</p>}
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                disabled={disabled}
                onClick={() => onPreview(c)}
                className="min-h-10 rounded-lg bg-gray-800 px-3 text-xs font-medium hover:bg-gray-700 disabled:opacity-40"
              >
                ▶ Is it this?
              </button>
              <button
                disabled={disabled}
                onClick={() => onConfirm(c)}
                className="min-h-10 rounded-lg bg-red-600 px-3 text-xs font-medium hover:bg-red-700 disabled:opacity-40"
              >
                Yes, that's it
              </button>
            </div>
          </div>
        </div>
      );
    })}
    <button
      disabled={disabled}
      onClick={onNone}
      className="min-h-10 w-full rounded-lg border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
    >
      None of these
    </button>
  </div>
);

export default CandidatePicker;
