// Env var checks shared by every app's config.ts (P0.6).
// An app lists its vars as a Zod schema; a missing or bad var stops it at startup.
import { z } from "zod";

/** Thrown when env vars are missing or invalid. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/** Same shape as process.env: each value is a string or missing. */
export type Env = Record<string, string | undefined>;

/** Building blocks for app schemas. Env values are strings; these convert them. */
export const env = {
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  /** Port 1..65535. */
  port: (fallback: number) => z.coerce.number().int().min(1).max(65535).default(fallback),

  /** Whole number > 0, e.g. a timeout in ms. */
  positiveInt: (fallback: number) => z.coerce.number().int().positive().default(fallback),

  redisUrl: z.url({ protocol: /^rediss?$/ }),
  postgresUrl: z.url({ protocol: /^postgres(ql)?$/ }),

  /** No default; at least 32 chars so it is hard to guess. */
  secret: z.string().min(32),

  /** Accepts true/false, 1/0, yes/no, on/off. */
  bool: (fallback: boolean) => z.stringbool().default(fallback),

  /** "http://a.com,http://b.com" -> ["http://a.com", "http://b.com"]. */
  urlList: z
    .string()
    .transform((s) =>
      s
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== ""),
    )
    .pipe(z.array(z.url())),
};

/** Checks `source` against `schema`. Throws one ConfigError listing every bad var. */
export function parseEnv<S extends z.ZodType>(schema: S, source: Env): z.infer<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  // Print the var name and reason only, never the value (it may be a secret).
  const lines = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  throw new ConfigError(`Invalid environment:\n${lines.join("\n")}`);
}

/** Runs `load()`. On a ConfigError: prints it and exits with code 1. */
export function exitOnConfigError<T>(service: string, load: () => T): T {
  try {
    return load();
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e;
    console.error(`[${service}] ${e.message}`);
    process.exit(1);
  }
}
