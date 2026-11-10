import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["src/**/*.ts"], rules: { "no-console": "error" } },
  {
    files: ["src/scripts/**/*.ts", "src/db/seeds/run.ts"],
    rules: { "no-console": "off" },
  },
);
