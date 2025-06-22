import React, { useEffect } from "react";
import { auth } from "../utils/Firebase";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useSelector, useDispatch } from "react-redux";
import { netflixlogo, Supported_Languages } from "../utils/constant";
import { toggleGptsearch } from "../utils/GptSlice";
import { adduser, removeuser } from "../utils/UserSlice";
import { changeLanguage } from "../utils/ConfigSlice";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const use = useSelector((store) => store.user);
  

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {})
      .catch(() => {
        navigate("/error");
      });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (use) => {
      if (use) {
        const { uid, email, displayName, photoURL } = use;
        dispatch(
          adduser({
            uid,
            email,
            displayName,
            photoURL,
          })
        );
        navigate("/browse");
      } else {
        dispatch(removeuser());
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGptSearchClick = () => {
    dispatch(toggleGptsearch());
  };

  const handleChangeLanguage = (e) => {
    dispatch(changeLanguage(e.target.value));
  };

  const showGpt = useSelector((store) => store.Gpt.showgptsearch);

  return (
    <header className="w-full px-2 sm:px-6 py-2 bg-gradient-to-b from-black/60 to-transparent z-30 flex flex-row items-center justify-between gap-4">
      <img
        className="w-20 sm:w-28 md:w-32 mx-0"
        src={netflixlogo}
        alt="netflix-logo"
        loading="lazy"
      />

      {use && (
        <div className="flex flex-row items-center gap-2 p-2 w-auto">
          {showGpt && (
            <select
              className="p-1 sm:p-2 bg-gray-900 text-white rounded w-auto text-sm"
              onChange={handleChangeLanguage}
            >
              {Supported_Languages.map((lang) => (
                <option key={lang.identifiers} value={lang.identifiers}>
                  {lang.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold text-white rounded bg-green-600 hover:bg-green-700 transition w-auto"
            onClick={handleGptSearchClick}
          >
            {showGpt ? "HoMe PaGe" : "GeMiNi SeArCh"}
          </button>
          {use?.photoURL && (
            <img
              className="hidden md:block w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
              alt="User-Icon"
              src={use.photoURL}
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
