import { createDb } from "../knex.js";
import { seedCatalog } from "./catalog.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const db = createDb(url, 1);
try {
  await seedCatalog(db);
  console.log("Catalog seeded");
} finally {
  await db.destroy();
}
