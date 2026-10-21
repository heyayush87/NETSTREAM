// Tool contract
// ─────────────
// Every tool has two halves:
//   • server `execute(args, ctx)` – runs here, talks to TMDB with secret creds, returns
//       { result }    → compact JSON fed back to the model for its next step
//       { directive } → a whitelisted UI instruction streamed to the browser
//   • client handler (src/agent/toolHandlers.js) – validates the directive and dispatches
//     Redux actions / navigation. The model never touches the DOM or the store directly.

import { GENRE_NAMES, genreIds, toCard, forModel } from "./tmdb.js";

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
];

// Intensity proxy for ordering: horror/thriller/action/war push up, family/animation/comedy/romance pull down.
const INTENSITY = { horror: 3, thriller: 2, war: 2, action: 1.5, crime: 1, mystery: 1, family: -2, animation: -1.5, comedy: -1, romance: -1, music: -1 };
const intensity = (c) => c.genres.reduce((s, g) => s + (INTENSITY[g] || 0), 0);

const dedupe = (cards) => [...new Map(cards.map((c) => [c.id, c])).values()];

const EXECUTORS = {
  async filter_and_display_movies(a, { tmdb }) {
    let raw;
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
      });
      raw = data.results || [];
    }

    const cards = raw.filter((m) => m.poster_path).slice(0, a.limit || 20).map(toCard);
    if (!cards.length) return { result: { shown: 0, note: "No matches. Suggest relaxing a filter." } };

    return {
      result: { shown: cards.length, row_title: a.row_title, movies: forModel(cards.slice(0, 10)) },
      directive: {
        type: "SHOW_MOVIE_ROW",
        payload: { rowId: crypto.randomUUID(), title: a.row_title, subtitle: a.intent_summary, placement: a.placement || "top", movies: cards },
      },
    };
  },

  async play_or_preview_title(a, { tmdb }) {
    let id = a.movie_id;
    if (!id && a.title_query) {
      const hits = await tmdb.searchMovie(a.title_query);
      const hit = (a.release_year && hits.find((m) => m.release_date?.startsWith(String(a.release_year)))) || hits[0];
      id = hit?.id;
    }
    if (!id) return { result: { ok: false, error: "Title not found on TMDB." } };

    const [details, videos] = await Promise.all([tmdb.details(id), tmdb.videos(id)]);
    const yt = videos.filter((v) => v.site === "YouTube");
    const video =
      yt.find((v) => v.type === "Trailer" && v.official) || yt.find((v) => v.type === "Trailer") || yt.find((v) => v.type === "Teaser") || yt[0];

    const card = { ...toCard(details), genres: (details.genres || []).map((g) => g.name), runtime: details.runtime };
    return {
      result: { ok: true, opened: `${card.title} (${card.year})`, mode: a.mode, has_video: Boolean(video) },
      directive: { type: "OPEN_PLAYER", payload: { mode: a.mode, movie: card, videoKey: video?.key || null } },
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
