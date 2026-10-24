// api settings, read from env vars once at startup (P0.6).
import { env, parseEnv, type Env } from "@novacex/shared";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: env.nodeEnv,
  LOG_LEVEL: env.logLevel,
  PORT: env.port(3000),
  REDIS_URL: env.redisUrl,
  DATABASE_URL: env.postgresUrl,
  // Signs access tokens (P4.2). Anyone who has it can log in as any user.
  JWT_ACCESS_SECRET: env.secret,
  // Browser origins allowed to call the api (P4.1). Default: Vite dev server.
  CORS_ORIGINS: env.urlList.default(["http://localhost:5173"]),
  // Free test funds (P4.4). Off unless turned on.
  ENABLE_FAUCET: env.bool(false),
  // Wait this long for the engine's reply, then answer 504 (P4.3).
  ENGINE_TIMEOUT_MS: env.positiveInt(5000),
});

export type Config = z.infer<typeof schema>;

/** Throws ConfigError if a var is missing or invalid. */
export function loadConfig(source: Env = process.env): Config {
  return parseEnv(schema, source);
}
