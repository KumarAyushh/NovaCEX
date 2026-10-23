// ESLint flat config for the whole monorepo (P0.3).
//
// One config at the root. Each workspace runs `eslint .` from its own folder,
// and ESLint looks upward from every linted file to find this file.
//
// Layers, applied in order (later ones win):
//   1. @eslint/js recommended       plain-JS bug patterns
//   2. typescript-eslint, type-aware  rules that need the type checker, e.g.
//      no-floating-promises: a forgotten `await` on a Redis XADD would let
//      the engine ack a command before its events are written.
//   3. project rules                 the few choices specific to NovaCEX
//   4. eslint-config-prettier        turns off every style rule, so formatting
//      is Prettier's job alone and the two tools never disagree.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Never lint dependencies, build output or generated code.
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.turbo/**",
      "packages/db/generated/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      // Bun provides Node-style globals (process, Buffer, ...).
      globals: { ...globals.node },
      parserOptions: {
        // projectService finds the nearest tsconfig.json for each file,
        // so every package is checked with its own settings.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `import type` keeps type-only imports out of the runtime bundle
      // (pairs with verbatimModuleSyntax in tsconfig.base.json).
      "@typescript-eslint/consistent-type-imports": "error",
      // An unused variable is usually a bug or dead code. A leading
      // underscore marks one as intentionally unused.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Strict boolean checks on `==` stop `0n == "0"` style surprises.
      eqeqeq: ["error", "always"],
      // Services log through pino from P3 on (P3.5). Allowed for now:
      // the P0 skeletons print their name.
      "no-console": "off",
    },
  },

  // Plain JS config files (like this one) are not in any tsconfig,
  // so type-aware rules cannot run on them.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
);
