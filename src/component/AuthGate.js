import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import useAuthUser from "../utils/useAuthUser";
import { adduser, removeuser } from "../utils/UserSlice";

const Splash = () => (
  <div className="min-h-dvh w-full bg-black flex items-center justify-center text-gray-300" role="status">
    Loading…
  </div>
);

// One place keeps the Redux user in step with Firebase (the old code did this in the header component).
function useSyncReduxUser({ user, ready }) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!ready) return;
    if (user) dispatch(adduser({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL }));
    else dispatch(removeuser());
  }, [user, ready, dispatch]);
}

/** Protected page: nothing renders (and no API calls fire) until Firebase confirms a signed-in account. */
export function RequireAuth({ children }) {
  const auth = useAuthUser();
  useSyncReduxUser(auth);
  if (!auth.ready) return <Splash />;
  if (!auth.user) return <Navigate to="/" replace />;
  return children;
}

/** Login page: signed-in users go straight to /browse. */
export function RedirectIfAuthed({ children }) {
  const auth = useAuthUser();
  useSyncReduxUser(auth);
  if (!auth.ready) return <Splash />;
  if (auth.user) return <Navigate to="/browse" replace />;
  return children;
}
