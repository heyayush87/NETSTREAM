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

  // Toggle between Sign In and Sign Up
  const handleToggleSignUp = () => setsignin(!signin);

  // Handle Authentication
  const handleAuth = async () => {
    seterrorMessage(""); // Clear previous errors

    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    const name = nameRef.current?.value || "User";

    // Validate input fields
    const validationError = Validate(email, password);
    if (validationError) {
      seterrorMessage(validationError);
      return;
    }

    if (!signin) {
      // Signup logic
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
      // Sign-in logic
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
      <div className="absolute inset-0 -z-10">
        <img
          src={bglogo}
          alt="bg-Logo"
          className="w-full h-full object-cover"
        />
      </div>

      <LoginPage />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 p-8 sm:p-10 md:p-12 text-white rounded-lg"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">
          {signin ? "Sign In" : "Sign Up"}
        </h1>

        {!signin && (
          <input
            ref={nameRef}
            className="p-2 my-2 bg-slate-600 w-full rounded"
            type="text"
            placeholder="Full Name"
          />
        )}

        <input
          ref={emailRef}
          className="p-2 my-2 bg-slate-600 w-full rounded"
          type="email"
          placeholder="Email / Phone Number"
        />

        <input
          ref={passwordRef}
          className="p-2 my-2 bg-slate-600 w-full rounded"
          type="password"
          placeholder="Password"
        />

        {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}

        <button
          className="p-2 my-4 w-full bg-red-700 text-white rounded"
          onClick={handleAuth}
        >
          {signin ? "Sign In" : "Sign Up"}
        </button>

        <p
          className="py-2 cursor-pointer w-full text-center text-sm hover:underline"
          onClick={handleToggleSignUp}
        >
          {signin ? "New to Netflix? Sign Up" : "Already Registered? Sign In"}
        </p>
      </form>
    </div>
  );
  
};

export default Header;
