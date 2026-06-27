import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const envPath = ".env.production.local";

if (!existsSync(envPath)) {
  console.error("Missing .env.production.local — run: npx vercel env pull .env.production.local --environment=production");
  process.exit(1);
}

const env = { ...process.env };

for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

if (!env.DATABASE_URL?.trim()) {
  console.error(
    "DATABASE_URL is empty in .env.production.local.\n" +
      "Vercel does not always download secret values. Seed production with:\n" +
      "  .\\scripts\\seed-production.ps1 -DatabaseUrl \"YOUR_NEON_URL\" -AdminPassword \"YOUR_PASSWORD\""
  );
  process.exit(1);
}

console.log("Seeding production database...");

const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
