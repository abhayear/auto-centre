"use client";

import { useEffect, useState } from "react";
import { ExternalLink, GitPullRequest } from "lucide-react";
import toast from "react-hot-toast";
import type { ReleasePullRequest } from "@/lib/github/releases";
import { Button } from "@/components/ui/Button";

type ReleasesResponse = {
  configured: boolean;
  pullRequests: ReleasePullRequest[];
};

export function ReleasesPanel({ canMerge }: { canMerge: boolean }) {
  const [pullRequests, setPullRequests] = useState<ReleasePullRequest[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [mergingNumber, setMergingNumber] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPullRequests() {
      try {
        const response = await fetch("/api/releases");
        const data = (await response.json()) as Partial<ReleasesResponse> & {
          error?: string;
        };
        if (!active) return;

        if (!response.ok) {
          toast.error(data.error ?? "Failed to load releases");
          setPullRequests([]);
          return;
        }

        setConfigured(data.configured === true);
        setPullRequests(
          Array.isArray(data.pullRequests) ? data.pullRequests : [],
        );
      } catch {
        if (active) toast.error("Failed to load releases");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPullRequests();
    return () => {
      active = false;
    };
  }, []);

  async function approveAndMerge(pullRequest: ReleasePullRequest) {
    if (
      !window.confirm(
        `Approve and merge PR #${pullRequest.number}: ${pullRequest.title}?`,
      )
    ) {
      return;
    }

    setMergingNumber(pullRequest.number);
    try {
      const response = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: pullRequest.number }),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        toast.error(data.message ?? data.error ?? "Merge failed");
        return;
      }

      setPullRequests((current) =>
        current.filter((item) => item.number !== pullRequest.number),
      );
      toast.success(data.message ?? "Pull request merged");
    } catch {
      toast.error("Merge failed");
    } finally {
      setMergingNumber(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Releases</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Review open pull requests, open their previews, and release approved
          changes.
        </p>
      </div>

      {!configured && !loading ? (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-200">
          GitHub releases are not configured. Add a release token to load open
          pull requests.
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      ) : pullRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <GitPullRequest className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">
            {configured
              ? "No open pull requests."
              : "Release integration is not configured."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Pull request</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Links</th>
                {canMerge ? (
                  <th className="px-4 py-3 font-medium">Action</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {pullRequests.map((pullRequest) => (
                <tr key={pullRequest.number}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{pullRequest.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      #{pullRequest.number}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {pullRequest.author}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      {pullRequest.previewUrl ? (
                        <a
                          href={pullRequest.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                        >
                          Preview
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <a
                        href={pullRequest.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                      >
                        GitHub
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                  {canMerge ? (
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        loading={mergingNumber === pullRequest.number}
                        disabled={mergingNumber !== null}
                        onClick={() => approveAndMerge(pullRequest)}
                      >
                        Approve &amp; merge
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
