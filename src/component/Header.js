import React, { useState, useRef } from "react";
import { Validate } from "../utils/Validate";
import { auth } from "../utils/Firebase";
import { useNavigate } from "react-router-dom";
import {
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useDispatch } from "react-redux";
import { adduser } from "../utils/UserSlice";
import { avtaar, bglogo } from "../utils/constant";
import LoginPage from "./LoginPage";

const Header = () => {
  const [signin, setsignin] = useState(true);
  const [errorMessage, seterrorMessage] = useState("");
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const dispatch = useDispatch();

  const handleToggleSignUp = () => setsignin(!signin);

  const handleAuth = async () => {
    seterrorMessage("");

    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    const name = nameRef.current?.value || "User";

    const validationError = Validate(email, password);
    if (validationError) {
      seterrorMessage(validationError);
      return;
    }

    if (!signin) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(userCredential.user, {
          displayName: name,
          photoURL: avtaar,
        });

        const { uid, displayName, photoURL } = auth.currentUser;
        dispatch(adduser({ uid, email, displayName, photoURL }));

        navigate("/browse");
      } catch (error) {
        seterrorMessage(error.message);
      }
    } else {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const { uid, displayName, photoURL } = auth.currentUser;
        dispatch(adduser({ uid, email, displayName, photoURL }));

        navigate("/browse");
      } catch (error) {
        seterrorMessage(error.message);
      }
    }
  };

  return (
    // ✅ Changed min-h-screen → min-h-dvh to support iOS safe area correctly
    <div className="relative min-h-dvh flex flex-col">
      {/* ✅ Replaced absolute background image with bg-cover style to avoid z-index/layout issues on mobile */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${bglogo})` }}
      ></div>

      <LoginPage />

      <div className="flex-grow flex items-center justify-center p-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          // ✅ Added responsive padding: px-6 for small devices, sm:px-8 for tablets and up
          className="w-full max-w-md bg-black bg-opacity-70 px-6 sm:px-8 py-8 text-white rounded-lg"
        >
          <h1 className="text-3xl font-bold mb-6">
            {signin ? "Sign In" : "Sign Up"}
          </h1>

          {!signin && (
            <input
              ref={nameRef}
              className="p-3 my-3 bg-gray-700 w-full rounded text-base" // ✅ text-base ensures no iOS zoom
              type="text"
              placeholder="Full Name"
            />
          )}

          <input
            ref={emailRef}
            className="p-3 my-3 bg-gray-700 w-full rounded text-base" // ✅ text-base for Safari iOS
            type="email"
            placeholder="Email / Phone Number"
          />

          <input
            ref={passwordRef}
            className="p-3 my-3 bg-gray-700 w-full rounded text-base" // ✅ text-base for Safari iOS
            type="password"
            placeholder="Password"
          />

          {errorMessage && (
            <p className="text-red-500 text-sm py-2">{errorMessage}</p>
          )}

          <button
            className="p-3 my-4 w-full bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors"
            onClick={handleAuth}
          >
            {signin ? "Sign In" : "Sign Up"}
          </button>

          <p className="mt-4 text-gray-400 text-center">
            {signin ? "New to Netflix?" : "Already registered?"}{" "}
            <span
              className="text-white hover:underline cursor-pointer"
              onClick={handleToggleSignUp}
            >
              {signin ? "Sign up now" : "Sign in now"}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Header;
