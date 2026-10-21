// Firestore security-rules tests for watch parties. Needs the Firestore emulator:
//   npm run test:rules        (wraps: firebase emulators:exec --only firestore ...)
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";

let env;
const HOST = "host1";
const GUEST = "guest1";
const OTHER = "guest2";
const DAY = 24 * 60 * 60 * 1000;

const cand = (id) => ({ id, title: `M${id}`, year: "2020", rating: 7, poster_path: "/p.jpg", genres: [], fitScore: 0.5, whyEveryone: "ok" });
const newParty = (over = {}) => {
  const now = Date.now();
  return {
    hostUid: HOST,
    name: "Friday",
    createdAt: now,
    expiresAt: now + 2 * DAY,
    status: "voting",
    constraints: { maxRuntime: 120, region: "IN", services: [] },
    members: { [HOST]: { displayName: "Asha", joinedAt: now } },
    candidates: [cand(1), cand(2)],
    votes: {},
    winnerId: null,
    ...over,
  };
};

const host = () => env.authenticatedContext(HOST, { firebase: { sign_in_provider: "password" } }).firestore();
const guest = (uid = GUEST) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const ref = (db, id = "p1") => doc(db, "parties", id);
const seed = (data = newParty(), id = "p1") => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "parties", id), data));
const joined = (uid = GUEST, name = "Riya") => newParty({ members: { [HOST]: { displayName: "Asha", joinedAt: 1 }, [uid]: { displayName: name, joinedAt: 2 } } });

before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-netstream", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

// ── read ─────────────────────────────────────────────────────────────────────
test("signed-in users, including anonymous guests, can read a party; signed-out users cannot", async () => {
  await seed();
  await assertSucceeds(getDoc(ref(guest())));
  await assertSucceeds(getDoc(ref(host())));
  await assertFails(getDoc(ref(anon())));
});

// ── create ───────────────────────────────────────────────────────────────────
test("a real account can create a party as its own host", async () => {
  await assertSucceeds(setDoc(ref(host()), newParty()));
});

test("an anonymous guest cannot create a party", async () => {
  await assertFails(setDoc(ref(guest(HOST)), newParty()));
});

test("create is rejected when hostUid isn't the caller, extra fields exist, or state is pre-filled", async () => {
  const db = host();
  await assertFails(setDoc(ref(db), newParty({ hostUid: "someone-else" })));
  await assertFails(setDoc(ref(db), newParty({ isAdmin: true })));
  await assertFails(setDoc(ref(db), newParty({ status: "locked" })));
  await assertFails(setDoc(ref(db), newParty({ winnerId: 1 })));
  await assertFails(setDoc(ref(db), newParty({ votes: { [HOST]: { 1: 1 } } })));
  await assertFails(setDoc(ref(db), newParty({ candidates: Array.from({ length: 9 }, (_, i) => cand(i)) })));
  await assertFails(setDoc(ref(db), newParty({ members: { [HOST]: { displayName: "A", joinedAt: 1 }, evil: { displayName: "B", joinedAt: 1 } } })));
});

test("create cannot forge createdAt or stretch expiresAt beyond 48h", async () => {
  const now = Date.now();
  const db = host();
  await assertFails(setDoc(ref(db), newParty({ createdAt: now - 10 * DAY, expiresAt: now - 8 * DAY })));
  await assertFails(setDoc(ref(db), newParty({ createdAt: now, expiresAt: now + 30 * DAY })));
});

test("parties can never be deleted", async () => {
  await seed();
  await assertFails(deleteDoc(ref(host())));
});

// ── members and votes ────────────────────────────────────────────────────────
test("a guest can join as themselves, but not write another member's entry", async () => {
  await seed();
  await assertSucceeds(updateDoc(ref(guest()), { [`members.${GUEST}`]: { displayName: "Riya", joinedAt: Date.now() } }));
  await assertFails(updateDoc(ref(guest()), { [`members.${OTHER}`]: { displayName: "Fake", joinedAt: Date.now() } }));
  await assertFails(updateDoc(ref(guest()), { [`members.${HOST}`]: { displayName: "Hijack", joinedAt: Date.now() } }));
});

