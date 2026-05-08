import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import js from "@eslint/js";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import securityPlugin from "eslint-plugin-security";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    plugins: {
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "@typescript-eslint": tsPlugin,
      "sonarjs": sonarjsPlugin,
      "security": securityPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // ESLint built-in recommended (unused vars, unreachable code, etc.)
      ...js.configs.recommended.rules,

      // TypeScript recommended (overrides some JS rules for TS-awareness)
      ...tsPlugin.configs["flat/recommended"]
        .filter((c) => c.rules)
        .reduce((acc, c) => ({ ...acc, ...c.rules }), {}),

      // React recommended
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat["jsx-runtime"].rules,

      // Next.js
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // SonarJS – clean code & cognitive complexity
      ...sonarjsPlugin.configs.recommended.rules,

      // Security
      ...securityPlugin.configs.recommended.rules,

      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Relax some rules that are too strict for this codebase
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",

      // detect-object-injection is too noisy for data-driven apps with known-safe bracket access
      "security/detect-object-injection": "off",

      // Downgrade structural sonarjs rules to warnings (require significant refactoring)
      "sonarjs/no-nested-conditional": "warn",
      "sonarjs/no-nested-functions": "warn",
      "sonarjs/cognitive-complexity": ["warn", 15],

      // Built-in complexity / clean code
      "complexity": ["warn", 20],
      "max-depth": ["warn", 4],
      "max-lines-per-function": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", 5],
    },
    settings: {
      react: { version: "detect" },
    },
  },
];

export default eslintConfig;
