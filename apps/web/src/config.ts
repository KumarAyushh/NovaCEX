// web settings (P0.6). Names start with VITE_ because Vite (P9) only
// exposes those to the browser; there we will pass import.meta.env instead.
import { parseEnv, type Env } from "@novacex/shared";
import { z } from "zod";

const schema = z.object({
  // Base URL of the REST api.
  VITE_API_URL: z.url({ protocol: /^https?$/ }),
  // URL of the ws-gateway.
  VITE_WS_URL: z.url({ protocol: /^wss?$/ }),
});

export type Config = z.infer<typeof schema>;

/** Throws ConfigError if a var is missing or invalid. */
export function loadConfig(source: Env = process.env): Config {
  return parseEnv(schema, source);
}
