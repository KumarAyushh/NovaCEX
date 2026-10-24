// web config: API and WebSocket URLs (P0.6).
import { expect, test } from "bun:test";
import { ConfigError } from "@novacex/shared";
import { loadConfig } from "../src/config";

test("valid env -> config", () => {
  const cfg = loadConfig({ VITE_API_URL: "http://localhost:3000", VITE_WS_URL: "ws://localhost:8080" });
  expect(cfg.VITE_WS_URL).toBe("ws://localhost:8080");
});

test("WS url must be ws:// or wss://", () => {
  expect(() => loadConfig({ VITE_API_URL: "http://localhost:3000", VITE_WS_URL: "http://localhost:8080" })).toThrow(
    ConfigError,
  );
});
