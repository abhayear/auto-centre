import { isDatabaseAvailable } from "@/lib/safe-db";

export async function DevDbBanner() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (await isDatabaseAvailable()) {
    return null;
  }

  return (
    <div className="border-b border-amber-700/50 bg-amber-950/90 px-4 py-2.5 text-center text-sm text-amber-100">
      <strong>Database offline.</strong> Start Docker Desktop, then run{" "}
      <code className="rounded bg-amber-900/60 px-1.5 py-0.5">npm run db:up</code>
      . Listing content is hidden until Postgres is running.
    </div>
  );
}
