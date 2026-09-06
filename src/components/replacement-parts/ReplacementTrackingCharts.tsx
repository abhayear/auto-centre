import type { ReactNode } from "react";
import {
  LETTER_ITEM_TYPE_ORDER,
  REPLACEMENT_ITEM_TYPE_LABELS,
} from "@/lib/replacement-parts";
import type { WarrantyDashboard } from "@/lib/warranty-allocation";

type Slice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const STATUS_COLORS = {
  pending: "#f59e0b",
  allocated: "#38bdf8",
  returned: "#34d399",
};

const ITEM_COLORS = {
  battery: "#f87171",
  charger: "#fbbf24",
  motor: "#60a5fa",
  controller: "#c084fc",
};

const LOCATION_COLORS = {
  customerPending: "#f59e0b",
  autogalaxy: "#f87171",
  plant: "#fbbf24",
  company: "#38bdf8",
};

const LOCATION_SERIES = [
  { key: "customerPending" as const, label: "Customer pending", color: LOCATION_COLORS.customerPending, bar: "bg-amber-500" },
  { key: "autogalaxy" as const, label: "Autogalaxy", color: LOCATION_COLORS.autogalaxy, bar: "bg-red-400" },
  { key: "plant" as const, label: "Plant", color: LOCATION_COLORS.plant, bar: "bg-amber-400" },
  { key: "company" as const, label: "Company", color: LOCATION_COLORS.company, bar: "bg-sky-400" },
];

export function ReplacementTrackingCharts({ dashboard }: { dashboard: WarrantyDashboard }) {
  const statusSlices: Slice[] = [
    {
      key: "pending",
      label: "Pending",
      value: dashboard.outcomeTotals.pending,
      color: STATUS_COLORS.pending,
    },
    {
      key: "allocated",
      label: "Given (allocated)",
      value: dashboard.outcomeTotals.allocated,
      color: STATUS_COLORS.allocated,
    },
    {
      key: "returned",
      label: "Returned to customer",
      value: dashboard.outcomeTotals.returned,
      color: STATUS_COLORS.returned,
    },
  ];

  const itemSlices: Slice[] = LETTER_ITEM_TYPE_ORDER.map((type) => {
    const row = dashboard.outcomes[type];
    return {
      key: type,
      label: REPLACEMENT_ITEM_TYPE_LABELS[type],
      value: row.pending + row.given,
      color: ITEM_COLORS[type],
    };
  });

  const locationSlices: Slice[] = [
    {
      key: "autogalaxy",
      label: "Autogalaxy",
      value: dashboard.customerHeadcount.autogalaxy,
      color: LOCATION_COLORS.autogalaxy,
    },
    {
      key: "plant",
      label: "Plant",
      value: dashboard.customerHeadcount.plant,
      color: LOCATION_COLORS.plant,
    },
    {
      key: "company",
      label: "Company",
      value: dashboard.customerHeadcount.company,
      color: LOCATION_COLORS.company,
    },
  ];

  const battery = dashboard.outcomes.battery;

  return (
    <div className="space-y-4">
      <ChartCard
        title="Items by type at each location"
        subtitle="How many battery, charger, motor, and controller pieces are pending with customers, at Autogalaxy, at plant, or at company"
      >
        <LocationByTypeChart
          rows={LETTER_ITEM_TYPE_ORDER.map((type) => ({
            label: REPLACEMENT_ITEM_TYPE_LABELS[type],
            customerPending: dashboard.rows[type].customerPending,
            autogalaxy: dashboard.rows[type].autogalaxy,
            plant: dashboard.rows[type].plant,
            company: dashboard.rows[type].company,
          }))}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Given vs pending"
          subtitle="Pieces waiting, already given from stock, or returned"
        >
          <DonutChart slices={statusSlices} centerLabel="pieces" />
        </ChartCard>
        <ChartCard title="Items by type" subtitle="All replacement pieces in this view">
          <DonutChart slices={itemSlices} centerLabel="items" />
        </ChartCard>
        <ChartCard
          title="Where customers are"
          subtitle="Open customers at Autogalaxy, plant, or company"
        >
          <DonutChart slices={locationSlices} centerLabel="customers" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ChartCard
          title="Given vs pending by item"
          subtitle="Battery, charger, motor, and controller pieces"
        >
          <GroupedBarChart
            rows={LETTER_ITEM_TYPE_ORDER.map((type) => ({
              label: REPLACEMENT_ITEM_TYPE_LABELS[type],
              pending: dashboard.outcomes[type].pending,
              given: dashboard.outcomes[type].given,
            }))}
          />
        </ChartCard>
        <ChartCard title="Battery snapshot" subtitle="How many batteries are still waiting vs already given">
          <BatterySnapshot pending={battery.pending} given={battery.given} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mb-4 text-xs text-slate-400">{subtitle}</p>
      {children}
    </div>
  );
}

