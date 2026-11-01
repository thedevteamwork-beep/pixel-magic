import { createDb } from "../db/knex.js";
import { insertGrant } from "../db/repositories/credits.repo.js";
import { addDays } from "../lib/time.js";

async function main(): Promise<void> {
  const [userId, n, days] = process.argv.slice(2);
  const total = Number(n);
  const validDays = Number(days);
  if (
    !userId ||
    !Number.isInteger(total) ||
    total <= 0 ||
    !Number.isInteger(validDays) ||
    validDays <= 0
  ) {
    process.stderr.write(
      "Usage: npm run credits:grant -- <userId> <n> <days>\n",
    );
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write("DATABASE_URL is required\n");
    process.exit(1);
  }
  const db = createDb(url, 1);
  try {
    const now = new Date();
    const grant = await insertGrant(db, {
      user_id: userId,
      kind: "manual",
      total,
      starts_at: now,
      expires_at: addDays(now, validDays),
      created_at: now,
      note: "manual grant via CLI",
    });
    process.stdout.write(`${grant.id}\n`);
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
