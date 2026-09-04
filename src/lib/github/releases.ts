export type ReleasePullRequest = {
  number: number;
  title: string;
  htmlUrl: string;
  author: string;
  previewUrl: string | null;
  mergeable: boolean | null;
};

type GitHubPullRequest = {
  number: number;
  title: string;
  html_url: string;
  user: { login: string };
  body: string | null;
  mergeable: boolean | null;
};

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
});

function firstVercelPreviewUrl(body: string | null): string | null {
  if (!body) return null;

  for (const match of body.matchAll(/https:\/\/[^\s<>"']+/g)) {
    const candidate = match[0].replace(/[\])}.,;:!?]+$/, "");

    try {
      if (new URL(candidate).hostname.endsWith(".vercel.app")) {
        return candidate;
      }
    } catch {
      // Continue looking when a body contains an invalid URL-like string.
    }
  }

  return null;
}

export async function listOpenPullRequests(input: {
  repo: string;
  token: string;
  fetchFn?: typeof fetch;
}): Promise<ReleasePullRequest[]> {
  const fetchFn = input.fetchFn ?? fetch;
  const response = await fetchFn(
    `https://api.github.com/repos/${input.repo}/pulls?state=open&base=master`,
    {
      method: "GET",
      headers: githubHeaders(input.token),
    },
  );

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const pullRequests = (await response.json()) as GitHubPullRequest[];

  return pullRequests.map((pullRequest) => ({
    number: pullRequest.number,
    title: pullRequest.title,
    htmlUrl: pullRequest.html_url,
    author: pullRequest.user.login,
    previewUrl: firstVercelPreviewUrl(pullRequest.body),
    mergeable: pullRequest.mergeable,
  }));
}

export async function mergePullRequest(input: {
  repo: string;
  token: string;
  number: number;
  fetchFn?: typeof fetch;
}): Promise<{ merged: boolean; message: string }> {
  const fetchFn = input.fetchFn ?? fetch;
  const response = await fetchFn(
    `https://api.github.com/repos/${input.repo}/pulls/${input.number}/merge`,
    {
      method: "PUT",
      headers: {
        ...githubHeaders(input.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: "merge" }),
    },
  );

  if (!response.ok) {
    return { merged: false, message: await response.text() };
  }

  const result = (await response.json()) as { message?: string };
  return { merged: true, message: result.message ?? "merged" };
}
