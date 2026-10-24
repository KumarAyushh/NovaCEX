// engine config: required vars and defaults (P0.6).
import { expect, test } from "bun:test";
import { ConfigError } from "@novacex/shared";
import { loadConfig } from "../src/config";

test("valid env -> config with defaults", () => {
  const cfg = loadConfig({ REDIS_URL: "redis://127.0.0.1:6380" });
  expect(cfg.REDIS_URL).toBe("redis://127.0.0.1:6380");
  expect(cfg.LOG_LEVEL).toBe("info");
});

test("missing REDIS_URL -> ConfigError", () => {
  expect(() => loadConfig({})).toThrow(ConfigError);
  expect(() => loadConfig({})).toThrow(/REDIS_URL/);
});
