// persister config: required vars and defaults (P0.6).
import { expect, test } from "bun:test";
import { ConfigError } from "@novacex/shared";
import { loadConfig } from "../src/config";

test("valid env -> config with defaults", () => {
  const cfg = loadConfig({
    REDIS_URL: "redis://127.0.0.1:6380",
    DATABASE_URL: "postgresql://u:p@127.0.0.1:5433/db",
  });
  expect(cfg.NODE_ENV).toBe("development");
});

test("missing vars -> ConfigError naming each", () => {
  expect(() => loadConfig({})).toThrow(ConfigError);
  expect(() => loadConfig({})).toThrow(/REDIS_URL[\s\S]*DATABASE_URL/);
});
