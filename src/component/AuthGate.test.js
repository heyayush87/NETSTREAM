import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import user from "../utils/UserSlice";
import { RequireAuth, RedirectIfAuthed } from "./AuthGate";
import { onAuthStateChanged } from "firebase/auth";

jest.mock("../utils/Firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

const REAL = { uid: "u1", email: "a@b.co", displayName: "Asha", photoURL: null, isAnonymous: false };
const GUEST = { uid: "g1", isAnonymous: true };

// Firebase answers: `null` = signed out, an object = that user. `undefined` = hasn't answered yet.
const firebaseSays = (u) =>
  onAuthStateChanged.mockImplementation((_auth, cb) => {
    if (u !== undefined) cb(u);
    return () => {};
  });

function mount(path) {
  const store = configureStore({ reducer: { user } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<RedirectIfAuthed><div>login-page</div></RedirectIfAuthed>} />
          <Route path="/browse" element={<RequireAuth><div>browse-page</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
}

test("a signed-out visitor to /browse is sent to login and the page never renders", () => {
  firebaseSays(null);
  mount("/browse");
  expect(screen.getByText("login-page")).toBeTruthy();
  expect(screen.queryByText("browse-page")).toBeNull();
});

test("nothing protected renders while Firebase hasn't answered yet", () => {
  firebaseSays(undefined);
  mount("/browse");
  expect(screen.getByRole("status").textContent).toMatch(/Loading/);
  expect(screen.queryByText("browse-page")).toBeNull();
  expect(screen.queryByText("login-page")).toBeNull();
});

test("a signed-in user sees /browse, and Redux gets the user", () => {
  firebaseSays(REAL);
  const store = mount("/browse");
  expect(screen.getByText("browse-page")).toBeTruthy();
  expect(store.getState().user).toEqual({ uid: "u1", email: "a@b.co", displayName: "Asha", photoURL: null });
});

test("a signed-in user opening the login page is redirected to /browse", () => {
  firebaseSays(REAL);
  mount("/");
  expect(screen.getByText("browse-page")).toBeTruthy();
});

test("an anonymous watch-party guest is not an account: no /browse, login page stays reachable", () => {
  firebaseSays(GUEST);
  mount("/browse");
  expect(screen.queryByText("browse-page")).toBeNull();
  expect(screen.getByText("login-page")).toBeTruthy();
});
