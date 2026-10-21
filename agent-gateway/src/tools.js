// Tool contract
// ─────────────
// Every tool has two halves:
//   • server `execute(args, ctx)` – runs here, talks to TMDB with secret creds, returns
//       { result }    → compact JSON fed back to the model for its next step
//       { directive } → a whitelisted UI instruction streamed to the browser
//   • client handler (src/agent/toolHandlers.js) – validates the directive and dispatches
//     Redux actions / navigation. The model never touches the DOM or the store directly.

import { GENRE_NAMES, genreIds, toCard, forModel, matchProviders } from "./tmdb.js";

const genreEnum = { type: "string", enum: GENRE_NAMES };

export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "filter_and_display_movies",
      description:
        "Translate the user's semantic intent (mood, vibe, era, comparisons, constraints) into TMDB discover/search " +
        "parameters and display the results as a new row on the Browse screen. Use for any 'show me…/find…/I want…' request.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["row_title", "intent_summary"],
        properties: {
          row_title: { type: "string", description: "Short, catchy row heading, e.g. 'Cozy 90s Rom-Coms'.", maxLength: 60 },
          intent_summary: { type: "string", description: "One sentence restating what the user wants.", maxLength: 200 },
          with_genres: { type: "array", items: genreEnum, maxItems: 3, description: "Genres that must ALL match." },
          without_genres: { type: "array", items: genreEnum, maxItems: 5 },
          keywords: {
            type: "array", items: { type: "string" }, maxItems: 4,
            description: "Thematic TMDB keywords, e.g. ['time travel','heist']. Resolved to keyword ids server-side.",
          },
          similar_to_title: { type: "string", description: "Seed title for 'movies like X'. Uses TMDB recommendations." },
          title_query: { type: "string", description: "Plain title search when the user names a specific movie." },
          release_year_gte: { type: "integer", minimum: 1900, maximum: 2100 },
          release_year_lte: { type: "integer", minimum: 1900, maximum: 2100 },
          min_rating: { type: "number", minimum: 0, maximum: 10, description: "TMDB vote_average floor. 7+ for 'acclaimed'." },
          max_runtime_minutes: { type: "integer", minimum: 30, maximum: 300 },
          original_language: { type: "string", pattern: "^[a-z]{2}$", description: "ISO 639-1, e.g. 'hi', 'ko', 'es'." },
          sort_by: {
            type: "string",
            enum: ["popularity.desc", "vote_average.desc", "primary_release_date.desc", "revenue.desc"],
            default: "popularity.desc",
          },
          streaming_on: {
            type: "array", items: { type: "string" }, maxItems: 5,
            description: "Streaming services the movies must be on (subscription), free text e.g. ['Netflix','Prime Video','JioHotstar']. Matched server-side. Applies to discover-style requests, not title_query/similar_to_title.",
          },
          region: { type: "string", pattern: "^[A-Z]{2}$", description: "ISO 3166-1 country for streaming_on. Omit to use the user's region." },
          placement: { type: "string", enum: ["top", "replace_all"], default: "top", description: "Insert as first row, or clear previous agent rows." },
          limit: { type: "integer", minimum: 5, maximum: 20, default: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "play_or_preview_title",
      description:
        "Open the player modal for a specific movie. Prefer movie_id from earlier tool results; otherwise give title_query. " +
        "'preview' shows a muted inline trailer with details, 'play' opens full-screen with sound.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["mode"],
        properties: {
          movie_id: { type: "integer", description: "TMDB movie id." },
          title_query: { type: "string", description: "Used only if movie_id is unknown." },
          release_year: { type: "integer", description: "Disambiguates title_query (e.g. Dune 1984 vs 2021)." },
          mode: { type: "string", enum: ["play", "preview"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "curate_mood_watchlist",
      description:
        "Build an ordered, interactive watchlist (playlist) for a mood, occasion or context, e.g. 'rainy Sunday', " +
        "'date night but not cheesy', 'horror marathon that escalates'. The user can reorder, remove and play items.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["name", "mood", "size"],
        properties: {
          name: { type: "string", maxLength: 50 },
          mood: { type: "string", description: "The emotional target, in the user's words.", maxLength: 120 },
          seed_titles: { type: "array", items: { type: "string" }, maxItems: 3, description: "Titles that capture the vibe." },
          with_genres: { type: "array", items: genreEnum, maxItems: 3, description: "Any of these genres (OR)." },
          avoid_genres: { type: "array", items: genreEnum, maxItems: 5 },
          max_runtime_minutes: { type: "integer", minimum: 60, maximum: 240 },
          size: { type: "integer", minimum: 3, maximum: 15 },
          ordering: {
            type: "string",
            enum: ["best_first", "escalating", "wind_down", "chronological"],
            default: "best_first",
            description: "escalating = least→most intense; wind_down = the reverse; chronological = by release year.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_where_to_watch",
      description:
        "Tell the user which services stream, rent or sell a movie in their region. Use for 'where can I watch X', 'is X on Netflix'.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          movie_id: { type: "integer", description: "TMDB movie id from earlier tool results or the UI context." },
          title_query: { type: "string", description: "Used only if movie_id is unknown." },
          release_year: { type: "integer", description: "Disambiguates title_query." },
          region: { type: "string", pattern: "^[A-Z]{2}$", description: "ISO 3166-1 country. Omit to use the user's region." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "identify_movie_from_description",
      description:
        "Identify a movie the user only vaguely remembers (plot fragments, a scene, an actor, roughly when). " +
        "Propose up to 5 candidate titles you believe match, each with a short reason. The server verifies them against TMDB.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["description", "candidates"],
        properties: {
          description: { type: "string", maxLength: 500 },
          remembered: {
            type: "object",
            additionalProperties: false,
            properties: {
              approx_year_from: { type: "integer" },
              approx_year_to: { type: "integer" },
              language: { type: "string", pattern: "^[a-z]{2}$" },
              actors: { type: "array", items: { type: "string" }, maxItems: 3 },
            },
          },
          candidates: {
            type: "array",
            minItems: 1,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "reason", "confidence"],
              properties: {
                title: { type: "string" },
                year: { type: "integer" },
                reason: { type: "string", maxLength: 160, description: "Which remembered detail matches. No spoilers beyond what the user said." },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_watch_party",
      description:
        "Find movies a whole group will enjoy. Use when the user mentions friends, family, a date, roommates, or 'we'. " +
        "Collect each person's likes and hard no's from the conversation; ask at most one question if a member has nothing.",
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["name", "members"],
        properties: {
          name: { type: "string", maxLength: 50 },
          members: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name"],
              properties: {
                name: { type: "string", maxLength: 30 },
                likes_genres: { type: "array", items: genreEnum, maxItems: 5 },
                hard_no_genres: { type: "array", items: genreEnum, maxItems: 5 },
                loved_titles: { type: "array", items: { type: "string" }, maxItems: 3 },
              },
            },
          },
          max_runtime_minutes: { type: "integer", minimum: 60, maximum: 240 },
          services: { type: "array", items: { type: "string" }, maxItems: 5, description: "Streaming services the group has (free text, matched like streaming_on)." },
          region: { type: "string", pattern: "^[A-Z]{2}$", description: "ISO 3166-1 country. Omit to use the user's region." },
        },
      },
    },
  },
];

// Intensity proxy for ordering: horror/thriller/action/war push up, family/animation/comedy/romance pull down.
const INTENSITY = { horror: 3, thriller: 2, war: 2, action: 1.5, crime: 1, mystery: 1, family: -2, animation: -1.5, comedy: -1, romance: -1, music: -1 };
const intensity = (c) => c.genres.reduce((s, g) => s + (INTENSITY[g] || 0), 0);

// Verification helpers for identify_movie_from_description. TMDB search is fuzzy and returns
// *something* for almost any string, so a hit only counts if its title actually matches.
const normTitle = (s) => String(s || "").toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]/g, "");
const titleMatches = (want, hit) => {
  const w = normTitle(want);
  if (!w) return false;
  return [hit.title, hit.original_title].some((t) => {
    const h = normTitle(t);
    return h === w || (Math.min(h.length, w.length) >= 5 && (h.includes(w) || w.includes(h)));
  });
};
const hitYear = (m) => Number((m.release_date || "").slice(0, 4)) || null;

// ── Watch party scoring ──────────────────────────────────────────────────────
export const PARTY_MAX_CANDIDATES = 8;
const PARTY_VERIFY_CAP = 12; // recommendation-sourced movies need a details/providers lookup to honour constraints
const prettyGenre = (g) => g.replace(/_/g, " ");

/**
 * Least-misery ranking. Each member scores a movie 1 (hits a liked genre or comes from their
 * loved-title recommendations), 0 (they stated likes and it has none) or 0.5 (they stated no
 * likes at all, so they're neutral). Rank by the WORST member first so nobody gets stuck with
 * something they dislike, then by the mean + a small rating bonus.
 */
export function scoreForParty(movies, members, seedFor = new Map()) {
  return movies
    .map((m) => {
      const per = members.map((mem, i) => {
        const likes = mem.likes_genres || [];
        const hasTaste = likes.length > 0 || (mem.loved_titles || []).length > 0;
        const genreHit = likes.find((g) => m.genres.includes(g));
        const seed = seedFor.get(m.id)?.get(i);
        if (genreHit) return { score: 1, why: `${mem.name}: ${prettyGenre(genreHit)} ✓` };
        if (seed) return { score: 1, why: `${mem.name}: from '${seed}' recs` };
        if (!hasTaste) return { score: 0.5, why: `${mem.name}: open to anything` };
        return { score: 0, why: `${mem.name}: not their usual pick` };
      });
      const min = Math.min(...per.map((p) => p.score));
      const mean = per.reduce((s, p) => s + p.score, 0) / per.length;
      const fitScore = Math.round((mean + 0.1 * ((m.rating || 6) - 6)) * 100) / 100;
      return { ...m, fitScore, minScore: min, whyEveryone: per.map((p) => p.why).join(" · ") };
    })
    .sort((a, b) => b.minScore - a.minScore || b.fitScore - a.fitScore);
}

const REGION_RE = /^[A-Z]{2}$/;
const regionOf = (a, ctx) => (REGION_RE.test(a.region) ? a.region : REGION_RE.test(ctx.region) ? ctx.region : "IN");
const names = (list = []) => list.map((p) => p.name);

const dedupe = (cards) => [...new Map(cards.map((c) => [c.id, c])).values()];

const EXECUTORS = {
  async filter_and_display_movies(a, ctx) {
    const { tmdb } = ctx;
    let raw;
    let unmatched = [];
    let providerFilter = {};
    if (a.streaming_on?.length && !a.title_query && !a.similar_to_title) {
      const region = regionOf(a, ctx);
      const match = matchProviders(a.streaming_on, await tmdb.providerCatalog(region));
      unmatched = match.unmatched;
      if (!match.ids.length) {
        // Honest empty state: tell the model which services are unknown instead of showing an unfiltered row.
        return { result: { shown: 0, region, unmatched_services: unmatched, note: "None of those services were found in this region's catalog. Tell the user." } };
      }
      providerFilter = {
        with_watch_providers: match.ids.join("|"), // pipe = OR
        watch_region: region,
        with_watch_monetization_types: "flatrate",
      };
    }

    if (a.title_query) {
      raw = await tmdb.searchMovie(a.title_query);
    } else if (a.similar_to_title) {
      const seed = (await tmdb.searchMovie(a.similar_to_title))[0];
      raw = seed ? await tmdb.recommendations(seed.id) : [];
    } else {
      const keywordIds = await tmdb.searchKeywordIds(a.keywords);
      const sort = a.sort_by || "popularity.desc";
      const data = await tmdb.discover({
        with_genres: genreIds(a.with_genres).join(","), // comma = AND
        without_genres: genreIds(a.without_genres).join(","),
        with_keywords: keywordIds.join("|"), // pipe = OR
        "primary_release_date.gte": a.release_year_gte ? `${a.release_year_gte}-01-01` : undefined,
        "primary_release_date.lte": a.release_year_lte ? `${a.release_year_lte}-12-31` : undefined,
        "vote_average.gte": a.min_rating,
        // rating sorts are meaningless without a vote floor
        "vote_count.gte": sort === "vote_average.desc" || a.min_rating ? 300 : 50,
        "with_runtime.lte": a.max_runtime_minutes,
        with_original_language: a.original_language,
        sort_by: sort,
        ...providerFilter,
      });
      raw = data.results || [];
    }

    const cards = raw.filter((m) => m.poster_path).slice(0, a.limit || 20).map(toCard);
    if (!cards.length) return { result: { shown: 0, ...(unmatched.length && { unmatched_services: unmatched }), note: "No matches. Suggest relaxing a filter." } };

    return {
      result: {
        shown: cards.length, row_title: a.row_title, movies: forModel(cards.slice(0, 10)),
        ...(unmatched.length && { unmatched_services: unmatched }),
        ...(a.streaming_on?.length && (a.title_query || a.similar_to_title) && { note: "streaming_on was ignored for title/similar searches; use check_where_to_watch." }),
      },
      directive: {
        type: "SHOW_MOVIE_ROW",
        payload: { rowId: crypto.randomUUID(), title: a.row_title, subtitle: a.intent_summary, placement: a.placement || "top", movies: cards },
      },
    };
  },

  async play_or_preview_title(a, ctx) {
    const { tmdb } = ctx;
    let id = a.movie_id;
    if (!id && a.title_query) {
      const hits = await tmdb.searchMovie(a.title_query);
      const hit = (a.release_year && hits.find((m) => m.release_date?.startsWith(String(a.release_year)))) || hits[0];
      id = hit?.id;
    }
    if (!id) return { result: { ok: false, error: "Title not found on TMDB." } };

    const region = regionOf(a, ctx);
    const [details, videos, providers] = await Promise.all([
      tmdb.details(id),
      tmdb.videos(id),
      tmdb.watchProviders(id, region).catch(() => null), // availability is a bonus; never block playback
    ]);
    const yt = videos.filter((v) => v.site === "YouTube");
    const video =
      yt.find((v) => v.type === "Trailer" && v.official) || yt.find((v) => v.type === "Trailer") || yt.find((v) => v.type === "Teaser") || yt[0];

    const card = { ...toCard(details), genres: (details.genres || []).map((g) => g.name), runtime: details.runtime };
    return {
      result: { ok: true, opened: `${card.title} (${card.year})`, mode: a.mode, has_video: Boolean(video) },
      directive: {
        type: "OPEN_PLAYER",
        payload: { mode: a.mode, movie: card, videoKey: video?.key || null, providers: providers && { ...providers, region } },
      },
    };
  },

  async identify_movie_from_description(a, { tmdb }) {
    const proposed = (a.candidates || []).slice(0, 5);
    const rem = a.remembered || {};

    // 1) Verify every proposal against TMDB. Unverified titles are dropped, never shown.
    const verified = (
      await Promise.all(
        proposed.map(async (c) => {
          const hits = (await tmdb.searchMovie(c.title).catch(() => [])).filter((m) => m.poster_path && titleMatches(c.title, m));
          const near = c.year && hits.find((m) => Math.abs((hitYear(m) || 0) - c.year) <= 1);
          const hit = near || hits[0];
          if (!hit) return null;
          return {
            ...toCard(hit),
            reason: String(c.reason || "").slice(0, 160),
            confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0)),
          };
        })
      )
    ).filter(Boolean);

    // Two proposals can resolve to the same film; keep the more confident one.
    const byId = new Map();
    for (const v of verified) if (!byId.has(v.id) || byId.get(v.id).confidence < v.confidence) byId.set(v.id, v);
    let cands = [...byId.values()];
    if (!cands.length) return { result: { found: 0 } };

    // 2) Year-range penalty.
    const { approx_year_from: from, approx_year_to: to } = rem;
    if (from || to) {
      cands = cands.map((c) => {
        const y = Number(c.year);
        const outside = y && ((from && y < from) || (to && y > to));
        return outside ? { ...c, confidence: c.confidence - 0.2 } : c;
      });
    }

    // 3) Actor boost: only when the named actor is really in the candidate's cast.
    for (const name of (rem.actors || []).slice(0, 3)) {
      const personId = await tmdb.searchPersonId(name).catch(() => null);
      const castIds = personId ? await tmdb.castMovieIds(personId).catch(() => null) : null;
      if (castIds) cands = cands.map((c) => (castIds.has(c.id) ? { ...c, confidence: c.confidence + 0.15 } : c));
    }

    cands = cands
      .map((c) => ({ ...c, confidence: Math.round(Math.min(1, Math.max(0, c.confidence)) * 100) / 100 }))
      .sort((x, y) => y.confidence - x.confidence);

    return {
      result: cands.map((c) => `${c.id}|${c.title} (${c.year ?? "?"}) conf=${c.confidence}`),
      directive: { type: "SHOW_CANDIDATES", payload: { query: String(a.description || "").slice(0, 500), candidates: cands } },
    };
  },

  async create_watch_party(a, ctx) {
    const { tmdb } = ctx;
    const members = (a.members || []).slice(0, 6);
    if (members.length < 2) return { result: { ok: false, note: "A watch party needs at least 2 people." } };
    const region = regionOf(a, ctx);

    // Hard no's are vetoes from anyone in the group.
    const excluded = [...new Set(members.flatMap((m) => m.hard_no_genres || []))];
    const likes = [...new Set(members.flatMap((m) => m.likes_genres || []))].filter((g) => !excluded.includes(g));

    let providerFilter = {};
    let providerIds = null;
    let unmatched = [];
    if (a.services?.length) {
      const match = matchProviders(a.services, await tmdb.providerCatalog(region));
      unmatched = match.unmatched;
      if (!match.ids.length) {
        return { result: { ok: false, region, unmatched_services: unmatched, note: "None of those services were found in this region's catalog. Tell the user." } };
      }
      providerIds = new Set(match.ids);
      providerFilter = { with_watch_providers: match.ids.join("|"), watch_region: region, with_watch_monetization_types: "flatrate" };
    }

    // Pool 1: discover on the union of likes. Already honours runtime/providers/vetoes.
    const discovered = (
      await tmdb.discover({
        with_genres: genreIds(likes).join("|"), // pipe = OR
        without_genres: genreIds(excluded).join(","),
        "with_runtime.lte": a.max_runtime_minutes,
        "vote_count.gte": 300,
        sort_by: "popularity.desc",
        ...providerFilter,
      })
    ).results || [];

    // Pool 2: recommendations seeded by each member's loved titles. Remember who each came from.
    const seedFor = new Map(); // movieId -> Map(memberIndex -> seed title)
    const recPool = [];
    await Promise.all(
      members.flatMap((mem, i) =>
        (mem.loved_titles || []).map(async (title) => {
          const seed = (await tmdb.searchMovie(title).catch(() => []))[0];
          const recs = seed ? await tmdb.recommendations(seed.id).catch(() => []) : [];
          for (const r of recs) {
            if (!seedFor.has(r.id)) seedFor.set(r.id, new Map());
            seedFor.get(r.id).set(i, seed.title);
            recPool.push(r);
          }
        })
      )
    );

    const discoveredIds = new Set(discovered.map((m) => m.id));
    const ok = (c) => c.poster_path && !c.genres.some((g) => excluded.includes(g));
    const byId = new Map();
    for (const m of discovered.map(toCard).filter(ok)) byId.set(m.id, m);

    // Recommendation-sourced movies weren't filtered by discover, so verify constraints explicitly.
    const needsCheck = a.max_runtime_minutes || providerIds;
    const recCards = [...new Map(recPool.map((r) => [r.id, toCard(r)])).values()]
      .filter((c) => ok(c) && !discoveredIds.has(c.id))
      .sort((x, y) => (y.rating || 0) - (x.rating || 0))
      .slice(0, PARTY_VERIFY_CAP);
    const checked = await Promise.all(
      recCards.map(async (c) => {
        if (!needsCheck) return c;
        try {
          const [details, prov] = await Promise.all([
            a.max_runtime_minutes ? tmdb.details(c.id) : null,
            providerIds ? tmdb.watchProviders(c.id, region) : null,
          ]);
          if (details && (!details.runtime || details.runtime > a.max_runtime_minutes)) return null;
          if (prov && !prov.flatrate.some((p) => providerIds.has(p.id))) return null;
          return c;
        } catch {
          return null; // can't verify -> don't risk breaking the group's constraints
        }
      })
    );
    for (const c of checked.filter(Boolean)) byId.set(c.id, c);

    const ranked = scoreForParty([...byId.values()], members, seedFor).slice(0, PARTY_MAX_CANDIDATES);
    if (!ranked.length) {
      return { result: { ok: false, ...(unmatched.length && { unmatched_services: unmatched }), note: "No movie satisfies everyone's vetoes and constraints. Suggest relaxing runtime or services." } };
    }

    const candidates = ranked.map(({ minScore, ...c }) => c);
    return {
      result: {
        ok: true,
        name: a.name,
        vetoed_genres: excluded,
        ...(unmatched.length && { unmatched_services: unmatched }),
        top: ranked.slice(0, 5).map((c) => `${c.id}|${c.title} (${c.year ?? "?"}) ★${c.rating ?? "-"} fit=${c.fitScore} worst=${c.minScore}`),
      },
      directive: {
        type: "CREATE_WATCH_PARTY_DRAFT",
        payload: {
          name: String(a.name || "Movie night").slice(0, 50),
          members: members.map((m) => ({ name: String(m.name).slice(0, 30) })),
          constraints: { maxRuntime: a.max_runtime_minutes || null, region, services: a.services || [] },
          candidates,
        },
      },
    };
  },

  async check_where_to_watch(a, ctx) {
    const { tmdb } = ctx;
    let id = a.movie_id;
    if (!id && a.title_query) {
      const hits = await tmdb.searchMovie(a.title_query);
      const hit = (a.release_year && hits.find((m) => m.release_date?.startsWith(String(a.release_year)))) || hits[0];
      id = hit?.id;
    }
    if (!id) return { result: { ok: false, error: "Title not found on TMDB." } };

    const region = regionOf(a, ctx);
    const [details, providers] = await Promise.all([tmdb.details(id), tmdb.watchProviders(id, region)]);
    const card = { ...toCard(details), genres: (details.genres || []).map((g) => g.name), runtime: details.runtime };
    const { link, flatrate, rent, buy } = providers;
    return {
      result: { ok: true, title: card.title, region, stream: names(flatrate), rent: names(rent), buy: names(buy) },
      directive: { type: "SHOW_WATCH_PROVIDERS", payload: { movie: card, region, providers: { flatrate, rent, buy }, link } },
    };
  },

  async curate_mood_watchlist(a, { tmdb }) {
    const pools = [];
    // 1) Recommendations from seed titles capture "vibe" better than genre filters.
    for (const t of a.seed_titles || []) {
      const seed = (await tmdb.searchMovie(t))[0];
      if (seed) pools.push(toCard(seed), ...(await tmdb.recommendations(seed.id)).map(toCard));
    }
    // 2) Genre discovery fills the remainder.
    if (pools.length < a.size * 2) {
      const data = await tmdb.discover({
        with_genres: genreIds(a.with_genres).join("|"), // pipe = OR
        without_genres: genreIds(a.avoid_genres).join(","),
        "with_runtime.lte": a.max_runtime_minutes,
        "vote_count.gte": 200,
        "vote_average.gte": 6.5,
        sort_by: "vote_average.desc",
      });
      pools.push(...(data.results || []).map(toCard));
    }

    const avoid = new Set(a.avoid_genres || []);
    let items = dedupe(pools).filter((c) => c.poster_path && !c.genres.some((g) => avoid.has(g)));
    items = items.sort((x, y) => (y.rating || 0) - (x.rating || 0)).slice(0, a.size);

    if (a.ordering === "escalating") items.sort((x, y) => intensity(x) - intensity(y));
    if (a.ordering === "wind_down") items.sort((x, y) => intensity(y) - intensity(x));
    if (a.ordering === "chronological") items.sort((x, y) => (x.year || 0) - (y.year || 0));

    if (!items.length) return { result: { ok: false, note: "Could not find enough titles. Try other seeds." } };

    return {
      result: { ok: true, name: a.name, count: items.length, items: forModel(items) },
      directive: {
        type: "CREATE_WATCHLIST",
        payload: { id: crypto.randomUUID(), name: a.name, mood: a.mood, ordering: a.ordering || "best_first", items, createdAt: Date.now() },
      },
    };
  },
};

export async function executeTool(name, rawArgs, ctx) {
  const exec = EXECUTORS[name];
  if (!exec) return { result: { error: `Unknown tool ${name}` } };
  let args;
  try {
    args = typeof rawArgs === "string" ? JSON.parse(rawArgs || "{}") : rawArgs || {};
  } catch {
    return { result: { error: "Arguments were not valid JSON. Retry with valid JSON." } };
  }
  try {
    return await exec(args, ctx);
  } catch (err) {
    // Errors go back to the model so it can recover or explain, rather than killing the stream.
    return { result: { error: String(err.message || err) } };
  }
}
