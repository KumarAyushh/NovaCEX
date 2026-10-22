// @novacex/db: the Postgres schema (Prisma), its migrations and the shared client.
//
// Placeholder for now. The next step (P0.4/P0.5) adds Postgres in Docker,
// prisma/schema.prisma with the `User` model and the first migration; then
// this file will export the Prisma client. Only api and persister use it.
// The engine never touches Postgres.

export const DB_PACKAGE = "@novacex/db";
