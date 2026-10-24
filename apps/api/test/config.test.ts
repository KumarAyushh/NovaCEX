// api config: required vars, defaults and value checks (P0.6).
import { expect, test } from "bun:test";
import { ConfigError } from "@novacex/shared";
import { loadConfig } from "../src/config";

const valid = {
  REDIS_URL: "redis://127.0.0.1:6380",
  DATABASE_URL: "postgresql://u:p@127.0.0.1:5433/db",
  JWT_ACCESS_SECRET: "s".repeat(32),
};

test("valid env -> config with defaults", () => {
  const cfg = loadConfig(valid);
  expect(cfg.PORT).toBe(3000);
  expect(cfg.ENABLE_FAUCET).toBe(false);
  expect(cfg.ENGINE_TIMEOUT_MS).toBe(5000);
  expect(cfg.CORS_ORIGINS).toEqual(["http://localhost:5173"]);
});

test("overrides are parsed", () => {
  const cfg = loadConfig({ ...valid, PORT: "4000", ENABLE_FAUCET: "true", CORS_ORIGINS: "https://a.io,https://b.io" });
  expect(cfg.PORT).toBe(4000);
  expect(cfg.ENABLE_FAUCET).toBe(true);
  expect(cfg.CORS_ORIGINS).toEqual(["https://a.io", "https://b.io"]);
});

test("missing required vars -> ConfigError naming each", () => {
  expect(() => loadConfig({})).toThrow(ConfigError);
  expect(() => loadConfig({})).toThrow(/REDIS_URL[\s\S]*DATABASE_URL[\s\S]*JWT_ACCESS_SECRET/);
});

test("short JWT secret is rejected", () => {
  expect(() => loadConfig({ ...valid, JWT_ACCESS_SECRET: "short" })).toThrow(/JWT_ACCESS_SECRET/);
});
