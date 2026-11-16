/** Result of sending a quote or making a new link. `link` is shown once; only its hash is stored. */
export type ShareState = {
  ok?: boolean;
  error?: string;
  link?: string;
  number?: string;
  /** Address the link was emailed to. */
  emailedTo?: string;
  /** The quote was sent, but the email wasn't. Says why. */
  emailError?: string;
};
