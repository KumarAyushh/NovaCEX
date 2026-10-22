// apps/web: React trading UI.
//
// P0 skeleton. It only proves the workspace wiring works (it can import
// @novacex/shared) and prints its name. It becomes a Vite + React app in P9.
import { VERSION } from "@novacex/shared";

export const SERVICE_NAME = "web";

// import.meta.main is true only when this file is run directly
// (`bun src/index.ts`), not when a test imports it, so tests stay silent.
if (import.meta.main) {
  console.log(`NovaCEX ${SERVICE_NAME} (shared v${VERSION})`);
}
