import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import user from "../utils/UserSlice";
import Gpt from "../utils/GptSlice";
import LoginPage from "./LoginPage";
import { signOut } from "firebase/auth";

jest.mock("../utils/Firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ signOut: jest.fn() }));

const mount = (gptOn = false) => {
  const store = configureStore({
    reducer: { user, Gpt },
    preloadedState: { user: { uid: "u1", photoURL: null }, Gpt: { showgptsearch: gptOn, searchQuery: "", searchResults: [], movieNames: [], movieResults: [] } },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>
  );
};

test("a failed sign-out shows a message instead of sending the user to a blank /error page", async () => {
  signOut.mockRejectedValue(new Error("network"));
  mount();
  fireEvent.click(screen.getByText("Sign Out"));
  expect((await screen.findByRole("alert")).textContent).toBe("Couldn't sign out. Please try again.");
});

test("a successful sign-out shows no error", async () => {
  signOut.mockResolvedValue();
  mount();
  fireEvent.click(screen.getByText("Sign Out"));
  await waitFor(() => expect(signOut).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("the header has no language dropdown, even on the AI Search page", () => {
  mount(true);
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.getByText("HoMe PaGe")).toBeTruthy();
});
