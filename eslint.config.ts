import { defineConfig } from "@coderwyd/eslint-config";
export default defineConfig({
  rules: {
    "func-style": ["warn", "expression", { allowArrowFunctions: true }],
    "antfu/top-level-function": ["off"],
  },
});
