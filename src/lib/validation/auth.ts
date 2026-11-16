import { z } from "zod";
import { firstPasswordProblem, PASSWORD_MAX } from "@/lib/password";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    password: z.string().max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`),
    confirmPassword: z.string(),
  })
  .superRefine((v, ctx) => {
    const problem = firstPasswordProblem(v.password);
    if (problem) ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    if (v.confirmPassword !== v.password) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match" });
  });

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(200, "Keep it under 200 characters"),
});