test("member entries are validated (name length, shape)", async () => {
  await seed();
  await assertFails(updateDoc(ref(guest()), { [`members.${GUEST}`]: { displayName: "", joinedAt: 1 } }));
  await assertFails(updateDoc(ref(guest()), { [`members.${GUEST}`]: { displayName: "x".repeat(31), joinedAt: 1 } }));
  await assertFails(updateDoc(ref(guest()), { [`members.${GUEST}`]: { displayName: "Riya", joinedAt: 1, role: "host" } }));
});

test("a member can vote 1 or -1 on their own uid, and retract", async () => {
  await seed(joined());
  const db = guest();
  await assertSucceeds(updateDoc(ref(db), { [`votes.${GUEST}.1`]: 1 }));
  await assertSucceeds(updateDoc(ref(db), { [`votes.${GUEST}.2`]: -1 }));
  await assertSucceeds(updateDoc(ref(db), { [`votes.${GUEST}.1`]: deleteField() }));
});

test("votes other than 1 / -1 are rejected", async () => {
  await seed(joined());
  const db = guest();
  await assertFails(updateDoc(ref(db), { [`votes.${GUEST}.1`]: 5 }));
  await assertFails(updateDoc(ref(db), { [`votes.${GUEST}.1`]: 0 }));
  await assertFails(updateDoc(ref(db), { [`votes.${GUEST}.1`]: "1" }));
});

test("nobody can write another user's votes, and non-members cannot vote", async () => {
  await seed(joined());
  await assertFails(updateDoc(ref(guest()), { [`votes.${OTHER}.1`]: 1 }));
  await assertFails(updateDoc(ref(host()), { [`votes.${GUEST}.1`]: -1 }));
  await assertFails(updateDoc(ref(guest(OTHER)), { [`votes.${OTHER}.1`]: 1 })); // OTHER never joined
});

// ── host-only fields ─────────────────────────────────────────────────────────
test("an anonymous guest cannot edit candidates, status or winnerId", async () => {
  await seed(joined());
  const db = guest();
  await assertFails(updateDoc(ref(db), { candidates: [cand(99)] }));
  await assertFails(updateDoc(ref(db), { status: "locked" }));
  await assertFails(updateDoc(ref(db), { winnerId: 1 }));
  await assertFails(updateDoc(ref(db), { name: "Renamed", hostUid: GUEST }));
});

test("only the host can lock the winner, and cannot touch hostUid or expiry", async () => {
  await seed(joined());
  await assertFails(updateDoc(ref(host()), { hostUid: GUEST }));
  await assertFails(updateDoc(ref(host()), { expiresAt: Date.now() + 30 * DAY }));
  await assertSucceeds(updateDoc(ref(host()), { status: "locked", winnerId: 2 }));
});

test("the host can also vote as a member", async () => {
  await seed();
  await assertSucceeds(updateDoc(ref(host()), { [`votes.${HOST}.1`]: 1 }));
});

// ── locked / expired ─────────────────────────────────────────────────────────
test("no writes after the party is locked", async () => {
  await seed({ ...joined(), status: "locked", winnerId: 1 });
  await assertFails(updateDoc(ref(guest()), { [`votes.${GUEST}.1`]: 1 }));
  await assertFails(updateDoc(ref(host()), { winnerId: 2 }));
  await assertFails(updateDoc(ref(host()), { status: "voting" }));
});

test("no writes after the party has expired", async () => {
  const now = Date.now();
  await seed({ ...joined(), createdAt: now - 3 * DAY, expiresAt: now - DAY });
  await assertFails(updateDoc(ref(guest()), { [`votes.${GUEST}.1`]: 1 }));
  await assertFails(updateDoc(ref(host()), { status: "locked", winnerId: 1 }));
  await assertSucceeds(getDoc(ref(guest()))); // still readable
});
