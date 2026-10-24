// apps/engine: the matching engine. A single-threaded, deterministic state machine that owns balances, order books, matching and fees.
//
// P0 skeleton. It only proves the workspace wiring works (it can import
// @novacex/shared) and prints its name. The pure core arrives in P2 and the Redis consumer loop in P3.
import { exitOnConfigError, VERSION } from "@novacex/shared";
import { loadConfig } from "./config";

export const SERVICE_NAME = "engine";

// import.meta.main is true only when this file is run directly
// (`bun src/index.ts`), not when a test imports it, so tests stay silent.
if (import.meta.main) {
  // Bad or missing env var: print why and exit 1 before doing anything.
  const config = exitOnConfigError(SERVICE_NAME, () => loadConfig());
  console.log(`NovaCEX ${SERVICE_NAME} (shared v${VERSION}) env=${config.NODE_ENV}`);
}
