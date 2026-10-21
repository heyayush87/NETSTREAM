import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Gpt from "../utils/GptSlice";
import Config from "../utils/ConfigSlice";
import player from "../utils/playerSlice";
import GptSearchbarPage from "./GptSearchbarPage";
import GptMovieSuggestion from "./GptMovieSuggestion";
import { GroqApi } from "../utils/GroqApi";

jest.mock("../utils/GroqApi", () => ({ GroqApi: jest.fn() }));

const movie = (id, title) => ({ id, title, poster_path: `/${id}.jpg`, release_date: "2014-11-05", vote_average: 8.4, overview: "o" });
const tmdbReply = (results) => Promise.resolve({ json: () => Promise.resolve({ results }) });

// Fake TMDB proxy: answers by the movie name inside the proxied URL.
const tmdbByName = (table) => (url) => {
  const inner = decodeURIComponent(String(url).split("?url=")[1]);
  const name = decodeURIComponent(/query=([^&]*)/.exec(inner)[1]);
  return tmdbReply(table[name] || []);
};

function mount() {
  const store = configureStore({ reducer: { Gpt, Config, player } });
  render(
    <Provider store={store}>
      <GptSearchbarPage />
      <GptMovieSuggestion />
    </Provider>
  );
  return store;
}
const search = (text) => {
  fireEvent.change(screen.getByLabelText("Movie name"), { target: { value: text } });
  fireEvent.click(screen.getByText("Search"));
};

beforeEach(() => {
  global.fetch = jest.fn();
});

test("shows the searched movie's poster, and clicking it plays the trailer", async () => {
  global.fetch.mockImplementation(tmdbByName({ Interstellar: [movie(157336, "Interstellar")], Gravity: [movie(49047, "Gravity")] }));
  GroqApi.mockResolvedValue("Gravity");
  const store = mount();
  search("Interstellar");

  const poster = await screen.findByLabelText("Play trailer for Interstellar");
  expect(screen.getByText('Results for "Interstellar"')).toBeTruthy();
  await screen.findByLabelText("Preview Gravity"); // AI "similar" row still appears below
  fireEvent.click(poster);
  expect(store.getState().player).toMatchObject({ isOpen: true, mode: "play" });
  expect(store.getState().player.movie).toMatchObject({ id: 157336, title: "Interstellar" });
});

test("the searched movie still shows when the AI suggestions fail", async () => {
  global.fetch.mockImplementation(tmdbByName({ Interstellar: [movie(157336, "Interstellar")] }));
  GroqApi.mockRejectedValue(new Error("Groq down"));
  mount();
  search("Interstellar");
  expect(await screen.findByLabelText("Play trailer for Interstellar")).toBeTruthy();
  expect(await screen.findByText("Couldn't load similar movies right now.")).toBeTruthy();
});

test("special characters in the title are URL-encoded", async () => {
  global.fetch.mockImplementation(tmdbByName({ "Tom & Jerry": [movie(1, "Tom & Jerry")] }));
  GroqApi.mockResolvedValue("");
  mount();
  search("Tom & Jerry");
  expect(await screen.findByLabelText("Play trailer for Tom & Jerry")).toBeTruthy();
});

test("an unknown movie says so, and an empty search asks for a name", async () => {
  global.fetch.mockImplementation(tmdbByName({}));
  GroqApi.mockResolvedValue("");
  mount();
  search("   ");
  expect(await screen.findByText("Enter a movie name")).toBeTruthy();
  search("Zzzz Nonexistent");
  await waitFor(() => expect(screen.getByText('No movie found for "Zzzz Nonexistent"')).toBeTruthy());
});

test("before any search, the page invites the user to search", () => {
  mount();
  expect(screen.getByText(/Search for a movie to see its poster/)).toBeTruthy();
});
