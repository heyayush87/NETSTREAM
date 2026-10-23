import { Validate, isEmailValid } from "./Validate";
import { friendlyAuthError } from "./authErrors";

describe("email", () => {
  test.each(["ayush@gmail.com", "ayush+tag@gmail.com", "first.last@company.co.in", "a_b-c@sub.domain.org"])("accepts %s", (e) => {
    expect(isEmailValid(e)).toBe(true);
  });
  test.each(["", "plain", "a@b", "a b@c.com", "@x.com", "a@.com"])("rejects %p", (e) => {
    expect(isEmailValid(e)).toBe(false);
  });
});

describe("sign-up password rule (6+ chars, upper, lower, number, no spaces)", () => {
  test.each(["Abc123", "Abc1234", "Abcdefg1"])("accepts %s", (p) => {
    expect(Validate("a@b.co", p, { isSignUp: true })).toBeNull();
  });
  test.each([
    ["Abc12", "Password still needs at least 6 characters."],
    ["abc12345", "Password still needs an uppercase letter."],
    ["ABC12345", "Password still needs a lowercase letter."],
    ["Abcdefgh", "Password still needs a number."],
    ["abcdefgh", "Password still needs an uppercase letter and a number."],
    ["abc", "Password still needs at least 6 characters, an uppercase letter and a number."],
  ])("%s -> names exactly what is missing", (p, message) => {
    expect(Validate("a@b.co", p, { isSignUp: true })).toBe(message);
  });
  test("a space (e.g. a trailing one) gets its own message", () => {
    expect(Validate("a@b.co", "Abc1234 ", { isSignUp: true })).toMatch(/can't contain spaces/);
    expect(Validate("a@b.co", "Abc 1234", { isSignUp: true })).toMatch(/can't contain spaces/);
  });
});

describe("sign-in", () => {
  test("does not apply the strength rule, so existing simple passwords can log in", () => {
    expect(Validate("a@b.co", "abc", { isSignUp: false })).toBeNull();
  });
  test("still needs a valid email and some password", () => {
    expect(Validate("bad", "x", { isSignUp: false })).toMatch(/valid email/);
    expect(Validate("a@b.co", "", { isSignUp: false })).toMatch(/password/i);
  });
});

describe("friendlyAuthError", () => {
  test("maps known Firebase codes to plain messages", () => {
    expect(friendlyAuthError({ code: "auth/invalid-credential" })).toBe("Incorrect email or password.");
    expect(friendlyAuthError({ code: "auth/email-already-in-use" })).toMatch(/already exists/);
    expect(friendlyAuthError({ code: "auth/too-many-requests" })).toMatch(/Too many attempts/);
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toMatch(/Network/);
  });
  test("never leaks raw Firebase text for unknown errors", () => {
    expect(friendlyAuthError({ code: "auth/whatever", message: "Firebase: Error (auth/whatever)." })).toBe("Something went wrong. Please try again.");
    expect(friendlyAuthError(undefined)).toBe("Something went wrong. Please try again.");
  });
});
