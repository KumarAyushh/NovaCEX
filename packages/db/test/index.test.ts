import { expect, test } from "bun:test";
import { DB_PACKAGE } from "../src/index";

test("package loads", () => {
  expect(DB_PACKAGE).toBe("@novacex/db");
});
