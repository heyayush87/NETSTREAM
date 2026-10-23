// Turn Firebase's error codes into messages a person can act on (never show "Firebase: Error (auth/...)").
const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "That password is too weak. Use at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/invalid-api-key": "The app isn't configured correctly (missing Firebase API key).",
  "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "The app isn't configured correctly (invalid Firebase API key).",
};

export function friendlyAuthError(error) {
  return MESSAGES[error?.code] || "Something went wrong. Please try again.";
}
