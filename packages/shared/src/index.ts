// @novacex/shared: code used by every service.
//
// Each app imports from "@novacex/shared" (never from a deep path), so this file
// is the package's public surface. In P1 it will also re-export:
//   numbers.ts   exact bigint money math (decimal string <-> atoms, lots, ticks)
//   markets.ts   market config loaded from markets.json and validated
//   schemas.ts   Zod schemas for REST bodies, commands and events
//   protocol.ts  Command / Reply / Query / Event types and stream names

/** Version of the shared package; services log it at startup. */
export const VERSION = "0.0.0";

export * from "./env";
