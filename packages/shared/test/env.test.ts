// Tests for the shared env helpers used by every app's config.ts (P0.6).
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { ConfigError, env, parseEnv } from "../src/env";

// A small schema built from the shared pieces, like an app would write.
const schema = z.object({
  NODE_ENV: env.nodeEnv,
  PORT: env.port(3000),
  REDIS_URL: env.redisUrl,
  DATABASE_URL: env.postgresUrl,
  SECRET: env.secret,
  FLAG: env.bool(false),
});

const valid = {
  REDIS_URL: "redis://127.0.0.1:6380",
  DATABASE_URL: "postgresql://u:p@127.0.0.1:5433/db",
  SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  test("applies defaults and coerces strings", () => {
    const cfg = parseEnv(schema, { ...valid, PORT: "8080", FLAG: "true" });
    expect(cfg.NODE_ENV).toBe("development");
    expect(cfg.PORT).toBe(8080);
    expect(cfg.FLAG).toBe(true);
  });

  test("uses defaults when optional vars are absent", () => {
    const cfg = parseEnv(schema, valid);
    expect(cfg.PORT).toBe(3000);
    expect(cfg.FLAG).toBe(false);
  });

  test("ignores unrelated vars (process.env has many)", () => {
    const cfg = parseEnv(schema, { ...valid, HOME: "/root" });
    expect("HOME" in cfg).toBe(false);
  });

  test("lists every bad var in one error", () => {
    let err: unknown;
    try {
      parseEnv(schema, { PORT: "abc" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConfigError);
    const msg = (err as Error).message;
    for (const name of ["PORT", "REDIS_URL", "DATABASE_URL", "SECRET"]) {
      expect(msg).toContain(name);
    }
  });

  test("never prints values (they may be secrets)", () => {
    const short = "hunter2-too-short";
    expect(() => parseEnv(schema, { ...valid, SECRET: short })).toThrow(ConfigError);
    try {
      parseEnv(schema, { ...valid, SECRET: short });
    } catch (e) {
      expect((e as Error).message).not.toContain(short);
    }
  });
});

describe("env pieces", () => {
  test("port rejects 0, 65536, empty and non-integers", () => {
    for (const bad of ["0", "65536", "", "3.5"]) {
      expect(env.port(1).safeParse(bad).success).toBe(false);
    }
  });

  test("redisUrl / postgresUrl check the scheme", () => {
    expect(env.redisUrl.safeParse("rediss://h:1").success).toBe(true);
    expect(env.redisUrl.safeParse("http://h:1").success).toBe(false);
    expect(env.postgresUrl.safeParse("postgres://u@h/db").success).toBe(true);
    expect(env.postgresUrl.safeParse("mysql://u@h/db").success).toBe(false);
  });

  test("bool accepts true/false words, rejects junk", () => {
    expect(env.bool(false).parse("false")).toBe(false);
    expect(env.bool(false).parse("1")).toBe(true);
    expect(env.bool(false).safeParse("maybe").success).toBe(false);
  });

  test("list splits on commas and trims", () => {
    expect(env.urlList.parse(" http://a.com , http://b.com,")).toEqual(["http://a.com", "http://b.com"]);
    expect(env.urlList.safeParse("not a url").success).toBe(false);
  });
});
