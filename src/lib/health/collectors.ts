export type PingResult = { ok: boolean; ms: number; status: number | null };

type Quota = { used: number; limit: number };
type QueryRaw = (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

const COLLECTOR_FAILED = "collector failed";

export async function pingUrl(
  url: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<PingResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      redirect: "manual",
    });
    const ms = Date.now() - start;
    return {
      ok: response.status >= 200 && response.status < 400,
      ms,
      status: response.status,
    };
  } catch {
    return { ok: false, ms: Date.now() - start, status: null };
  } finally {
    clearTimeout(timer);
  }
}

export function maxPercent(quotas: Quota[]): number | null {
  if (quotas.length === 0) return null;
  return Math.max(...quotas.map((quota) => (quota.limit <= 0 ? 0 : (quota.used / quota.limit) * 100)));
}

export function parseMaxConnections(raw: unknown): number | null {
  const value =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { max_connections?: unknown }).max_connections
        : null;
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchVercelUsagePercent(
  env: { VERCEL_API_TOKEN?: string },
  fetchFn: typeof fetch,
): Promise<{ configured: boolean; percent: number | null; error?: string }> {
  const token = env.VERCEL_API_TOKEN;
  if (!token) return { configured: false, percent: null };

  try {
    const response = await fetchFn("https://api.vercel.com/v1/usage", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(COLLECTOR_FAILED);

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !Array.isArray((payload as { quotas?: unknown }).quotas)
    ) {
      throw new Error(COLLECTOR_FAILED);
    }

    const quotas = (payload as { quotas: unknown[] }).quotas;
    if (
      !quotas.every(
        (quota): quota is Quota =>
          typeof quota === "object" &&
          quota !== null &&
          typeof (quota as Quota).used === "number" &&
          Number.isFinite((quota as Quota).used) &&
          typeof (quota as Quota).limit === "number" &&
          Number.isFinite((quota as Quota).limit),
      )
    ) {
      throw new Error(COLLECTOR_FAILED);
    }

    return { configured: true, percent: maxPercent(quotas) };
  } catch {
    return { configured: true, percent: null, error: COLLECTOR_FAILED };
  }
}

export async function readDatabaseConnections(
  queryRaw: QueryRaw,
): Promise<{
  connections: number | null;
  maxConnections: number | null;
  error?: string;
}> {
  try {
    const connectionRows = await queryRaw`SELECT count(*)::int AS count FROM pg_stat_activity`;
    const maxConnectionRows = await queryRaw`SHOW max_connections`;
    const connections =
      Array.isArray(connectionRows) &&
      connectionRows.length > 0 &&
      typeof (connectionRows[0] as { count?: unknown }).count === "number"
        ? (connectionRows[0] as { count: number }).count
        : null;

    return {
      connections,
      maxConnections: parseMaxConnections(maxConnectionRows),
    };
  } catch {
    return {
      connections: null,
      maxConnections: null,
      error: COLLECTOR_FAILED,
    };
  }
}
