import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import agent, { turnStarted, textDelta } from "../utils/agentSlice";
import player from "../utils/playerSlice";
import { applyToolResult } from "./toolHandlers";
import CandidatePicker from "./components/CandidatePicker";

const card = { id: 137, title: "Groundhog Day", year: "1993", poster_path: "/g.jpg" };
const evt = (payload, type = "SHOW_CANDIDATES") => ({ name: "identify_movie_from_description", ok: true, directive: { type, payload } });

const setup = () => {
  const store = configureStore({ reducer: { agent, player } });
  store.dispatch(turnStarted("a guy relives the same day"));
  store.dispatch(textDelta("Found one."));
  return { store, ctx: { dispatch: store.dispatch, getState: store.getState, navigate: jest.fn() } };
};

test("SHOW_CANDIDATES attaches sanitized candidates to the assistant message", () => {
  const { store, ctx } = setup();
  const label = applyToolResult(
    evt({ query: "same day", candidates: [{ ...card, reason: "x".repeat(300), confidence: 4 }, { bad: true }] }),
    ctx
  );
  const last = store.getState().agent.messages.at(-1);
  expect(last.role).toBe("assistant");
  expect(last.candidates.items).toHaveLength(1);
  expect(last.candidates.items[0].reason).toHaveLength(160);
  expect(last.candidates.items[0].confidence).toBe(1);
  expect(label).toMatch(/1 possible match/);
});

test("rejects a directive of the wrong type", () => {
  const { store, ctx } = setup();
  applyToolResult(evt({ movie: card, candidates: [card] }, "OPEN_PLAYER"), ctx);
  expect(store.getState().agent.messages.at(-1).candidates).toBeUndefined();
  expect(store.getState().player.isOpen).toBe(false);
});

describe("CandidatePicker", () => {
  const items = [{ ...card, reason: "Time loop in a small town", confidence: 0.82 }];

  test("reports preview, confirm and none-of-these", () => {
    const onPreview = jest.fn(), onConfirm = jest.fn(), onNone = jest.fn();
    render(<CandidatePicker candidates={items} onPreview={onPreview} onConfirm={onConfirm} onNone={onNone} />);
    expect(screen.getByText("Time loop in a small town")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("82");
    fireEvent.click(screen.getByText(/Is it this/));
    fireEvent.click(screen.getByText(/Yes, that's it/));
    fireEvent.click(screen.getByText("None of these"));
    expect(onPreview).toHaveBeenCalledWith(items[0]);
    expect(onConfirm).toHaveBeenCalledWith(items[0]);
    expect(onNone).toHaveBeenCalled();
  });

  test("buttons are disabled while the assistant is streaming", () => {
    const onConfirm = jest.fn();
    render(<CandidatePicker candidates={items} disabled onPreview={() => {}} onConfirm={onConfirm} onNone={() => {}} />);
    fireEvent.click(screen.getByText(/Yes, that's it/));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
