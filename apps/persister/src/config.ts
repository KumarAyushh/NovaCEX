// persister settings, read from env vars once at startup (P0.6).
import { env, parseEnv, type Env } from "@novacex/shared";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: env.nodeEnv,
  LOG_LEVEL: env.logLevel,
  // Reads events from Redis, writes history to Postgres.
  REDIS_URL: env.redisUrl,
  DATABASE_URL: env.postgresUrl,
});

export type Config = z.infer<typeof schema>;

/** Throws ConfigError if a var is missing or invalid. */
export function loadConfig(source: Env = process.env): Config {
  return parseEnv(schema, source);
}
