import { describe, expect, it } from "vitest";
import {
  isCompatibleWithComponent,
  priorityTierFor,
  rankAllocationCandidates,
  recommendedCandidate,
  type AllocationCandidate,
  type AvailableComponent,
} from "@/lib/warranty-priority";

const today = "2026-09-18";

const battery: AvailableComponent = {
  id: "comp-1",
  serialNumber: "BAT-101",
  componentType: "battery",
  modelCode: "LMKN/F2S",
  ah: 33.9,
  voltage: null,
};

function candidate(overrides: Partial<AllocationCandidate> = {}): AllocationCandidate {
  return {
    claimId: "claim-1",
    caseNumber: "WC-0001",
    customerName: "Amit",
    bikeNumber: "EB1025",
    componentType: "battery",
    modelCode: null,
    ah: null,
    voltage: null,
    waitingSince: "2026-09-15",
    distanceKm: 2,
    remainingWarrantyMonths: 20,
    ...overrides,
  };
}

const waitingList = [
  candidate({ claimId: "c-amit", customerName: "Amit", distanceKm: 2, waitingSince: "2026-09-15" }),
  candidate({ claimId: "c-ravi", customerName: "Ravi", distanceKm: 5, waitingSince: "2026-09-12" }),
  candidate({ claimId: "c-mohan", customerName: "Mohan", distanceKm: 18, waitingSince: "2026-09-10" }),
  candidate({ claimId: "c-suresh", customerName: "Suresh", distanceKm: 35, waitingSince: "2026-09-08" }),
];

describe("isCompatibleWithComponent", () => {
  it("requires the same component type", () => {
    expect(isCompatibleWithComponent(candidate({ componentType: "charger" }), battery)).toBe(false);
    expect(isCompatibleWithComponent(candidate(), battery)).toBe(true);
  });

  it("requires recorded AH and voltage to agree", () => {
    expect(isCompatibleWithComponent(candidate({ ah: 30 }), battery)).toBe(false);
    expect(isCompatibleWithComponent(candidate({ ah: 33.9 }), battery)).toBe(true);
    expect(
      isCompatibleWithComponent(candidate({ voltage: "60V" }), { ...battery, voltage: "48V" }),
    ).toBe(false);
  });

  it("does not block when one side never recorded the spec", () => {
    expect(isCompatibleWithComponent(candidate({ ah: null }), battery)).toBe(true);
    expect(isCompatibleWithComponent(candidate({ ah: 33.9 }), { ...battery, ah: null })).toBe(true);
  });
});

describe("priorityTierFor", () => {
  it("puts a nearly expired warranty first", () => {
    expect(priorityTierFor(candidate({ remainingWarrantyMonths: 2 }), 1)).toBe("urgent_warranty");
  });

  it("escalates anyone waiting past the limit", () => {
    expect(priorityTierFor(candidate({ distanceKm: 40 }), 30)).toBe("waiting_long");
  });

  it("prefers nearby before everyone else", () => {
    expect(priorityTierFor(candidate({ distanceKm: 5 }), 3)).toBe("nearby");
    expect(priorityTierFor(candidate({ distanceKm: 40 }), 3)).toBe("standard");
    expect(priorityTierFor(candidate({ distanceKm: null }), 3)).toBe("standard");
  });
});

describe("rankAllocationCandidates", () => {
  it("prefers nearby customers, longest waiting first inside that group", () => {
    const ranked = rankAllocationCandidates(battery, waitingList, today);
    expect(ranked.map((row) => row.customerName)).toEqual(["Ravi", "Amit", "Suresh", "Mohan"]);
    expect(ranked[0].tierLabel).toBe("Nearby");
    expect(ranked[0].waitingDays).toBe(6);
  });

  it("never lets a close walk-in overtake a customer who has waited three weeks", () => {
    const ranked = rankAllocationCandidates(
      battery,
      [
        candidate({ claimId: "c-near", customerName: "Near", distanceKm: 1, waitingSince: today }),
        candidate({ claimId: "c-far", customerName: "Far", distanceKm: 40, waitingSince: "2026-08-10" }),
      ],
      today,
    );
    expect(ranked.map((row) => row.customerName)).toEqual(["Far", "Near"]);
    expect(ranked[0].tierLabel).toBe("Waiting longer");
  });

  it("puts an expiring warranty above everyone, however far away", () => {
    const ranked = rankAllocationCandidates(
      battery,
      [
        ...waitingList,
        candidate({
          claimId: "c-urgent",
          customerName: "Deepak",
          distanceKm: 60,
          waitingSince: today,
          remainingWarrantyMonths: 1,
        }),
      ],
      today,
    );
    expect(ranked[0].customerName).toBe("Deepak");
    expect(ranked[0].tierLabel).toBe("Urgent warranty");
  });

  it("prefers the exact model code inside the same tier", () => {
    const ranked = rankAllocationCandidates(
      battery,
      [
        candidate({ claimId: "c-any", customerName: "Any code", modelCode: "OTHER/CODE" }),
        candidate({ claimId: "c-exact", customerName: "Exact code", modelCode: "lmkn/f2s" }),
      ],
      today,
    );
    expect(ranked[0].customerName).toBe("Exact code");
    expect(ranked[0].exactModelMatch).toBe(true);
  });

  it("drops customers the component cannot serve", () => {
    const ranked = rankAllocationCandidates(
      battery,
      [candidate({ componentType: "charger" }), candidate({ customerName: "Amit" })],
      today,
    );
    expect(ranked.map((row) => row.customerName)).toEqual(["Amit"]);
  });

  it("recommends nobody when nothing compatible is waiting", () => {
    expect(recommendedCandidate(battery, [candidate({ componentType: "motor" })], today)).toBeNull();
    expect(recommendedCandidate(battery, waitingList, today)?.customerName).toBe("Ravi");
  });

  it("honours dealer-tuned limits", () => {
    const ranked = rankAllocationCandidates(battery, waitingList, today, { nearbyKm: 20 });
    expect(ranked.map((row) => row.customerName)).toEqual(["Mohan", "Ravi", "Amit", "Suresh"]);
  });
});
