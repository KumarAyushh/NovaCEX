// apps/ws-gateway: WebSocket fan-out of public market data (depth, trades, ticker, klines) and the private user channel.
//
// P0 skeleton. It only proves the workspace wiring works (it can import
// @novacex/shared) and prints its name. The ws server arrives in P7.
import { exitOnConfigError, VERSION } from "@novacex/shared";
import { loadConfig } from "./config";

export const SERVICE_NAME = "ws-gateway";

// import.meta.main is true only when this file is run directly
// (`bun src/index.ts`), not when a test imports it, so tests stay silent.
if (import.meta.main) {
  // Bad or missing env var: print why and exit 1 before doing anything.
  const config = exitOnConfigError(SERVICE_NAME, () => loadConfig());
  console.log(`NovaCEX ${SERVICE_NAME} (shared v${VERSION}) port=${config.PORT}`);
}
