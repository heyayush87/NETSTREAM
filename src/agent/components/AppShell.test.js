import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import AppShell from "./AppShell";

jest.mock("./AgentDrawer", () => () => <div>assistant-drawer</div>);
jest.mock("./PlayerModal", () => () => <div>player-modal</div>);

const mount = (enabled) => {
  if (enabled) process.env.REACT_APP_ENABLE_ASSISTANT = "true";
  else delete process.env.REACT_APP_ENABLE_ASSISTANT;
  const store = configureStore({ reducer: { user: () => ({ uid: "u1" }) } }); // signed in
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </Provider>
  );
};

afterEach(() => {
  delete process.env.REACT_APP_ENABLE_ASSISTANT;
});

test("the assistant button is hidden by default, even for signed-in users", () => {
  mount(false);
  expect(screen.queryByText("assistant-drawer")).toBeNull();
  expect(screen.getByText("player-modal")).toBeTruthy(); // trailers still work
});

test("the assistant appears only when REACT_APP_ENABLE_ASSISTANT=true", () => {
  mount(true);
  expect(screen.getByText("assistant-drawer")).toBeTruthy();
});
