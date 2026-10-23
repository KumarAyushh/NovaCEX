// @novacex/db: the Postgres schema (Prisma), its migrations and the shared client.
//
// Only api and persister use this package. The engine never touches Postgres:
// its state lives in memory and in the Redis command log.
//
// Layout of this package:
//   prisma/schema.prisma   the tables (source of truth for the SQL)
//   prisma/migrations/     committed SQL, one folder per schema change
//   prisma.config.ts       CLI settings (where the schema/migrations live, DB url)
//   generated/prisma/      TypeScript client built from the schema (gitignored;
//                          rebuild with `bun run generate`)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export { Prisma, PrismaClient } from "../generated/prisma/client";
export type { User } from "../generated/prisma/client";


export function createDb(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
