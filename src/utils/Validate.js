// Rules shown to the user in plain words, so a rejected password is never a mystery.
export const PASSWORD_RULE = "Password needs 6+ characters with an uppercase letter, a lowercase letter and a number (no spaces).";

export const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());

const list = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

// Say exactly what is wrong with a new password instead of repeating the whole rule.
export function passwordProblem(password) {
  if (/\s/.test(password)) return "Password can't contain spaces (check for one at the end).";
  const missing = [];
  if (password.length < 6) missing.push("at least 6 characters");
  if (!/[A-Z]/.test(password)) missing.push("an uppercase letter");
  if (!/[a-z]/.test(password)) missing.push("a lowercase letter");
  if (!/[0-9]/.test(password)) missing.push("a number");
  return missing.length ? `Password still needs ${list(missing)}.` : null;
}

/**
 * Returns an error message, or null when the input is fine.
 * The password strength rule only applies when creating an account: on sign-in we must not
 * block someone whose existing password predates (or differs from) today's rule.
 */
export const Validate = (email, password, { isSignUp = true } = {}) => {
  if (!isEmailValid(email)) return "Enter a valid email address.";
  if (!password) return "Enter your password.";
  if (isSignUp) return passwordProblem(password);
  return null;
};
