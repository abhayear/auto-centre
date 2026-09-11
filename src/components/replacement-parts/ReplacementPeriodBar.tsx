"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  TRACK_DATE_FIELD_LABELS,
  TRACK_DATE_FIELD_OPTIONS,
  type TrackDateField,
} from "@/lib/replacement-parts";

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStartIso(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localIsoDate(date);
}

export function ReplacementPeriodBar({
  fromDate,
  toDate,
  dateField,
  onFromDateChange,
  onToDateChange,
  onDateFieldChange,
  onClearDates,
  onPrintPdf,
}: {
  fromDate: string;
  toDate: string;
  dateField: TrackDateField;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onDateFieldChange: (value: TrackDateField) => void;
  onClearDates: () => void;
  onPrintPdf: () => void;
}) {
  const today = localIsoDate();

  return (
    <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Track by date</h2>
          <p className="text-xs text-slate-400">
            Choose a period, then see sent, received-at-company, and returned items. Print saves as PDF.
          </p>
        </div>
        <Button onClick={onPrintPdf}>
          <FileDown className="h-4 w-4" />
          Print PDF
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Input
            id="track-from-date"
            type="date"
            label="From date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
          />
        </div>
        <div className="w-44">
          <Input
            id="track-to-date"
            type="date"
            label="To date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
          />
        </div>
        <div className="min-w-56 flex-1">
          <Select
            id="track-date-field"
            label="What to track"
            value={dateField}
            options={TRACK_DATE_FIELD_OPTIONS}
            onChange={(event) => onDateFieldChange(event.target.value as TrackDateField)}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onFromDateChange(monthStartIso());
            onToDateChange(today);
          }}
        >
          This month
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onFromDateChange(daysAgoIso(6));
            onToDateChange(today);
          }}
        >
          Last 7 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onFromDateChange(today);
            onToDateChange(today);
          }}
        >
          Today
        </Button>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={onClearDates}>
            All dates
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Now showing: {TRACK_DATE_FIELD_LABELS[dateField]}
        {fromDate || toDate
          ? ` · ${fromDate || "…"} to ${toDate || "…"}`
          : " · all dates"}
      </p>
    </div>
  );
}
