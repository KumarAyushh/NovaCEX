// engine settings, read from env vars once at startup (P0.6).
// Snapshot timing vars arrive in P5.
import { env, parseEnv, type Env } from "@novacex/shared";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: env.nodeEnv,
  LOG_LEVEL: env.logLevel,
  // Command log, events and snapshots all live in Redis.
  REDIS_URL: env.redisUrl,
});

export type Config = z.infer<typeof schema>;

/** Throws ConfigError if a var is missing or invalid. */
export function loadConfig(source: Env = process.env): Config {
  return parseEnv(schema, source);
}
