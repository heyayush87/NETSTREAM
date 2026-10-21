// A compact snapshot of what the user is looking at, sent with each turn so the model can
// resolve "play the second one" or "add something like that" without an extra round trip.
// Only ids + titles: the gateway treats it as untrusted data and caps its size.

const brief = (movies = [], n = 8) => (movies || []).slice(0, n).map((m) => `${m.id}|${m.title || m.original_title}`);

export function selectUiContext(state) {
  const { movies, Gpt, player, watchlists } = state;
  const rows = [
    ...movies.agentRows.map((r) => ({ title: r.title, movies: brief(r.movies) })),
    { title: "Now Playing", movies: brief(movies.nowPlayingMovies, 5) },
    { title: "Trending", movies: brief(movies.TrendingMovies, 5) },
  ];
  return {
    route: window.location.pathname,
    view: Gpt.showgptsearch ? "ai_search" : "home",
    player: player.isOpen && player.movie ? `${player.movie.id}|${player.movie.title}` : null,
    rows,
    watchlists: watchlists.lists.map((l) => `${l.name} (${l.items.length})`),
  };
}
