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
  const user = useSelector((store) => store.user);
  const showGpt = useSelector((store) => store.Gpt.showgptsearch);

  // Handle sign out
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {})
      .catch((error) => {
        navigate("/error");
      });
  };

  // Handle auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const { uid, email, displayName, photoURL } = authUser;
        dispatch(
          adduser({
            uid: uid,
            email: email,
            displayName: displayName,
            photoURL: photoURL,
          })
        );
        navigate("/browse");
      } else {
        dispatch(removeuser());
        navigate("/");
      }
    });

    // Unsubscribe when component unmounts
    return () => unsubscribe();
  }, [dispatch, navigate]);

  // Handle GPT search toggle
  const handleGptSearchClick = () => {
    dispatch(toggleGptsearch());
  };

  // Handle language change
  const handleChangeLanguage = (e) => {
    dispatch(changeLanguage(e.target.value));
  };

  return (
    <div className="absolute w-screen px-8 py-2 bg-gradient-to-b from-black z-10 flex flex-col md:flex-row justify-between items-center md:items-start">
      <img
        className="w-44 mx-auto md:mx-0 mb-4 md:mb-0"
        src={netflixlogo}
        alt="netflix-logo"
      />

      {user && (
        <div className="flex flex-col md:flex-row items-center gap-4 p-2 w-full md:w-auto">
          {/* Language Dropdown */}
          {showGpt && (
            <select
              className="p-2 m-2 bg-gray-900 text-white rounded-md"
              onChange={handleChangeLanguage}
            >
              {Supported_Languages.map((lang) => (
                <option key={lang.identifiers} value={lang.identifiers}>
                  {lang.name}
                </option>
              ))}
            </select>
          )}

          {/* GPT Toggle Button */}
          <button
            className="px-4 py-2 m-2 font-bold text-white rounded-lg bg-green-600"
            onClick={handleGptSearchClick}
          >
            {showGpt ? "HoMe PaGe" : "GeMiNi SeArCh"}
          </button>

          {/* User Avatar */}
          {user?.photoURL && (
            <img
              className="w-12 h-12 rounded-full object-cover"
              alt="User-Icon"
              src={user.photoURL}
            />
          )}

          {/* Sign Out Button */}
          <button onClick={handleSignOut} className="font-bold text-white">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
