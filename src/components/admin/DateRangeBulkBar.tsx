"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type DateRangeBulkBarProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onClearDates: () => void;
  selectedCount: number;
  visibleCount: number;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  bulkDeleting?: boolean;
};

export function DateRangeBulkBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onClearDates,
  selectedCount,
  visibleCount,
  onSelectAllVisible,
  onClearSelection,
  onBulkDelete,
  bulkDeleting = false,
}: DateRangeBulkBarProps) {
  return (
    <div className="mb-6 space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Input
            id="bulk-from-date"
            type="date"
            label="From date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Input
            id="bulk-to-date"
            type="date"
            label="To date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" onClick={onClearDates}>
            Clear dates
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/50 pt-4">
        <Button variant="outline" size="sm" onClick={onSelectAllVisible} disabled={visibleCount === 0}>
          Select all shown ({visibleCount})
        </Button>
        {selectedCount > 0 && (
          <>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Clear selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-700/50 text-red-400 hover:bg-red-950/30"
              onClick={onBulkDelete}
              loading={bulkDeleting}
            >
              Delete selected ({selectedCount})
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
