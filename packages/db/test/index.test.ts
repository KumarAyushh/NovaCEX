// Tests for @novacex/db against the real Postgres from docker-compose
// (`make up`). They need DATABASE_URL: locally it comes from the root .env
// (the `test` script passes --env-file), in CI from the job's environment.
//
// Each test run uses its own random username prefix and deletes only those
// rows afterwards, so the suite never touches anyone else's data and can
// run repeatedly against a dev database.
import { afterAll, describe, expect, test } from "bun:test";
import { Prisma, createDb } from "../src/index";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Fail loudly instead of skipping: a silently skipped DB suite looks green.
  throw new Error("DATABASE_URL is not set. Run `make up` and see .env.example.");
}

const db = createDb(databaseUrl);
const prefix = `test_${crypto.randomUUID().slice(0, 8)}_`;

afterAll(async () => {
  await db.user.deleteMany({ where: { username: { startsWith: prefix } } });
  await db.$disconnect();
});

describe("createDb", () => {
  test("does not connect until the first query", async () => {
    // An unreachable port: constructing must still succeed, because the pool
    // is lazy. Apps rely on this to build their dependencies before Postgres
    // is up and report connection errors from the health check instead.
    const offline = createDb("postgresql://nobody:nothing@127.0.0.1:1/none");
    expect(offline).toBeDefined();
    await offline.$disconnect();
  });
});

describe("users table (migration init_users)", () => {
  test("creates a user with a generated UUIDv7 id and created_at", async () => {
    const before = new Date();
    const user = await db.user.create({
      data: { username: `${prefix}alice`, passwordHash: "not-a-real-hash" },
    });

    // UUIDv7: the version nibble (first char of the 3rd group) is "7".
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  test("username is unique (signup conflict -> 409 in P4.2 relies on this)", async () => {
    const username = `${prefix}bob`;
    await db.user.create({ data: { username, passwordHash: "h1" } });

    // P2002 is Prisma's code for a unique-constraint violation. The api will
    // map exactly this error to `409 conflict` and everything else to 500.
    // (Prisma returns a lazy "PrismaPromise" that runs only when awaited, so
    // we await it and capture the error rather than using expect().rejects.)
    const error: unknown = await db.user.create({ data: { username, passwordHash: "h2" } }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(error).toMatchObject({ code: "P2002" });
  });
});
