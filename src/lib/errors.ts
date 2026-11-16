/** Turn a database error into something a person can act on. Details go to the server log, not the screen. */
export function friendlyError(error: { code?: string; message?: string }, subject = "item"): string {
  const msg = error.message ?? "";
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return "You don't have permission to do that.";
  }
  if (error.code === "23503") return `This ${subject} is still in use, so it can't be removed.`;
  if (error.code === "23505") return `That ${subject} already exists.`;
  if (error.code === "23514") return "That change isn't allowed.";
  if (error.code === "22P02") return "That request wasn't valid.";
  console.error("[db]", error.code, msg);
  return "Something went wrong. Please try again.";
}
