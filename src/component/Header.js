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
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={bglogo}
          alt="bg-Logo"
          className="w-full h-full object-cover"
        />
      </div>

      <LoginPage />

      {/* Auth Form */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="w-[90%] sm:w-3/4 md:w-1/2 lg:w-1/3 xl:w-1/4 bg-black bg-opacity-70 p-6 sm:p-10 rounded-lg text-white absolute left-1/2 transform -translate-x-1/2 bottom-10"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">
          {signin ? "Sign In" : "Sign Up"}
        </h1>

        {!signin && (
          <input
            ref={nameRef}
            className="p-2 my-2 bg-slate-600 w-full rounded-sm"
            type="text"
            placeholder="Full Name"
          />
        )}

        <input
          ref={emailRef}
          className="p-2 my-2 bg-slate-600 w-full rounded-sm"
          type="email"
          placeholder="Email / Phone Number"
        />

        <input
          ref={passwordRef}
          className="p-2 my-2 bg-slate-600 w-full rounded-sm"
          type="password"
          placeholder="Password"
        />

        {errorMessage && (
          <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
        )}

        <button
          className="p-2 my-4 w-full bg-red-700 hover:bg-red-800 transition duration-300 rounded-md"
          onClick={handleAuth}
        >
          {signin ? "Sign In" : "Sign Up"}
        </button>

        <p
          className="py-2 text-center cursor-pointer hover:underline"
          onClick={handleToggleSignUp}
        >
          {signin ? "New to Netflix? Sign Up" : "Already Registered? Sign In"}
        </p>
      </form>
    </div>
  );
};

export default Header;
