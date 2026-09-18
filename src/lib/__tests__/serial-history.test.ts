import { describe, expect, it } from "vitest";
import {
  buildSerialTimeline,
  componentStatusFromEvents,
  replacementChain,
  statusAfterEvent,
  type ComponentEventInput,
} from "@/lib/serial-history";

const history: ComponentEventInput[] = [
  { kind: "received_into_stock", occurredAt: "2026-01-10" },
  { kind: "installed", occurredAt: "2026-01-15", bikeNumber: "EB1025" },
  { kind: "fault_reported", occurredAt: "2026-09-15", note: "Not charging", caseNumber: "WC-0125" },
  { kind: "removed", occurredAt: "2026-09-16", bikeNumber: "EB1025" },
  { kind: "sent_to_company", occurredAt: "2026-09-17", locationName: "Dabra Plant" },
  { kind: "repair_started", occurredAt: "2026-09-20" },
  { kind: "repaired", occurredAt: "2026-10-15" },
  { kind: "received_from_company", occurredAt: "2026-10-18", locationName: "Dabra Plant" },
];

describe("buildSerialTimeline", () => {
  it("reads oldest first", () => {
    const timeline = buildSerialTimeline(history);
    expect(timeline[0].date).toBe("2026-01-10");
    expect(timeline[timeline.length - 1].date).toBe("2026-10-18");
  });

  it("sorts events entered out of order", () => {
    const timeline = buildSerialTimeline([
      { kind: "installed", occurredAt: "2026-01-15" },
      { kind: "received_into_stock", occurredAt: "2026-01-10" },
    ]);
    expect(timeline.map((entry) => entry.kind)).toEqual(["received_into_stock", "installed"]);
  });

  it("keeps insert order for two events on the same day", () => {
    const timeline = buildSerialTimeline([
      { kind: "installed", occurredAt: "2026-10-18" },
      { kind: "coding_completed", occurredAt: "2026-10-18" },
    ]);
    expect(timeline.map((entry) => entry.kind)).toEqual(["installed", "coding_completed"]);
  });

  it("labels each step in plain words and carries the detail", () => {
    const timeline = buildSerialTimeline(history);
    expect(timeline[1].label).toBe("Installed");
    expect(timeline[1].detail).toBe("Bike EB1025");
    expect(timeline[2].detail).toBe("WC-0125 · Not charging");
    expect(timeline[4].detail).toBe("Dabra Plant");
  });

  it("names the serial that took over on a replacement", () => {
    const timeline = buildSerialTimeline([
      { kind: "replaced_by", occurredAt: "2026-10-18", replacementSerial: "BAT-99172" },
    ]);
    expect(timeline[0].detail).toBe("BAT-99172");
    expect(timeline[0].label).toBe("Replaced by another serial");
  });
});

describe("componentStatusFromEvents", () => {
  it("rebuilds the status from the last event", () => {
    expect(componentStatusFromEvents(history)).toBe("available");
    expect(componentStatusFromEvents(history.slice(0, 2))).toBe("installed");
    expect(componentStatusFromEvents(history.slice(0, 5))).toBe("with_company");
  });

  it("keeps a coded component installed", () => {
    expect(
      componentStatusFromEvents([
        { kind: "installed", occurredAt: "2026-10-18" },
        { kind: "coding_completed", occurredAt: "2026-10-18" },
      ]),
    ).toBe("installed");
  });

  it("marks a swapped-out component as gone back to the company", () => {
    expect(
      componentStatusFromEvents([
        ...history,
        { kind: "replaced_by", occurredAt: "2026-10-19", replacementSerial: "BAT-99172" },
      ]),
    ).toBe("returned_to_company");
  });

  it("has no status before anything has happened", () => {
    expect(componentStatusFromEvents([])).toBeNull();
  });

  it("maps a single event kind on its own", () => {
    expect(statusAfterEvent("scrapped")).toBe("scrapped");
    expect(statusAfterEvent("sent_to_company")).toBe("with_company");
  });
});

describe("replacementChain", () => {
  it("follows a serial through every swap", () => {
    expect(
      replacementChain("BAT-111", [
        { fromSerial: "BAT-111", toSerial: "BAT-222" },
        { fromSerial: "BAT-222", toSerial: "BAT-333" },
      ]),
    ).toEqual(["BAT-111", "BAT-222", "BAT-333"]);
  });

  it("returns the serial alone when it was never replaced", () => {
    expect(replacementChain("BAT-111", [])).toEqual(["BAT-111"]);
  });

  it("stops instead of looping on bad data", () => {
    expect(
      replacementChain("BAT-111", [
        { fromSerial: "BAT-111", toSerial: "BAT-222" },
        { fromSerial: "BAT-222", toSerial: "BAT-111" },
      ]),
    ).toEqual(["BAT-111", "BAT-222"]);
  });
});
