import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../../utils/Firebase";
import { IMG_CDN_URL } from "../../utils/constant";
import { openPlayer } from "../../utils/playerSlice";
import { subscribeParty, joinParty, castVote, lockWinner } from "../party/partyService";
import { voteCounts, isExpired } from "../party/partyLogic";
import { fetchWatchProviders } from "../tmdbClient";
import { WhereToWatch } from "./PlayerModal";

const Shell = ({ children }) => (
  <main className="min-h-screen w-full overflow-x-hidden bg-black px-4 py-6 text-white sm:px-8">
    <div className="mx-auto w-full max-w-5xl space-y-5">{children}</div>
  </main>
);

const Notice = ({ title, children }) => (
  <Shell>
    <div className="rounded-xl border border-white/10 bg-gray-900 p-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      {children && <p className="mt-2 text-sm text-gray-400">{children}</p>}
      <Link to="/" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium hover:bg-red-700">
        Go to NETSTREAM
      </Link>
    </div>
  </Shell>
);

const hoursLeft = (party, now) => Math.max(0, Math.ceil((party.expiresAt - now) / 3_600_000));

/**
 * /party/:partyId — live voting room. Guests are signed in anonymously; every write goes
 * through Firestore (see firestore.rules), so the UI only hides what the rules would refuse anyway.
 */
