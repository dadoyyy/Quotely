import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Money is integer centavos and rounds half up in exactly one place (src/lib/money.ts).
  {
    files: ["src/lib/pricing/**/*.ts", "src/lib/money.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "round", message: "Use mulDivHalfUp from src/lib/money.ts." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
