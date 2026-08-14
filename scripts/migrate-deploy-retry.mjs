import { execSync } from "node:child_process";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrateDeployWithRetry() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit" });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isLockTimeout = message.includes("P1002") || message.includes("advisory lock");
      if (!isLockTimeout || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      console.warn(
        `Migration lock busy (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${RETRY_DELAY_MS / 1000}s...`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
}

migrateDeployWithRetry().catch((error) => {
  console.error(error);
  process.exit(1);
});