const WatchParty = () => {
  const { partyId } = useParams();
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [party, setParty] = useState(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [winnerProviders, setWinnerProviders] = useState(null);
  const [linkMsg, setLinkMsg] = useState("");

  // Auth: reuse a real session, otherwise sign in as an anonymous guest.
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u) setUser(u);
        else signInAnonymously(auth).catch(() => setAuthError("Couldn't join as a guest. Is Anonymous sign-in enabled?"));
      }),
    []
  );

  // Live party document. Unsubscribes on unmount / party change.
  useEffect(() => {
    if (!user) return undefined;
    setParty(undefined);
    return subscribeParty(
      partyId,
      (p) => {
        setParty(p);
        setLoadError(null);
      },
      () => setLoadError("You don't have access to this party.")
    );
  }, [user, partyId]);

  // Tick so the expiry state flips without a refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const winner = party?.status === "locked" ? party.candidates?.find((c) => c.id === party.winnerId) : null;
  const region = party?.constraints?.region || "IN";
  useEffect(() => {
    if (!winner) return undefined;
    let cancelled = false;
    fetchWatchProviders(winner.id, region).then((p) => !cancelled && p && setWinnerProviders(p));
    return () => {
      cancelled = true;
    };
  }, [winner, region]);

  if (authError) return <Notice title="Can't open the party">{authError}</Notice>;
  if (loadError) return <Notice title="Can't open the party">{loadError}</Notice>;
  if (!user || party === undefined) return <Shell><p className="py-20 text-center text-gray-400">Loading party…</p></Shell>;
  if (party === null) return <Notice title="Party not found">The link may be wrong or the party was removed.</Notice>;

  const uid = user.uid;
  const isHost = uid === party.hostUid;
  const member = party.members?.[uid];
  const locked = party.status === "locked";
  const expired = isExpired(party, now);
  const open = !locked && !expired;
  const myVotes = party.votes?.[uid] || {};
  const inviteUrl = `${window.location.origin}/party/${partyId}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Vote for our movie night "${party.name}": ${inviteUrl}`)}`;

  const run = async (fn) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch {
      setActionError("That didn't go through. The party may have been locked or expired.");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setLinkMsg("Link copied");
      setTimeout(() => setLinkMsg(""), 2000);
    } catch {
      window.open(whatsapp, "_blank", "noopener,noreferrer"); // clipboard blocked: fall back to WhatsApp share
    }
  };

  return (
    <Shell>
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold">{party.name}</h1>
            <p className="text-sm text-gray-400">
              {locked ? "Winner locked" : expired ? "This party has expired" : `Voting open · ${hoursLeft(party, now)}h left`}
              {party.constraints?.maxRuntime ? ` · under ${party.constraints.maxRuntime} min` : ""}
              {party.constraints?.services?.length ? ` · ${party.constraints.services.join(", ")}` : ""}
            </p>
          </div>
          {user && !user.isAnonymous && (
            <Link to="/browse" className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5">
              ‹ Browse
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyLink} className="min-h-10 rounded-lg bg-gray-800 px-4 text-sm font-medium hover:bg-gray-700">
            Copy invite link
          </button>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-green-700 px-4 text-sm font-medium hover:bg-green-600">
            Share on WhatsApp
          </a>
          <span className="text-xs text-green-400" role="status">{linkMsg}</span>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Members">
          {Object.entries(party.members || {}).map(([id, m]) => (
            <li key={id} className="rounded-full bg-gray-800 px-3 py-1 text-xs">
              {m.displayName}
              {id === party.hostUid && <span className="ml-1 text-gray-500">(host)</span>}
            </li>
          ))}
        </ul>
      </header>

      {winner && (
        <section className="space-y-3 rounded-2xl border border-red-700 bg-gradient-to-br from-red-950/60 to-gray-950 p-4" aria-label="Winner">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-300">🏆 Tonight's pick</p>
          <div className="flex gap-4">
            {winner.poster_path && <img src={`${IMG_CDN_URL}${winner.poster_path}`} alt="" className="h-36 w-24 flex-none rounded-lg object-cover" />}
            <div className="min-w-0 space-y-2">
              <h2 className="text-xl font-bold">{winner.title}</h2>
              <p className="text-sm text-gray-400">{[winner.year, winner.rating && `★ ${winner.rating}`].filter(Boolean).join(" · ")}</p>
              <button
                onClick={() => dispatch(openPlayer({ movie: winner, mode: "play" }))}
                className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold hover:bg-red-700"
              >
                ▶ Play trailer
              </button>
            </div>
          </div>
          <WhereToWatch providers={winnerProviders} region={region} />
        </section>
      )}

      {!member && open && (
        <form
          className="space-y-3 rounded-xl border border-white/10 bg-gray-900 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) run(() => joinParty(partyId, uid, name));
          }}
        >
          <label htmlFor="party-name" className="block text-sm font-medium">Your name</label>
          <div className="flex gap-2">
            <input
              id="party-name"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riya"
              className="min-h-10 min-w-0 flex-1 rounded-lg bg-gray-800 px-3 text-base text-white outline-none ring-1 ring-white/10 focus:ring-red-600"
            />
            <button disabled={!name.trim() || busy} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
              Join &amp; vote
            </button>
          </div>
        </form>
      )}

      {actionError && <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200" role="alert">{actionError}</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Candidates">
        {(party.candidates || []).map((c) => {
          const { up, down, net } = voteCounts(party.votes, c.id);
          const mine = myVotes[c.id];
          const canVote = open && Boolean(member) && !busy;
          return (
            <article key={c.id} className="flex gap-3 rounded-xl border border-white/10 bg-gray-900 p-3">
              {c.poster_path ? (
                <img src={`${IMG_CDN_URL}${c.poster_path}`} alt="" className="h-32 w-[85px] flex-none rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="h-32 w-[85px] flex-none rounded-lg bg-gray-800" aria-hidden />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  <span className="text-xs text-gray-400">{[c.year, c.rating && `★ ${c.rating}`].filter(Boolean).join(" · ")}</span>
                </div>
                <p className="text-xs leading-snug text-gray-400">{c.whyEveryone}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <button
                    disabled={!canVote}
                    aria-pressed={mine === 1}
                    aria-label={`Vote yes for ${c.title}`}
                    onClick={() => run(() => castVote(partyId, uid, c.id, mine === 1 ? 0 : 1))}
                    className={`min-h-10 min-w-10 rounded-lg px-3 text-sm disabled:opacity-40 ${mine === 1 ? "bg-green-600" : "bg-gray-800 hover:bg-gray-700"}`}
                  >
                    👍 {up}
                  </button>
                  <button
                    disabled={!canVote}
                    aria-pressed={mine === -1}
                    aria-label={`Vote no for ${c.title}`}
                    onClick={() => run(() => castVote(partyId, uid, c.id, mine === -1 ? 0 : -1))}
                    className={`min-h-10 min-w-10 rounded-lg px-3 text-sm disabled:opacity-40 ${mine === -1 ? "bg-red-700" : "bg-gray-800 hover:bg-gray-700"}`}
                  >
                    👎 {down}
                  </button>
                  <span className="text-xs text-gray-400" aria-label={`Net score ${net}`}>net {net > 0 ? `+${net}` : net}</span>
                  <button
                    onClick={() => dispatch(openPlayer({ movie: c, mode: "preview" }))}
                    className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-gray-200 hover:bg-white/5"
                  >
                    ▶ Trailer
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {isHost && open && (
        <div className="sticky bottom-3 flex justify-center">
          <button
            disabled={busy}
            onClick={() => run(() => lockWinner({ ...party, id: partyId }))}
            className="min-h-10 rounded-full bg-red-600 px-6 text-sm font-semibold shadow-xl hover:bg-red-700 disabled:opacity-40"
          >
            Lock winner
          </button>
        </div>
      )}
    </Shell>
  );
};

export default WatchParty;
