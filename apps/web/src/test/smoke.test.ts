import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("is running", () => {
    expect(true).toBe(true);
  });
});

// used to test that husky pre-commit fails on test failure
// it("fails on purpose", () => {
//   expect(true).toBe(false);
// });