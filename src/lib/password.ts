/** Password rules shared by the sign-up form (live checklist) and the server (the real check). */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "symbol", label: "A symbol, like ! or @", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const PASSWORD_MAX = 72; // bcrypt ignores anything past 72 bytes

/** How many rules a password meets, 0 to 5. */
export function passwordScore(p: string): number {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}

/** The first unmet rule's wording, or null when the password passes every rule. */
export function firstPasswordProblem(p: string): string | null {
  const miss = PASSWORD_RULES.find((r) => !r.test(p));
  return miss ? `Password needs ${miss.label.charAt(0).toLowerCase()}${miss.label.slice(1)}` : null;
}
