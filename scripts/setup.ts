/**
 * One-command local setup. Runs automatically before `npm run dev`, and can be
 * run on its own with `npm run setup` (add `-- --reset` to reload demo data).
 *
 * It fixes the usual first-run problems so you don't have to:
 *   1. Creates .env from .env.example and generates SESSION_SECRET.
 *   2. Finds a running Postgres, trying the configured user, then the
 *      "postgres" user (Docker), then your computer's username (Homebrew).
 *      If none is running, it starts one with Docker or Homebrew when it can.
 *   3. Creates the app and test databases if they're missing, and saves the
 *      working connection details in .env.
 *   4. Applies migrations and loads demo data into an empty database.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env");
const EXAMPLE_PATH = resolve(ROOT, ".env.example");
const APP_DB = "shipwright";
const TEST_DB = "shipwright_test";

const args = new Set(process.argv.slice(2));
const quiet = args.has("--quiet");
const reset = args.has("--reset");

const log = (msg: string) => console.log(`  ${msg}`);
const step = (msg: string) => !quiet && log(msg);

class SetupError extends Error {}

// ---------------------------------------------------------------- .env file

function readEnv(): Map<string, string> {
  const env = new Map<string, string>();
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env.set(m[1], m[2].replace(/^["']|["']$/g, ""));
  }
  return env;
}

/** Sets keys in .env, keeping comments and the order of everything else. */
function writeEnv(updates: Record<string, string>) {
  let text = readFileSync(ENV_PATH, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
  }
  writeFileSync(ENV_PATH, text);
}

function ensureEnvFile() {
  if (!existsSync(ENV_PATH)) {
    copyFileSync(EXAMPLE_PATH, ENV_PATH);
    log("Created .env from .env.example");
  }
  const secret = readEnv().get("SESSION_SECRET") ?? "";
  if (secret.length < 32 || secret.startsWith("replace-me")) {
    writeEnv({ SESSION_SECRET: randomBytes(32).toString("base64") });
    log("Generated a SESSION_SECRET");
  }
}

// ---------------------------------------------------------------- Postgres

type Probe = { ok: true } | { ok: false; code: string; message: string };

