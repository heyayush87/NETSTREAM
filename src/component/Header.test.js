import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import user from "../utils/UserSlice";
import Gpt from "../utils/GptSlice";
import Header from "./Header";
import { PASSWORD_RULE } from "../utils/Validate";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

jest.mock("../utils/Firebase", () => ({ auth: { currentUser: { uid: "u1", displayName: "Asha", photoURL: "p" } } }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
}));

function mount() {
  const store = configureStore({ reducer: { user, Gpt } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </Provider>
  );
  return store;
}
const fill = ({ email = "a@b.co", password = "Abc12345", name } = {}) => {
  if (name !== undefined) fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
};
const submit = (label) => fireEvent.click(screen.getByRole("button", { name: label }));

test("sign-in works with a simple existing password (the strength rule is sign-up only)", async () => {
  signInWithEmailAndPassword.mockResolvedValue({});
  mount();
  fill({ password: "simple" });
  submit("Sign In");
  await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), "a@b.co", "simple"));
});

test("a wrong password shows a friendly message, not Firebase's raw text", async () => {
  signInWithEmailAndPassword.mockRejectedValue({ code: "auth/invalid-credential", message: "Firebase: Error (auth/invalid-credential)." });
  mount();
  fill();
  submit("Sign In");
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Incorrect email or password.");
});

test("the button is disabled while signing in, so double clicks send one request", async () => {
  let release;
  signInWithEmailAndPassword.mockImplementation(() => new Promise((res) => (release = res)));
  mount();
  fill();
  submit("Sign In");
  const busyBtn = await screen.findByRole("button", { name: "Please wait…" });
  expect(busyBtn.disabled).toBe(true);
  fireEvent.click(busyBtn);
  expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
  release({});
  await screen.findByRole("button", { name: "Sign In" });
});

test("sign-up states the password rule, and a weak password never reaches Firebase", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Sign up now" }));
  expect(screen.getAllByText(PASSWORD_RULE).length).toBeGreaterThan(0);
  fill({ password: "abc", name: "Asha" });
  submit("Sign Up");
  expect(screen.getByRole("alert").textContent).toBe("Password still needs at least 6 characters, an uppercase letter and a number.");
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
});

test("sign-up succeeds even if setting the display name fails", async () => {
  createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: "u1" } });
  updateProfile.mockRejectedValue(new Error("profile failed"));
  jest.spyOn(console, "warn").mockImplementation(() => {});
  const store = mount();
  fireEvent.click(screen.getByRole("button", { name: "Sign up now" }));
  fill({ name: "Asha" });
  submit("Sign Up");
  await waitFor(() => expect(store.getState().user).toMatchObject({ uid: "u1" }));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("switching between Sign In and Sign Up clears the old error", () => {
  mount();
  fill({ email: "bad" });
  submit("Sign In");
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sign up now" }));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("forgot password sends a reset email and answers the same whether or not the account exists", async () => {
  sendPasswordResetEmail.mockResolvedValue();
  mount();
  fireEvent.click(screen.getByText("Forgot password?"));
  expect(screen.getByRole("alert").textContent).toMatch(/Enter your email/); // needs an email first
  fill({ email: "who@ever.com" });
  fireEvent.click(screen.getByText("Forgot password?"));
  await waitFor(() => expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), "who@ever.com"));
  expect((await screen.findByRole("status")).textContent).toMatch(/If an account exists/);
});
