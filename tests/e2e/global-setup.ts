import { seed } from "../../scripts/seed";

/** Reset the app database to the deterministic demo data before the suite. */
export default async function globalSetup() {
  await seed(process.env.DATABASE_URL);
}
