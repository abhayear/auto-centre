"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { WarrantyTrackingModeField } from "@/components/admin/warranty/WarrantyTrackingModeField";
import { Badge } from "@/components/ui/Badge";
import {
  WARRANTY_ACTION_LABELS,
  WARRANTY_LEVEL_LABELS,
  WARRANTY_ROLE_LABELS,
  canSetWarrantyTrackingMode,
  warrantyActionsFor,
  warrantyLevel,
  type WarrantyRole,
} from "@/lib/warranty-roles";
import {
  DEFAULT_WARRANTY_TRACKING_MODE,
  WARRANTY_IDENTIFIER_LABEL,
  WARRANTY_SENT_BY_LABELS,
  WARRANTY_TRACKING_MODE_LABELS,
  normalizeWarrantyTrackingMode,
  type WarrantyTrackingMode,
} from "@/lib/warranty-tracking";
import { LETTER_ITEM_TYPE_ORDER, REPLACEMENT_ITEM_TYPE_LABELS } from "@/lib/replacement-parts";
import {
  WARRANTY_EXCEPTION_ACTIONS,
  type WarrantyBoard,
  type WarrantyException,
  type WarrantyPendingFromCompany,
  type WarrantyPipelineStage,
  type WarrantyTask,
} from "@/lib/warranty-workflow";

const TILES = [
  { key: "openClaims", label: "Open claims" },
  { key: "readyToDispatch", label: "Ready to dispatch" },
  { key: "withCompany", label: "Claims with company" },
  { key: "pendingFromCompanyItems", label: "Items pending from company", alert: true },
  { key: "overdueWithCompany", label: "Overdue with company", alert: true },
  { key: "awaitingAllocation", label: "Waiting allocation" },
  { key: "awaitingInstallation", label: "Waiting installation / coding" },
  { key: "awaitingVerification", label: "Waiting your verification" },
  { key: "customerWaiting", label: "Customers waiting", alert: true },
  { key: "exceptions", label: "Need a manager decision", alert: true },
] as const;

