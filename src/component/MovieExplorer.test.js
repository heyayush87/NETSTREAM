import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import player from "../utils/playerSlice";
import MovieExplorer from "./MovieExplorer";
import { buildDiscoverParams } from "../utils/tmdbApi";

const movie = (id, title) => ({ id, title, poster_path: `/${id}.jpg`, release_date: "2020-01-01", vote_average: 7, overview: "o" });

// Fake TMDB proxy: records each discover query and replies with pages from `pages`.
let queries;
function fakeTmdb(pages) {
  queries = [];
  global.fetch = jest.fn((url) => {
    const inner = new URL(decodeURIComponent(String(url).split("?url=")[1]));
    queries.push(Object.fromEntries(inner.searchParams));
    const page = Number(inner.searchParams.get("page") || 1);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: pages[page - 1] || [], total_pages: pages.length }) });
  });
}

function mount() {
  const store = configureStore({ reducer: { player } });
  render(<Provider store={store}><MovieExplorer /></Provider>);
  return store;
}

test("buildDiscoverParams maps each filter and keeps unreleased films out", () => {
  const p = buildDiscoverParams({ genre: "35", year: "2019", language: "hi", sort: "top_rated", page: 2 });
  expect(p).toMatchObject({ with_genres: "35", primary_release_year: "2019", with_original_language: "hi", sort_by: "vote_average.desc", page: 2 });
  expect(p["vote_count.gte"]).toBe(500);
  expect(p["primary_release_date.lte"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(buildDiscoverParams().sort_by).toBe("popularity.desc");
  expect(buildDiscoverParams({ sort: "newest" }).sort_by).toBe("primary_release_date.desc");
});

test("shows popular movies first, and clicking a poster plays its trailer", async () => {
  fakeTmdb([[movie(1, "Alpha"), movie(2, "Beta")]]);
  const store = mount();
  const poster = await screen.findByLabelText("Play trailer for Alpha");
  expect(screen.getByText("Most popular movies")).toBeTruthy();
  expect(queries[0]).toMatchObject({ sort_by: "popularity.desc", page: "1" });
  fireEvent.click(poster);
  expect(store.getState().player).toMatchObject({ isOpen: true, mode: "play" });
  expect(store.getState().player.movie.id).toBe(1);
});

test("choosing genre, year, language and sort re-queries TMDB with those filters", async () => {
  fakeTmdb([[movie(1, "Alpha")]]);
  mount();
  await screen.findByLabelText("Play trailer for Alpha");
  fireEvent.change(screen.getByLabelText("Genre"), { target: { value: "878" } });
  fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2014" } });
  fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
  fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "top_rated" } });
  await waitFor(() => expect(queries.at(-1)).toMatchObject({ with_genres: "878", primary_release_year: "2014", with_original_language: "en", sort_by: "vote_average.desc" }));
  expect(await screen.findByText("Top rated (filtered)")).toBeTruthy();
  fireEvent.click(screen.getByText("Clear filters"));
  await waitFor(() => expect(queries.at(-1).with_genres).toBeUndefined());
});

test("Load more appends the next page without duplicates", async () => {
  fakeTmdb([[movie(1, "Alpha")], [movie(1, "Alpha"), movie(2, "Beta")]]);
  mount();
  await screen.findByLabelText("Play trailer for Alpha");
  fireEvent.click(screen.getByText("Load more"));
  await screen.findByLabelText("Play trailer for Beta");
  expect(screen.getAllByLabelText("Play trailer for Alpha")).toHaveLength(1);
  expect(screen.queryByText("Load more")).toBeNull();
});

test("an empty result says so, and a failed request offers Retry", async () => {
  fakeTmdb([[]]);
  mount();
  expect(await screen.findByText("No movies match these filters.")).toBeTruthy();
});

test("a network failure shows an error with Retry", async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error("offline")));
  mount();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("Retry")).toBeTruthy();
});
