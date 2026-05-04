export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "revert",
        "ci",
      ],
    ],
    "scope-enum": [
      1,
      "always",
      ["backend", "frontend", "cli", "desktop", "design", "docker", "proto", "deps"],
    ],
  },
};