export function WarrantyBoardPanel() {
  const [board, setBoard] = useState<WarrantyBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [intakeMode, setIntakeMode] = useState<WarrantyTrackingMode>(DEFAULT_WARRANTY_TRACKING_MODE);

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
        {board.seesAllCases ? (
          <p className="mt-2 text-sm">
            <Link href="/admin/warranty/handbook" className="text-blue-300 hover:underline">
              How to handle warranty — printable guide
            </Link>
          </p>
        ) : null}
      </div>

      <SearchBox query={query} onChange={setQuery} />

      <IntakeTrackingCard
        role={board.role}
        mode={intakeMode}
        onChange={setIntakeMode}
      />

      <MyTasks tasks={filterTasks(board.myTasks, query)} role={board.role} />

      {board.seesAllCases ? (
        <>
          {board.masterCounts ? (
            <section>
              <h2 className="mb-3 text-lg text-white">What we look after</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MasterTile label="Customers" value={board.masterCounts.totalCustomers} />
                <MasterTile label="E-bikes" value={board.masterCounts.totalBikes} />
                <MasterTile
                  label="Components in warranty"
                  value={board.masterCounts.componentsInWarranty}
                />
                <MasterTile
                  label="Warranty expiring soon"
                  value={board.masterCounts.warrantyExpiringSoon}
                  alert
                />
              </div>
            </section>
          ) : null}

          <Pipeline stages={board.pipeline} />

          <PendingFromCompany totals={board.pendingFromCompany} />

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

          <Exceptions exceptions={filterExceptions(board.exceptions, query)} />

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
                    <TaskTable tasks={filterTasks(queue.tasks, query)} />
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

function MasterTile({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert && value > 0 ? "border-amber-900/60 bg-amber-950/20" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PendingFromCompany({ totals }: { totals: WarrantyPendingFromCompany }) {
  return (
    <section>
      <h2 className="mb-1 text-lg text-white">Pending from company</h2>
      <p className="mb-3 text-sm text-slate-400">
        Pieces sent and not yet received back. A batch of four batteries counts as four.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div
          className={`rounded-xl border p-4 ${
            totals.total > 0 ? "border-amber-900/60 bg-amber-950/20" : "border-slate-800 bg-slate-900/40"
          }`}
        >
          <p className="text-sm text-slate-400">All warranty items</p>
          <p className="mt-1 text-3xl font-semibold text-white">{totals.total}</p>
        </div>
        {LETTER_ITEM_TYPE_ORDER.map((type) => (
          <div key={type} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-sm text-slate-400">{REPLACEMENT_ITEM_TYPE_LABELS[type]}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totals[type]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pipeline({ stages }: { stages: WarrantyPipelineStage[] }) {
  return (
    <section>
      <h2 className="mb-1 text-lg text-white">Warranty pipeline</h2>
      <p className="mb-3 text-sm text-slate-400">
        Where every claim sits, from the customer&apos;s complaint to a closed case.
      </p>
      <ol className="flex flex-wrap items-stretch gap-2">
        {stages.map((stage) => (
          <li
            key={stage.step}
            className="min-w-[10rem] flex-1 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-3"
          >
            <p className="text-2xl font-semibold text-white">{stage.count}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{stage.label}</p>
          </li>
        ))}
      </ol>
    </section>
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
      <h2 className="mb-1 text-lg text-white">Need a manager decision</h2>
      <p className="mb-3 text-sm text-slate-400">
        This list is only on Warranty 2.0 for the manager. Staff do not see it in the printed guide.
        Normal cases move on their own.
      </p>
      {exceptions.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing needs a manager decision.</p>
      ) : (
        <ul className="space-y-2">
          {exceptions.map((exception, index) => (
            <li
              key={`${exception.kind}-${exception.reference}-${index}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-800 px-3 py-3"
            >
              <div className="min-w-[16rem] flex-1">
                <p className="text-slate-200">
                  {exception.label}
                  <span className="ml-2 text-sm text-slate-500">{exception.reference}</span>
                </p>
                <p className="text-sm text-slate-400">{exception.detail}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {WARRANTY_EXCEPTION_ACTIONS[exception.kind]}
                </p>
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

function filterTasks(tasks: WarrantyTask[], query: string): WarrantyTask[] {
  const needle = query.trim().toUpperCase();
  if (!needle) return tasks;
  return tasks.filter((task) =>
    [task.caseNumber, task.customerName, task.detail, task.action]
      .filter(Boolean)
      .some((value) => String(value).toUpperCase().includes(needle)),
  );
}

function filterExceptions(exceptions: WarrantyException[], query: string): WarrantyException[] {
  const needle = query.trim().toUpperCase();
  if (!needle) return exceptions;
  return exceptions.filter((exception) =>
    [exception.reference, exception.detail, exception.label, exception.caseNumber]
      .filter(Boolean)
      .some((value) => String(value).toUpperCase().includes(needle)),
  );
}

function SearchBox({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{WARRANTY_IDENTIFIER_LABEL}</span>
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="WC-0001, BAT-45821, or BAT-LOT-2026-08"
        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
    </label>
  );
}

function IntakeTrackingCard({
  role,
  mode,
  onChange,
}: {
  role: WarrantyRole;
  mode: WarrantyTrackingMode;
  onChange: (mode: WarrantyTrackingMode) => void;
}) {
  const canChoose = canSetWarrantyTrackingMode(role);
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-lg text-white">How this claim is sent</h2>
      <p className="mt-1 text-sm text-slate-400">
        Follow-up, receiving, and search use the identifier on the challan. Receiving does not invent
        the other one.
      </p>
      <div className="mt-3 max-w-sm">
        <WarrantyTrackingModeField
          value={mode}
          editable={canChoose}
          onChange={onChange}
        />
      </div>
      {!canChoose ? (
        <p className="mt-2 text-sm text-slate-400">
          {WARRANTY_SENT_BY_LABELS[normalizeWarrantyTrackingMode(mode)]}
        </p>
      ) : (
        <p className="mt-3 text-sm">
          <Link
            href={`/admin/replacement-parts?tracking=${mode}`}
            className="text-blue-300 hover:underline"
          >
            Open a new claim sent by {WARRANTY_TRACKING_MODE_LABELS[mode].toLowerCase()}
          </Link>
        </p>
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
