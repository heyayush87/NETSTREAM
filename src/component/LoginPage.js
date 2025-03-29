import React from "react";
import { auth } from "../utils/Firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { netflixlogo } from "../utils/constant";
import { toggleGptsearch } from "../utils/GptSlice";

import { onAuthStateChanged } from "firebase/auth";
import { adduser, removeuser } from "../utils/UserSlice";
import { useEffect } from "react";
import { Supported_Languages } from "../utils/constant";
import { changeLanguage } from "../utils/ConfigSlice";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const use = useSelector((store) => store.user);
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {})
      .catch((error) => {
        navigate("/error");
      });
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (use) => {
      if (use) {
        const { uid, email, displayName, photoURL } = use;
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

    // Unsiubscribe when component unmounts
    return () => unsubscribe();
  }, []);
  const handleGptSearchClick = () => {
    // Toggle

    dispatch(toggleGptsearch());
  };

  const handleChangeLanguage = (e) => {
    dispatch(changeLanguage(e.target.value));
    // console.log(e.target.value);
  };

  const showGpt = useSelector((store) => store.Gpt.showgptsearch);
  return (
    <div className="absolute w-screen px-8 py-2 bg-gradient-to-b from-black z-10 flex flex-col md:flex-row justify-between">
      <img
        className="w-44 mx-auto md:mx-0"
        src={netflixlogo}
        alt="netflix-logo"
      />

      {use && (
        <div className="flex p-2 ">
          {showGpt && (
            <select
              className="p-2 m-2 bg-gray-900 text-white"
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
            className="px-4 py-2 m-2 font-bold text-white rounded-lg bg-green-600"
            onClick={handleGptSearchClick}
          >
            {showGpt ? "HoMe PaGe" : "GeMiNi SeArCh"}
          </button>
          <img
            className="hidden md:block w-12 h-12"
            alt="User-Icon"
            src={use.photoURL}
          />
          <button onClick={handleSignOut} className="font-bold text-white ">
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
