import { expect, test } from "bun:test";
import { SERVICE_NAME } from "../src/index";

test("service name", () => {
  expect(SERVICE_NAME).toBe("web");
});
