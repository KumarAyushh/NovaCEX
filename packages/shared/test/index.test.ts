import { expect, test } from "bun:test";
import { VERSION } from "../src/index";

// Trivial P0 test: proves the test runner and TypeScript setup work.
test("exports a semver version", () => {
  expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
});
