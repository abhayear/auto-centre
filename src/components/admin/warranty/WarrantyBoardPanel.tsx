"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import {
  WARRANTY_ACTION_LABELS,
  WARRANTY_LEVEL_LABELS,
  WARRANTY_ROLE_LABELS,
  warrantyActionsFor,
  warrantyLevel,
  type WarrantyRole,
} from "@/lib/warranty-roles";
import type { WarrantyBoard, WarrantyException, WarrantyTask } from "@/lib/warranty-workflow";

const TILES = [
  { key: "openClaims", label: "Open claims" },
  { key: "readyToDispatch", label: "Ready to dispatch" },
  { key: "withCompany", label: "With company" },
  { key: "overdueWithCompany", label: "Overdue with company", alert: true },
  { key: "awaitingAllocation", label: "Waiting allocation" },
  { key: "awaitingInstallation", label: "Waiting installation / coding" },
  { key: "awaitingVerification", label: "Waiting your verification" },
  { key: "customerWaiting", label: "Customers waiting", alert: true },
  { key: "exceptions", label: "Exceptions", alert: true },
] as const;

export function WarrantyBoardPanel() {
  const [board, setBoard] = useState<WarrantyBoard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/warranty/board");
      if (!res.ok) {
        toast.error("Could not load the warranty board");
        setLoading(false);
        return;
      }
      setBoard(await res.json());
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading warranty board…</p>;
  }

  if (!board) {
    return <p className="text-sm text-slate-400">Warranty board unavailable.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Warranty 2.0</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every claim carries its own next task. You are signed in as{" "}
          <span className="text-slate-200">{WARRANTY_ROLE_LABELS[board.role]}</span> — level{" "}
          {warrantyLevel(board.role)} ({WARRANTY_LEVEL_LABELS[warrantyLevel(board.role)]}).
        </p>
      </div>

      <MyTasks tasks={board.myTasks} role={board.role} />

      {board.seesAllCases ? (
        <>
          <section>
            <h2 className="mb-3 text-lg text-white">Warranty dashboard</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TILES.map((tile) => {
                const value = board.counts[tile.key];
                return (
                  <div
                    key={tile.key}
                    className={`rounded-xl border p-4 ${
                      "alert" in tile && tile.alert && value > 0
                        ? "border-red-900/60 bg-red-950/20"
                        : "border-slate-800 bg-slate-900/40"
                    }`}
                  >
                    <p className="text-sm text-slate-400">{tile.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <Exceptions exceptions={board.exceptions} />

          <section>
            <h2 className="mb-1 text-lg text-white">Queues by role</h2>
            <p className="mb-3 text-sm text-slate-400">
              The workflow decides who gets the next task, so nobody assigns work by hand.
            </p>
            <div className="space-y-4">
              {board.queues.length === 0 ? (
                <p className="text-sm text-slate-500">No open tasks in any queue.</p>
              ) : (
                board.queues.map((queue) => (
                  <div key={queue.role} className="rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                      <h3 className="text-sm font-semibold text-white">{queue.label}</h3>
                      <Badge variant={queue.tasks.some((task) => task.overdue) ? "danger" : "info"}>
                        {queue.tasks.length} task{queue.tasks.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <TaskTable tasks={queue.tasks} />
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      <Authority role={board.role} />
    </div>
  );
}

function MyTasks({ tasks, role }: { tasks: WarrantyTask[]; role: WarrantyRole }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg text-white">My tasks</h2>
        <Badge variant={tasks.some((task) => task.overdue) ? "danger" : "info"}>
          {tasks.length}
        </Badge>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing waiting on {WARRANTY_ROLE_LABELS[role]} right now.
        </p>
      ) : (
        <div className="rounded-xl border border-slate-800">
          <TaskTable tasks={tasks} />
        </div>
      )}
    </section>
  );
}

function TaskTable({ tasks }: { tasks: WarrantyTask[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Case</th>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-left">Stage</th>
            <th className="px-3 py-2 text-left">Next action</th>
            <th className="px-3 py-2 text-left">Age</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={`${task.claimId}-${task.stage}`} className="border-t border-slate-800 text-slate-200">
              <td className="px-3 py-2">
                <Link href="/admin/replacement-parts" className="text-blue-300 hover:underline">
                  {task.caseNumber ?? "—"}
                </Link>
              </td>
              <td className="px-3 py-2">{task.customerName}</td>
              <td className="px-3 py-2 text-slate-400">{task.detail}</td>
              <td className="px-3 py-2">{task.stageLabel}</td>
              <td className="px-3 py-2">{task.action}</td>
              <td className="px-3 py-2">
                {task.overdue ? (
                  <Badge variant="danger">{task.ageDays}d</Badge>
                ) : (
                  <span className="text-slate-400">{task.ageDays}d</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Exceptions({ exceptions }: { exceptions: WarrantyException[] }) {
  return (
    <section>
      <h2 className="mb-1 text-lg text-white">Exceptions</h2>
      <p className="mb-3 text-sm text-slate-400">
        Normal cases flow on their own. Only these need a decision.
      </p>
      {exceptions.length === 0 ? (
        <p className="text-sm text-slate-500">No exceptions. The workflow is running clean.</p>
      ) : (
        <ul className="space-y-2">
          {exceptions.map((exception, index) => (
            <li
              key={`${exception.kind}-${exception.reference}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-3"
            >
              <div>
                <p className="text-slate-200">
                  {exception.label}
                  <span className="ml-2 text-sm text-slate-500">{exception.reference}</span>
                </p>
                <p className="text-sm text-slate-400">{exception.detail}</p>
              </div>
              <Badge variant={exception.severity === "high" ? "danger" : "warning"}>
                {exception.severity === "high" ? "Act now" : "Monitor"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Authority({ role }: { role: WarrantyRole }) {
  const actions = warrantyActionsFor(role);
  return (
    <section>
      <h2 className="mb-1 text-lg text-white">Your authority</h2>
      <p className="mb-3 text-sm text-slate-400">
        Records are never deleted. Cancel, correct, or reverse with a reason so the owner keeps the
        full audit trail.
      </p>
      {actions.length === 0 ? (
        <p className="text-sm text-slate-500">Read-only access.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Badge key={action} variant="default">
              {WARRANTY_ACTION_LABELS[action]}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
