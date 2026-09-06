export const SERVICE_SCHEDULE_PAPER_SIZES = ["A5", "A4", "A3", "A2", "A1", "A0"] as const;

export type ServiceSchedulePaperSize = (typeof SERVICE_SCHEDULE_PAPER_SIZES)[number];

/** ISO 216 portrait page height in millimetres. */
export const SERVICE_SCHEDULE_PAPER_HEIGHT_MM: Record<ServiceSchedulePaperSize, number> = {
  A5: 210,
  A4: 297,
  A3: 420,
  A2: 594,
  A1: 841,
  A0: 1189,
};

export const SERVICE_SCHEDULE_PRINT_MARGIN_MM = 8;

export const SERVICE_SCHEDULE_PAPER_OPTIONS = SERVICE_SCHEDULE_PAPER_SIZES.map((size) => ({
  value: size,
  label: size === "A4" ? "A4 (one page)" : size,
}));

export function isServiceSchedulePaperSize(value: string): value is ServiceSchedulePaperSize {
  return SERVICE_SCHEDULE_PAPER_SIZES.includes(value as ServiceSchedulePaperSize);
}

export function serviceSchedulePrintMaxHeightMm(
  size: ServiceSchedulePaperSize,
  marginMm = SERVICE_SCHEDULE_PRINT_MARGIN_MM,
): number {
  return SERVICE_SCHEDULE_PAPER_HEIGHT_MM[size] - marginMm * 2;
}

/** Compact sheets hide the next-due status card so the schedule stays on one page. */
export function isCompactServiceSchedulePaper(size: ServiceSchedulePaperSize): boolean {
  return size === "A4" || size === "A5";
}
