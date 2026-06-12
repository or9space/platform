import js from "@eslint/js";
import tseslint from "typescript-eslint";
import noUntenantedQuery from "./eslint-rules/no-untenanted-query.js";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // CJS files: eslint-rules and eslint test files use CommonJS
  {
    files: ["eslint-rules/**/*.js", "tests/eslint/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly", console: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    plugins: {
      or9: { rules: { "no-untenanted-query": noUntenantedQuery } },
    },
    rules: {
      "or9/no-untenanted-query": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
