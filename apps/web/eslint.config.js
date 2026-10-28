import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat"; //  flat version of eslint-config-prettier

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Disabling eslint on some shadcn components at the moment because they are not following the rules of react-hooks and react-refresh. This is a temporary solution until i decide to fully refactor the frontend 
    files: ["src/shared/components/ui/**", "src/shared/animate-ui/**"],
    rules: {
      "react-refresh/only-export-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
    },
  },
  eslintConfigPrettier,
]);
