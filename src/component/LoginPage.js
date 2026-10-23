import React, { useState } from "react";
import { auth } from "../utils/Firebase";
import { signOut } from "firebase/auth";
import { useSelector, useDispatch } from "react-redux";
import { netflixlogo } from "../utils/constant";
import { toggleGptsearch } from "../utils/GptSlice";

// Shared top bar (logo, AI Search toggle, avatar, sign out). Sign-in state and redirects are
// handled by <RequireAuth> / <RedirectIfAuthed>; this component only displays and signs out.
const LoginPage = () => {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.user);
  const showGpt = useSelector((store) => store.Gpt.showgptsearch);
  const [signOutError, setSignOutError] = useState("");

  const handleSignOut = () => {
    setSignOutError("");
    // On success Firebase reports "signed out" and <RequireAuth> sends the user back to the login page.
    signOut(auth).catch(() => setSignOutError("Couldn't sign out. Please try again."));
  };

  return (
    <header className="w-full px-2 sm:px-6 py-2 bg-gradient-to-b from-black/60 to-transparent z-30 flex flex-row items-center justify-between gap-4">
      <img className="w-20 sm:w-28 md:w-32 mx-0" src={netflixlogo} alt="netflix-logo" loading="lazy" />

      {user && (
        <div className="flex flex-row items-center gap-2 p-2 w-auto">
          {signOutError && (
            <span className="text-xs text-red-400" role="alert">
              {signOutError}
            </span>
          )}
          <button
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold text-white rounded bg-green-600 hover:bg-green-700 transition w-auto"
            onClick={() => dispatch(toggleGptsearch())}
          >
            {showGpt ? "HoMe PaGe" : " AI  SeArCh"}
          </button>
          {user.photoURL && (
            <img
              className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover"
              alt="User-Icon"
              src={user.photoURL}
              loading="lazy"
            />
          )}
          <button
            onClick={handleSignOut}
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold text-white rounded bg-red-600 hover:bg-red-700 transition w-auto"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
};

export default LoginPage;
