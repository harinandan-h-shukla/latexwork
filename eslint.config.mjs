import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
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
    // shadcn/ui vendored primitives - generated, not hand-maintained.
    "components/ui/**",
    "hooks/use-mobile.ts",
    // vendored static assets, not source.
    "public/**",
    // separate standalone package with its own tsconfig/lint, never bundled by Next.js.
    "local-agent/**",
    "cloud-compiler/**",
  ]),
]);

export default eslintConfig;
