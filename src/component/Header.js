import React, { useState, useRef } from "react";
import { Validate, isEmailValid, PASSWORD_RULE } from "../utils/Validate";
import { friendlyAuthError } from "../utils/authErrors";
import { auth } from "../utils/Firebase";
import {
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useDispatch } from "react-redux";
import { adduser } from "../utils/UserSlice";
import { avtaar, bglogo } from "../utils/constant";
import LoginPage from "./LoginPage";

// Sign-in / sign-up form. Redirecting to /browse is handled by <RedirectIfAuthed> in the router,
// so this component only talks to Firebase and reports problems.
const Header = () => {
  const [signin, setsignin] = useState(true);
  const [errorMessage, seterrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const dispatch = useDispatch();

  const clearMessages = () => {
    seterrorMessage("");
    setInfoMessage("");
  };

  const handleToggleSignUp = () => {
    clearMessages();
    setsignin(!signin);
  };

  const handleAuth = async () => {
    if (busy) return; // ignore double clicks while a request is in flight
    clearMessages();

    const email = emailRef.current?.value.trim();
    const password = passwordRef.current?.value;
    const name = nameRef.current?.value.trim() || "User";

    const validationError = Validate(email, password, { isSignUp: !signin });
    if (validationError) {
      seterrorMessage(validationError);
      return;
    }

    setBusy(true);
    try {
      if (signin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await updateProfile(user, { displayName: name, photoURL: avtaar });
        } catch (err) {
          // The account exists already; a failed name/photo update must not look like a failed sign-up.
          console.warn("Profile update failed", err);
        }
        const { uid, displayName, photoURL } = auth.currentUser;
        dispatch(adduser({ uid, email, displayName, photoURL }));
      }
    } catch (error) {
      seterrorMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (busy) return;
    clearMessages();
    const email = emailRef.current?.value.trim();
    if (!isEmailValid(email)) {
      seterrorMessage("Enter your email above first, then click “Forgot password?”.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // Same wording whether or not the account exists, so this can't be used to probe for emails.
      setInfoMessage("If an account exists for that email, a password reset link is on its way.");
    } catch (error) {
      seterrorMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${bglogo})` }}
      ></div>

      <LoginPage />

      <div className="flex-grow flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAuth();
          }}
          className="w-full max-w-md bg-black bg-opacity-70 px-6 sm:px-8 py-8 text-white rounded-lg"
        >
          <h1 className="text-3xl font-bold mb-6">{signin ? "Sign In" : "Sign Up"}</h1>

          {!signin && (
            <input
              ref={nameRef}
              className="p-3 my-3 bg-gray-700 w-full rounded text-base"
              type="text"
              placeholder="Full Name"
              aria-label="Full name"
              autoComplete="name"
            />
          )}

          <input
            ref={emailRef}
            className="p-3 my-3 bg-gray-700 w-full rounded text-base"
            type="email"
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
          />

          <input
            ref={passwordRef}
            className="p-3 my-3 bg-gray-700 w-full rounded text-base"
            type="password"
            placeholder="Password"
            aria-label="Password"
            autoComplete={signin ? "current-password" : "new-password"}
          />

          {!signin && <p className="text-xs text-gray-400">{PASSWORD_RULE}</p>}

          {errorMessage && (
            <p className="text-red-500 text-sm py-2" role="alert">
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p className="text-green-400 text-sm py-2" role="status">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="p-3 my-4 w-full bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {busy ? "Please wait…" : signin ? "Sign In" : "Sign Up"}
          </button>

          {signin && (
            <button type="button" onClick={handleForgotPassword} disabled={busy} className="text-sm text-gray-300 hover:underline disabled:opacity-60">
              Forgot password?
            </button>
          )}

          <p className="mt-4 text-gray-400 text-center">
            {signin ? "New to Netflix?" : "Already registered?"}{" "}
            <button type="button" className="text-white hover:underline" onClick={handleToggleSignUp}>
              {signin ? "Sign up now" : "Sign in now"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Header;
