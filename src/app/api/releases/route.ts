import { NextRequest, NextResponse } from "next/server";
import { canMergeReleases, canViewReleases } from "@/lib/admin-roles";
import { requireStaffSession } from "@/lib/auth";
import {
  listOpenPullRequests,
  mergePullRequest,
} from "@/lib/github/releases";
import { observeRoute } from "@/lib/health/observe-route";

const DEFAULT_REPO = "abhayear/auto-centre";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function githubConfig() {
  return {
    repo: process.env.GITHUB_REPO || DEFAULT_REPO,
    token: process.env.GITHUB_RELEASES_TOKEN || "",
  };
}

async function getHandler() {
  const session = await requireStaffSession();
  if (!session || !canViewReleases(session.user.role)) {
    return forbidden();
  }

  const { repo, token } = githubConfig();
  if (!token) {
    return NextResponse.json({ configured: false, pullRequests: [] });
  }

  const pullRequests = await listOpenPullRequests({ repo, token });
  return NextResponse.json({ configured: true, pullRequests });
}

async function postHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session || !canMergeReleases(session.user.role)) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const number =
    typeof body === "object" && body !== null && "number" in body
      ? (body as { number?: unknown }).number
      : undefined;
  if (!Number.isInteger(number) || (number as number) <= 0) {
    return NextResponse.json(
      { error: "Pull request number must be a positive integer" },
      { status: 400 },
    );
  }

  const { repo, token } = githubConfig();
  const result = await mergePullRequest({
    repo,
    token,
    number: number as number,
  });
  if (!result.merged) {
    return NextResponse.json(
      { error: "Merge failed", message: result.message },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
