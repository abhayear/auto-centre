import { execSync } from "node:child_process";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  try {
    const output = execSync("npx prisma migrate deploy", {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    });
    if (output) process.stdout.write(output);
    return { ok: true, output: output ?? "" };
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? String(error.stdout ?? "");
    const stderr = error.stderr?.toString?.() ?? String(error.stderr ?? "");
    const message = error.message ?? "";
    const output = `${stdout}\n${stderr}\n${message}`;
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    return { ok: false, output };
  }
}

function isAdvisoryLockError(output) {
  return (
    output.includes("P1002") ||
    output.includes("advisory lock") ||
    output.includes("Timed out trying to acquire")
  );
}

async function migrateDeployWithRetry() {
  let lastOutput = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = runMigrateDeploy();
    if (result.ok) {
      return;
    }

    lastOutput = result.output;

    if (!isAdvisoryLockError(result.output) || attempt === MAX_ATTEMPTS) {
      break;
    }

    console.warn(
      `Migration lock busy (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${RETRY_DELAY_MS / 1000}s...`,
    );
    await sleep(RETRY_DELAY_MS);
  }

  if (process.env.VERCEL === "1" && isAdvisoryLockError(lastOutput)) {
    console.warn(
      "Could not acquire migration lock on Vercel; continuing build with existing migrations.",
    );
    return;
  }

  throw new Error(lastOutput || "prisma migrate deploy failed");
}

migrateDeployWithRetry().catch((error) => {
  console.error(error);
  process.exit(1);
});
