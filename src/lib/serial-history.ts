export const COMPONENT_EVENT_KINDS = [
  "received_into_stock",
  "installed",
  "coding_completed",
  "fault_reported",
  "removed",
  "sent_to_company",
  "repair_started",
  "repaired",
  "received_from_company",
  "replaced_by",
  "returned_to_company",
  "scrapped",
] as const;

export type ComponentEventKind = (typeof COMPONENT_EVENT_KINDS)[number];

export const COMPONENT_EVENT_LABELS: Record<ComponentEventKind, string> = {
  received_into_stock: "Received into stock",
  installed: "Installed",
  coding_completed: "Coding completed",
  fault_reported: "Customer reported fault",
  removed: "Removed from bike",
  sent_to_company: "Sent to company",
  repair_started: "Repair started",
  repaired: "Repaired",
  received_from_company: "Received from company",
  replaced_by: "Replaced by another serial",
  returned_to_company: "Returned to company",
  scrapped: "Scrapped",
};

export const COMPONENT_STATUSES = [
  "installed",
  "available",
  "faulty_pending",
  "with_company",
  "returned_to_company",
  "scrapped",
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  installed: "Installed on a bike",
  available: "Available for installation",
  faulty_pending: "Faulty, waiting dispatch",
  with_company: "With company",
  returned_to_company: "Returned to company",
  scrapped: "Scrapped",
};

const STATUS_AFTER_EVENT: Record<ComponentEventKind, ComponentStatus> = {
  received_into_stock: "available",
  installed: "installed",
  coding_completed: "installed",
  fault_reported: "faulty_pending",
  removed: "faulty_pending",
  sent_to_company: "with_company",
  repair_started: "with_company",
  repaired: "with_company",
  received_from_company: "available",
  replaced_by: "returned_to_company",
  returned_to_company: "returned_to_company",
  scrapped: "scrapped",
};

export type ComponentEventInput = {
  kind: string;
  occurredAt: string;
  bikeNumber?: string | null;
  locationName?: string | null;
  caseNumber?: string | null;
  replacementSerial?: string | null;
  note?: string | null;
  actorEmail?: string | null;
  createdAt?: string | null;
};

export type SerialTimelineEntry = {
  date: string;
  kind: ComponentEventKind;
  label: string;
  detail: string;
};

export function isComponentEventKind(value: string): value is ComponentEventKind {
  return (COMPONENT_EVENT_KINDS as readonly string[]).includes(value);
}

function normalizeKind(value: string): ComponentEventKind {
  return isComponentEventKind(value) ? value : "received_into_stock";
}

function eventDetail(event: ComponentEventInput): string {
  const parts: string[] = [];
  const kind = normalizeKind(event.kind);

  if (kind === "replaced_by" && event.replacementSerial) {
    parts.push(event.replacementSerial);
  }
  if (event.bikeNumber) parts.push(`Bike ${event.bikeNumber}`);
  if (event.locationName) parts.push(event.locationName);
  if (event.caseNumber) parts.push(event.caseNumber);
  if (event.note) parts.push(event.note);

  return parts.join(" · ");
}

/** Oldest first, because a timeline is read downwards. Ties break on insert order. */
export function buildSerialTimeline(events: ComponentEventInput[]): SerialTimelineEntry[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const byDate = left.event.occurredAt.localeCompare(right.event.occurredAt);
      if (byDate !== 0) return byDate;
      const leftCreated = left.event.createdAt ?? "";
      const rightCreated = right.event.createdAt ?? "";
      const byCreated = leftCreated.localeCompare(rightCreated);
      if (byCreated !== 0) return byCreated;
      return left.index - right.index;
    })
    .map(({ event }) => {
      const kind = normalizeKind(event.kind);
      return {
        date: event.occurredAt.slice(0, 10),
        kind,
        label: COMPONENT_EVENT_LABELS[kind],
        detail: eventDetail(event),
      };
    });
}

/**
 * The event log is the truth, so a component's status can always be rebuilt
 * from it rather than trusted from a column someone may have mis-set.
 */
export function componentStatusFromEvents(events: ComponentEventInput[]): ComponentStatus | null {
  const timeline = buildSerialTimeline(events);
  const last = timeline[timeline.length - 1];
  return last ? STATUS_AFTER_EVENT[last.kind] : null;
}

export function statusAfterEvent(kind: string): ComponentStatus {
  return STATUS_AFTER_EVENT[normalizeKind(kind)];
}

/**
 * Faulty serial to the serial that took its place, newest link last, so the
 * chain survives however many times a component is swapped.
 */
export function replacementChain(
  startSerial: string,
  links: { fromSerial: string; toSerial: string }[],
): string[] {
  const byFrom = new Map(links.map((link) => [link.fromSerial, link.toSerial]));
  const chain = [startSerial];
  const seen = new Set([startSerial]);

  let current = startSerial;
  while (byFrom.has(current)) {
    const next = byFrom.get(current)!;
    if (seen.has(next)) break;
    chain.push(next);
    seen.add(next);
    current = next;
  }

  return chain;
}
