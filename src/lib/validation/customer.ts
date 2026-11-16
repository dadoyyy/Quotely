import { z } from "zod";
import { checkbox, emptyToNull, optionalText } from "./form";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Keep it under 200 characters"),
  company: optionalText(200),
  email: z.preprocess(emptyToNull, z.email("Enter a valid email address").max(254).nullable()),
  phone: optionalText(50),
  address: optionalText(500),
  tin: optionalText(50),
  isVatExempt: checkbox,
  notes: optionalText(2000),
});

export type CustomerInput = z.output<typeof customerSchema>;
