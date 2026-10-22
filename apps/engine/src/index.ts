// apps/engine: the matching engine. A single-threaded, deterministic state machine that owns balances, order books, matching and fees.
//
// P0 skeleton. It only proves the workspace wiring works (it can import
// @novacex/shared) and prints its name. The pure core arrives in P2 and the Redis consumer loop in P3.
import { VERSION } from "@novacex/shared";

export const SERVICE_NAME = "engine";

// import.meta.main is true only when this file is run directly
// (`bun src/index.ts`), not when a test imports it, so tests stay silent.
if (import.meta.main) {
  console.log(`NovaCEX ${SERVICE_NAME} (shared v${VERSION})`);
}