async function probe(url: string): Promise<Probe> {
  const sql = postgres(url, { max: 1, connect_timeout: 4, onnotice: () => {} });
  try {
    await sql`select 1`;
    return { ok: true };
  } catch (error) {
    const e = error as { code?: string; message?: string };
    return { ok: false, code: e.code ?? "UNKNOWN", message: e.message ?? String(error) };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

/** Same server and credentials, different database name. */
function withDatabase(url: string, database: string) {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

/** Connection URLs to try against the server's built-in "postgres" database. */
function candidateServers(configured: string | undefined) {
  const user = encodeURIComponent(userInfo().username);
  const list = [
    configured && withDatabase(configured, "postgres"),
    "postgres://postgres:postgres@localhost:5432/postgres", // docker compose
    `postgres://${user}@localhost:5432/postgres`, // Homebrew / Postgres.app
    "postgres://postgres@localhost:5432/postgres",
  ].filter(Boolean) as string[];
  return [...new Set(list)];
}

async function findServer(configured: string | undefined) {
  let lastFailure: Probe | undefined;
  for (const url of candidateServers(configured)) {
    const result = await probe(url);
    if (result.ok) return { url, refused: false };
    lastFailure = result;
  }
  const refused =
    !!lastFailure &&
    !lastFailure.ok &&
    /ECONNREFUSED|ENOTFOUND|CONNECT_TIMEOUT|ETIMEDOUT/.test(lastFailure.code + lastFailure.message);
  return { url: null, refused, failure: lastFailure };
}

function has(command: string) {
  try {
    execSync(process.platform === "win32" ? `where ${command}` : `command -v ${command}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function run(command: string) {
  log(`Running: ${command}`);
  execSync(command, { stdio: "inherit", cwd: ROOT });
}

/** Tries to start a local Postgres. Returns true if it attempted to start one. */
function startPostgres(): boolean {
  if (has("docker")) {
    try {
      execSync("docker info", { stdio: "ignore" });
      log("Postgres isn't running. Starting it with Docker...");
      run("docker compose up -d --wait");
      return true;
    } catch {
      // Docker installed but not running: fall through to Homebrew.
    }
  }
  if (process.platform === "darwin" && has("brew")) {
    const installed = execSync("brew list --formula", { encoding: "utf8" })
      .split(/\s+/)
      .filter((f) => /^postgresql(@\d+)?$/.test(f));
    const formula = installed.sort().at(-1) ?? "postgresql@16";
    if (installed.length === 0) {
      log("Postgres isn't installed. Installing it with Homebrew (this takes a minute)...");
      run(`brew install ${formula}`);
    } else {
      log(`Postgres isn't running. Starting ${formula} with Homebrew...`);
    }
    run(`brew services start ${formula}`);
    return true;
  }
  return false;
}

async function waitForServer(configured: string | undefined, seconds = 30) {
  for (let i = 0; i < seconds; i++) {
    const found = await findServer(configured);
    if (found.url) return found.url;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

async function ensureDatabases(serverUrl: string) {
  const sql = postgres(serverUrl, { max: 1, onnotice: () => {} });
  try {
    for (const name of [APP_DB, TEST_DB]) {
      const [row] = await sql`select 1 as ok from pg_database where datname = ${name}`;
      if (!row) {
        await sql.unsafe(`create database "${name}"`);
        log(`Created database "${name}"`);
      }
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function needsSeed(appUrl: string) {
  const sql = postgres(appUrl, { max: 1, onnotice: () => {} });
  try {
    const [{ count }] = await sql<
      { count: number }[]
    >`select count(*)::int as count from categories`;
    return count === 0;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

// ---------------------------------------------------------------- main

async function main() {
  if (!quiet) console.log("\nSetting up Shipwright\n");
  ensureEnvFile();

  // A URL set in the environment (as CI does) wins over the one in .env.
  const configured = process.env.DATABASE_URL || readEnv().get("DATABASE_URL");
  let found = await findServer(configured);

  if (!found.url && found.refused) {
    if (!startPostgres()) {
      throw new SetupError(
        "Postgres isn't running and couldn't be started automatically.\n" +
          "  Install Docker Desktop and open it, or install Postgres, then run this again.",
      );
    }
    const url = await waitForServer(configured);
    if (!url)
      throw new SetupError(
        "Started Postgres, but it didn't accept connections within 30 seconds. Run this again.",
      );
    found = { url, refused: false };
  }
  if (!found.url) {
    const reason = found.failure && !found.failure.ok ? found.failure.message : "unknown error";
    throw new SetupError(
      `Couldn't sign in to Postgres: ${reason}\n` +
        "  Set DATABASE_URL in .env to a user that can create databases, then run this again.",
    );
  }

  const serverUrl = found.url;
  const appUrl = withDatabase(serverUrl, APP_DB);
  const testUrl = withDatabase(serverUrl, TEST_DB);
  const env = readEnv();
  if (env.get("DATABASE_URL") !== appUrl || env.get("TEST_DATABASE_URL") !== testUrl) {
    writeEnv({ DATABASE_URL: appUrl, TEST_DATABASE_URL: testUrl });
    log(
      `Saved the working database connection to .env (${new URL(appUrl).username}@${new URL(appUrl).host})`,
    );
  }

  await ensureDatabases(serverUrl);

  const client = postgres(appUrl, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: resolve(ROOT, "drizzle") });
  await client.end({ timeout: 1 });
  step("Database tables are up to date");

  if (reset || (await needsSeed(appUrl))) {
    const { seed, DEMO_PASSWORD } = await import("./seed");
    await seed(appUrl);
    log(`Loaded demo data. Demo accounts use the password "${DEMO_PASSWORD}"`);
  }

  if (!quiet) console.log("\n  Ready. Start the app with: npm run dev\n");
}

main().catch((error) => {
  console.error(`\n  Setup problem: ${error instanceof SetupError ? error.message : error}\n`);
  process.exit(1);
});
