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
    <div>
      <div className="absolute">
        <img src={bglogo} alt="bg-Logo" />
      </div>
      <LoginPage />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="w-3/12 absolute bg-black bg-opacity-70 p-12 mx-auto right-0 left-0 bottom-0 text-white"
      >
        <h1 className="text-3xl font-bold">{signin ? "Sign In" : "Sign Up"}</h1>

        {!signin && (
          <input
            ref={nameRef}
            className="p-2 my-2 bg-slate-600 w-full"
            type="text"
            placeholder="Full Name"
          />
        )}

        <input
          ref={emailRef}
          className="p-2 my-2 bg-slate-600 w-full"
          type="email"
          placeholder="Email / Phone Number"
        />

        <input
          ref={passwordRef}
          className="p-2 my-2 bg-slate-600 w-full"
          type="password"
          placeholder="Password"
        />

        {errorMessage && <p className="text-red-600">{errorMessage}</p>}

        <button
          className="p-2 my-4 w-full bg-red-700 text-white rounded-sm"
          onClick={handleAuth}
        >
          {signin ? "Sign In" : "Sign Up"}
        </button>

        <p
          className="py-2 cursor-pointer w-full text-center"
          onClick={handleToggleSignUp}
        >
          {signin ? "New to Netflix? Sign Up" : "Already Registered? Sign In"}
        </p>
      </form>
    </div>
  );
};

export default Header;
