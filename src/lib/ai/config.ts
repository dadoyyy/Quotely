/** AI drafting needs the org to opt in, the key to exist, and no global kill switch. */
export const aiAvailable = (orgAiEnabled: boolean) =>
  orgAiEnabled && process.env.AI_ENABLED !== "false" && Boolean(process.env.GEMINI_API_KEY);
