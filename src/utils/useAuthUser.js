import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";

/**
 * The signed-in account, or null. `ready` is false until Firebase has answered, so callers can
 * wait instead of guessing. Anonymous users (watch-party guests) are not accounts: they read as null.
 */
export default function useAuthUser() {
  const [state, setState] = useState({ user: null, ready: false });
  useEffect(
    () => onAuthStateChanged(auth, (u) => setState({ user: u && !u.isAnonymous ? u : null, ready: true })),
    []
  );
  return state;
}
