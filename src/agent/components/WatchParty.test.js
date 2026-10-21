import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import player from "../../utils/playerSlice";
import WatchParty from "./WatchParty";
import * as service from "../party/partyService";
import { fetchWatchProviders } from "../tmdbClient";

jest.mock("../../utils/Firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, cb) => {
    cb(global.__user);
    return () => {};
  },
  signInAnonymously: jest.fn(),
}));
jest.mock("../party/partyService");
jest.mock("../tmdbClient", () => ({ fetchWatchProviders: jest.fn(), fetchTrailerKey: jest.fn() }));

const party = (over = {}) => ({
  id: "p1",
  hostUid: "host",
  name: "Friday night",
  status: "voting",
  expiresAt: Date.now() + 3_600_000,
  constraints: { region: "IN", maxRuntime: 120, services: ["Netflix"] },
  members: { host: { displayName: "Asha" } },
  candidates: [
    { id: 1, title: "Booksmart", year: "2019", fitScore: 0.9, whyEveryone: "Riya: comedy ✓ · Arjun: open to anything", poster_path: "/b.jpg" },
    { id: 2, title: "Her", year: "2013", fitScore: 0.7, whyEveryone: "Riya: open to anything" },
  ],
  votes: {},
  winnerId: null,
  ...over,
});

function mount(p, uid) {
  global.__user = { uid, isAnonymous: uid !== "host" };
  service.subscribeParty.mockImplementation((_id, cb) => {
    cb(p);
    return jest.fn();
  });
  const store = configureStore({ reducer: { player } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/party/p1"]}>
        <Routes>
          <Route path="/party/:partyId" element={<WatchParty />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

// CRA sets resetMocks: true, so implementations must be (re)installed before every test.
beforeEach(() => {
  fetchWatchProviders.mockResolvedValue({ region: "IN", link: null, flatrate: [], rent: [], buy: [] });
});

test("guests must join with a name before voting", async () => {
  service.joinParty.mockResolvedValue();
  mount(party(), "guest1");
  expect(screen.getByLabelText(/vote yes for booksmart/i).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Riya" } });
  fireEvent.click(screen.getByText(/Join & vote/));
  await waitFor(() => expect(service.joinParty).toHaveBeenCalledWith("p1", "guest1", "Riya"));
});

test("members vote, retract by clicking again, and non-hosts never see Lock winner", async () => {
  service.castVote.mockResolvedValue();
  mount(party({ members: { host: { displayName: "Asha" }, guest1: { displayName: "Riya" } }, votes: { guest1: { 2: 1 } } }), "guest1");
  fireEvent.click(screen.getByLabelText(/vote yes for booksmart/i));
  await waitFor(() => expect(service.castVote).toHaveBeenCalledWith("p1", "guest1", 1, 1));
  await waitFor(() => expect(screen.getByLabelText(/vote yes for her/i).disabled).toBe(false)); // first write settled
  fireEvent.click(screen.getByLabelText(/vote yes for her/i)); // already voted yes -> retract
  await waitFor(() => expect(service.castVote).toHaveBeenCalledWith("p1", "guest1", 2, 0));
  expect(screen.queryByText("Lock winner")).toBeNull();
  expect(screen.getByText(/Riya: comedy ✓/)).toBeTruthy();
});

test("the host can lock the winner", async () => {
  service.lockWinner.mockResolvedValue();
  mount(party(), "host");
  fireEvent.click(screen.getByText("Lock winner"));
  await waitFor(() => expect(service.lockWinner).toHaveBeenCalled());
});

test("locked party shows the winner and disables voting", async () => {
  mount(party({ status: "locked", winnerId: 2 }), "host");
  expect(screen.getByLabelText("Winner")).toBeTruthy();
  expect(screen.getByText("▶ Play trailer")).toBeTruthy();
  expect(screen.getByLabelText(/vote yes for her/i).disabled).toBe(true);
  expect(screen.queryByText("Lock winner")).toBeNull();
  await screen.findByText("Streaming data by JustWatch");
});

test("expired party is read-only", () => {
  mount(party({ expiresAt: Date.now() - 1 }), "host");
  expect(screen.getByText(/This party has expired/)).toBeTruthy();
  expect(screen.queryByText("Lock winner")).toBeNull();
});

test("missing party shows a not-found notice", () => {
  mount(null, "host");
  expect(screen.getByText("Party not found")).toBeTruthy();
});
