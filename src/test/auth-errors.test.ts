import { describe, expect, it } from "vitest";
import { isInviteOnlySignupError } from "../lib/auth-errors";

describe("invite-only signup error classification", () => {
  it("recognizes the trigger's signup rejection", () => {
    expect(isInviteOnlySignupError({ message: "signup_not_allowed" })).toBe(true);
  });
  it("recognizes the authentication service's wrapped signup rejection", () => {
    expect(isInviteOnlySignupError({ message: "Database error saving new user" })).toBe(true);
  });
  it("does not classify other sign-in errors as invitation failures", () => {
    expect(isInviteOnlySignupError({ message: "Email rate limit exceeded" })).toBe(false);
  });
});