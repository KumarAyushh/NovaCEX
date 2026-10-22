// apps/api: REST API. Auth, validation and rate limits; turns HTTP requests into engine commands and queries; serves history from Postgres.
//
// P0 skeleton. It only proves the workspace wiring works (it can import
// @novacex/shared) and prints its name. The Express app arrives in P4.
import { VERSION } from "@novacex/shared";

export const SERVICE_NAME = "api";

// import.meta.main is true only when this file is run directly
// (`bun src/index.ts`), not when a test imports it, so tests stay silent.
if (import.meta.main) {
  console.log(`NovaCEX ${SERVICE_NAME} (shared v${VERSION})`);
}
