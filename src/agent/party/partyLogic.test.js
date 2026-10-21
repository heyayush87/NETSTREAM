import { netScore, voteCounts, pickWinner, isExpired, buildPartyDoc, PARTY_TTL_MS } from "./partyLogic";

const cands = [
  { id: 1, title: "A", fitScore: 0.9 },
  { id: 2, title: "B", fitScore: 0.8 },
  { id: 3, title: "C", fitScore: 0.7 },
];

test("tally counts up, down and net across members", () => {
  const votes = { u1: { 1: 1, 2: -1 }, u2: { 1: 1, 2: 1 }, u3: { 1: -1 } };
  expect(voteCounts(votes, 1)).toEqual({ up: 2, down: 1, net: 1 });
  expect(netScore(votes, 2)).toBe(0);
  expect(netScore(votes, 3)).toBe(0);
});

test("winner is the highest net score; ties go to fitScore", () => {
  expect(pickWinner(cands, { u1: { 2: 1, 3: 1 }, u2: { 2: 1 } }).id).toBe(2);
  expect(pickWinner(cands, { u1: { 2: 1, 3: 1 } }).id).toBe(2); // 2 and 3 tie on net, B has the higher fit
  expect(pickWinner(cands, {}).id).toBe(1); // no votes: best fit
  expect(pickWinner([], {})).toBeNull();
});

test("a net-negative favourite loses to an unvoted movie", () => {
  expect(pickWinner(cands, { u1: { 1: -1 }, u2: { 1: -1 } }).id).toBe(2);
});

test("isExpired flips at expiresAt", () => {
  expect(isExpired({ expiresAt: 1000 }, 999)).toBe(false);
  expect(isExpired({ expiresAt: 1000 }, 1000)).toBe(true);
  expect(isExpired(null)).toBe(true);
});

test("buildPartyDoc matches the shape firestore.rules expects", () => {
  const doc = buildPartyDoc({
    now: 5000,
    hostUid: "host",
    hostName: "Asha",
    draft: {
      name: "Friday",
      constraints: { maxRuntime: 120, region: "IN", services: ["Netflix"] },
      candidates: Array.from({ length: 12 }, (_, i) => ({ id: i, title: `M${i}`, overview: "x".repeat(500), fitScore: 1, whyEveryone: "ok", extra: "dropped" })),
    },
  });
  expect(Object.keys(doc).sort()).toEqual(["candidates", "constraints", "createdAt", "expiresAt", "hostUid", "members", "name", "status", "votes", "winnerId"]);
  expect(doc.expiresAt - doc.createdAt).toBe(PARTY_TTL_MS);
  expect(doc.candidates).toHaveLength(8);
  expect(doc.candidates[0].overview).toHaveLength(240);
  expect(doc.candidates[0].extra).toBeUndefined();
  expect(doc.members).toEqual({ host: { displayName: "Asha", joinedAt: 5000 } });
  expect(doc).toMatchObject({ status: "voting", winnerId: null, votes: {} });
});
