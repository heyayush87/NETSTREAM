import { doc, setDoc, updateDoc, onSnapshot, deleteField } from "firebase/firestore";
import { nanoid } from "@reduxjs/toolkit";
import { db } from "../../utils/Firebase";
import { buildPartyDoc, pickWinner } from "./partyLogic";

const partyRef = (id) => doc(db, "parties", id);

/** Host creates the party. Runs as the signed-in user, so firestore.rules decide whether it is allowed. */
export async function createParty({ draft, user }) {
  const id = nanoid(12);
  await setDoc(partyRef(id), buildPartyDoc({ draft, hostUid: user.uid, hostName: user.displayName || user.email?.split("@")[0] }));
  return id;
}

/** Live updates. Returns the unsubscribe function. `cb(null)` means the party doesn't exist. */
export function subscribeParty(id, cb, onError) {
  return onSnapshot(partyRef(id), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError);
}

export const joinParty = (id, uid, displayName) =>
  updateDoc(partyRef(id), { [`members.${uid}`]: { displayName: displayName.trim().slice(0, 30), joinedAt: Date.now() } });

/** value: 1 | -1, or 0 to retract the vote. */
export const castVote = (id, uid, movieId, value) =>
  updateDoc(partyRef(id), { [`votes.${uid}.${movieId}`]: value === 0 ? deleteField() : value });

/** Host only (enforced by rules): lock the highest-voted candidate as the winner. */
export function lockWinner(party) {
  const winner = pickWinner(party.candidates, party.votes);
  if (!winner) return Promise.resolve();
  return updateDoc(partyRef(party.id), { status: "locked", winnerId: winner.id });
}
