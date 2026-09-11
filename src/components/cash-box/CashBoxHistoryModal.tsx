"use client";

import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  formatCashBoxTimestamp,
  type SerializedCashBoxAuditLog,
} from "@/lib/cash-box";

const ACTION_LABELS = {
  created: "Created",
  updated: "Edited",
  deleted: "Deleted",
} as const;

export function CashBoxHistoryModal({
  title,
  createdAt,
  updatedAt,
  history,
  loading = false,
  onClose,
}: {
  title: string;
  createdAt?: string;
  updatedAt?: string;
  history: SerializedCashBoxAuditLog[];
  loading?: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={title} size="lg">
      {createdAt || updatedAt ? (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          {updatedAt ? (
            <p>
              Last saved{" "}
              <span className="text-white">{formatCashBoxTimestamp(updatedAt)}</span>
            </p>
          ) : null}
          {createdAt ? (
            <p className="text-xs text-slate-500">
              Created {formatCashBoxTimestamp(createdAt)}
            </p>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-slate-400">Loading edit history…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-400">
          No edits recorded yet. New creates, updates, and deletes are logged from now on.
        </p>
      ) : (
        <ol className="space-y-4">
          {history.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-slate-700 bg-slate-900/60 p-4"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                <History className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-white">
                  {ACTION_LABELS[event.action] ?? event.action}
                </span>
                <span className="text-slate-400">{formatCashBoxTimestamp(event.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-300">{event.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {event.actorEmail}
                {event.actorRole ? ` · ${event.actorRole}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
