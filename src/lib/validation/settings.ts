import { z } from "zod";
import { parsePercentToBps } from "../money-format";
import { emptyToNull, optionalText } from "./form";

const prefix = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{1,8}$/, "Use 1 to 8 letters or numbers"));

export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(200),
  email: z.preprocess(emptyToNull, z.email("Enter a valid email address").max(254).nullable()),
  phone: optionalText(50),
  address: optionalText(500),
  tin: optionalText(50),
  vatRateBps: z.string().transform((raw, ctx) => {
    const bps = parsePercentToBps(raw);
    if (bps === null || bps > 10_000) {
      ctx.addIssue({ code: "custom", message: "Enter a rate from 0 to 100" });
      return z.NEVER;
    }
    return bps;
  }),
  defaultValidityDays: z.coerce
    .number({ error: "Enter a number of days" })
    .int("Whole days only")
    .min(1, "At least 1 day")
    .max(365, "At most 365 days"),
  defaultTerms: optionalText(5000),
  quoteNumberPrefix: prefix,
  invoiceNumberPrefix: prefix,
});

export type SettingsInput = z.output<typeof settingsSchema>;