function DonutChart({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const visible = slices.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="16" />
          {total === 0 ? null : visible.length === 0 ? null : visible.map((slice) => {
            const length = (slice.value / total) * circumference;
            const circle = (
              <circle
                key={slice.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold text-white">{total}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</p>
        </div>
      </div>
      <SliceLegend slices={slices} total={total} />
    </div>
  );
}

function SliceLegend({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <ul className="w-full space-y-2 text-sm">
      {slices.map((slice) => {
        const pct = total === 0 ? 0 : Math.round((slice.value / total) * 100);
        return (
          <li key={slice.key} className="flex items-center justify-between gap-3 text-slate-300">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              {slice.label}
            </span>
            <span className="tabular-nums text-white">
              {slice.value}
              <span className="ml-1 text-xs font-normal text-slate-400">{pct}%</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function LocationByTypeChart({
  rows,
}: {
  rows: {
    label: string;
    customerPending: number;
    autogalaxy: number;
    plant: number;
    company: number;
  }[];
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [row.customerPending, row.autogalaxy, row.plant, row.company]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {LOCATION_SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-white">{row.label}</span>
              <span className="tabular-nums text-slate-400">
                {row.customerPending} pending · {row.autogalaxy} Autogalaxy · {row.plant} plant ·{" "}
                {row.company} company
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LOCATION_SERIES.map((series) => (
                <div key={series.key} className="space-y-1">
                  <Bar
                    value={row[series.key]}
                    max={max}
                    color={series.bar}
                    label={`${row.label} ${series.label}`}
                  />
                  <p className="text-[10px] tabular-nums text-slate-500">
                    {row[series.key]} {series.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedBarChart({
  rows,
}: {
  rows: { label: string; pending: number; given: number }[];
}) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.pending, row.given]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          Given
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-white">{row.label}</span>
              <span className="tabular-nums text-slate-400">
                {row.pending} pending · {row.given} given
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Bar value={row.pending} max={max} color="bg-amber-500" label={`${row.label} pending`} />
              <Bar value={row.given} max={max} color="bg-emerald-400" label={`${row.label} given`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const width = `${Math.max(value === 0 ? 0 : 6, (value / max) * 100)}%`;
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-900/80" aria-label={`${label}: ${value}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: value === 0 ? "0%" : width }} />
    </div>
  );
}

function BatterySnapshot({ pending, given }: { pending: number; given: number }) {
  const total = pending + given;
  const slices: Slice[] = [
    { key: "pending", label: "Pending", value: pending, color: STATUS_COLORS.pending },
    { key: "given", label: "Given to customer", value: given, color: STATUS_COLORS.returned },
  ];

  return (
    <div className="space-y-4">
      <DonutChart slices={slices} centerLabel="batteries" />
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-slate-900/70 px-3 py-2">
          <p className="text-xs text-slate-400">Still pending</p>
          <p className="text-xl font-semibold text-amber-400">{pending}</p>
        </div>
        <div className="rounded-lg bg-slate-900/70 px-3 py-2">
          <p className="text-xs text-slate-400">Already given</p>
          <p className="text-xl font-semibold text-emerald-400">{given}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {total === 0
          ? "No battery replacements in this view yet."
          : given === 0
            ? "No batteries have been given to customers yet."
            : `${given} of ${total} battery piece${total === 1 ? "" : "s"} given.`}
      </p>
    </div>
  );
}
