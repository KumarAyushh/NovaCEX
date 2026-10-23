// Prisma CLI configuration (P0.5). Read by every `prisma ...` command run
// from this package (generate, migrate, studio). Application code never
// imports this file; it gets its connection string from its own config.
//
// Where DATABASE_URL comes from:
//   locally  the root `.env` (gitignored). The package scripts start Prisma
//            through `bun --env-file=../../.env`, and Bun expands the
//            ${POSTGRES_*} references in that file into a full URL.
//   CI/prod  a real environment variable set by the runner / container.
//            There is no `.env` there and none is needed.
//
// This file must never contain a URL, user or password itself.
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // SQL migrations are committed: they are the reviewed history of every
    // change to the database, applied in order by `prisma migrate deploy`.
    path: "prisma/migrations",
  },
  // Read with plain process.env rather than Prisma's `env()` helper:
  // `env()` throws when the variable is missing, which would break
  // `prisma generate` in CI even though generating the client never
  // connects to a database. Commands that DO connect (migrate, studio)
  // fail with a clear "no datasource url" error when it is unset.
  // The spread adds `datasource` only when there is a url, because the
  // type allows `url` to be absent but not `undefined`
  // (exactOptionalPropertyTypes in tsconfig.base.json).
  ...(url ? { datasource: { url } } : {}),
});
