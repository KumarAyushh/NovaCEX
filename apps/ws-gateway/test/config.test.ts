// ws-gateway config: required vars and defaults (P0.6).
import { expect, test } from "bun:test";
import { ConfigError } from "@novacex/shared";
import { loadConfig } from "../src/config";

test("valid env -> config with defaults", () => {
  const cfg = loadConfig({ REDIS_URL: "redis://127.0.0.1:6380" });
  expect(cfg.PORT).toBe(8080);
});

test("bad PORT -> ConfigError", () => {
  expect(() => loadConfig({ REDIS_URL: "redis://h:1", PORT: "99999" })).toThrow(ConfigError);
});
