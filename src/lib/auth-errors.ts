export function isInviteOnlySignupError(error: { message: string }) {
  return /signup_not_allowed|database error saving new user/i.test(error.message);
}

export function signInLinkErrorMessage(error: { message: string }) {
  return isInviteOnlySignupError(error)
    ? "Brambly is invite-only right now. If you have been invited, use the email address you were invited with."
    : "We couldn't send the link. Please try again in a minute.";
}