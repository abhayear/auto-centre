import { describe, expect, it } from "vitest";
import {
  WARRANTY_EXCEPTION_ACTIONS,
  WARRANTY_EXCEPTION_KINDS,
  buildWarrantyBoard,
  buildWarrantyPipeline,
  buildWarrantyTasks,
  canUseWarrantyBoard,
  detectWarrantyExceptions,
  warrantyDaysBetween,
  warrantyRoleHasQueue,
  warrantyStageFor,
  warrantyTaskFor,
  type WarrantyCase,
  type WarrantyStockRow,
} from "@/lib/warranty-workflow";

const today = "2026-10-10";

function claim(overrides: Partial<WarrantyCase> = {}): WarrantyCase {
  return {
    id: "claim-1",
    caseNumber: "WC-0001",
    customerName: "Rajesh Kumar",
    status: "received_from_customer",
    destination: "plant",
    receivedDate: "2026-10-08",
    sentToCompanyDate: null,
    companyInvoiceNumber: null,
    returnedToCustomerDate: null,
    allocatedStockId: null,
    items: [
      {
        itemType: "battery",
        side: "old",
        modelCode: "LMKN/F2S",
        serialNumber: "BAT-8821",
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

function stock(overrides: Partial<WarrantyStockRow> = {}): WarrantyStockRow {
  return {
    id: "stock-1",
    itemType: "battery",
    modelCode: "LMKN/F2S",
    serialNumber: "BAT-9001",
    status: "available",
    receivedDate: "2026-10-05",
    sourceClaimId: "claim-9",
    allocatedClaimId: null,
    allocatedAt: null,
    ...overrides,
  };
}

describe("warrantyStageFor", () => {
  it("starts a new claim at ready to dispatch", () => {
    expect(warrantyStageFor(claim(), today)).toBe("ready_to_dispatch");
  });

  it("holds a dispatched claim with the company until the delay limit", () => {
    const sent = claim({
      status: "sent_to_company",
      receivedDate: "2026-09-28",
      sentToCompanyDate: "2026-10-01",
    });
    expect(warrantyStageFor(sent, today)).toBe("with_company");
  });

  it("flags a claim that sat with the company past the limit", () => {
    const stale = claim({
      status: "sent_to_company",
      receivedDate: "2026-08-20",
      sentToCompanyDate: "2026-09-01",
    });
    expect(warrantyStageFor(stale, today)).toBe("company_overdue");
  });

  it("moves a returned component to allocation, then installation", () => {
    const received = claim({ status: "received_from_company" });
    expect(warrantyStageFor(received, today)).toBe("awaiting_allocation");
    expect(warrantyStageFor({ ...received, allocatedStockId: "stock-1" }, today)).toBe(
      "awaiting_installation",
    );
  });

  it("sends an installed claim to the manager for verification", () => {
    const installed = claim({
      status: "returned_to_customer",
      returnedToCustomerDate: "2026-10-09",
    });
    expect(warrantyStageFor(installed, today)).toBe("awaiting_verification");
  });

  it("parks closed and cancelled claims", () => {
    expect(warrantyStageFor(claim({ status: "closed" }), today)).toBe("closed");
    expect(warrantyStageFor(claim({ status: "cancelled" }), today)).toBe("cancelled");
  });
});

describe("warrantyTaskFor", () => {
  it("routes each stage to the role that owns the next step", () => {
    expect(warrantyTaskFor(claim(), today)?.ownerRole).toBe("dispatch");
    expect(
      warrantyTaskFor(
        claim({ status: "sent_to_company", receivedDate: "2026-09-28", sentToCompanyDate: "2026-10-01" }),
        today,
      )?.ownerRole,
    ).toBe("followup");
    expect(warrantyTaskFor(claim({ status: "received_from_company" }), today)?.ownerRole).toBe(
      "allocation",
    );
    expect(warrantyTaskFor(claim({ allocatedStockId: "stock-1" }), today)?.ownerRole).toBe(
      "technician",
    );
    expect(
      warrantyTaskFor(
        claim({ status: "returned_to_customer", returnedToCustomerDate: "2026-10-09" }),
        today,
      )?.ownerRole,
    ).toBe("warranty_manager");
  });

  it("creates no task for a closed claim", () => {
    expect(warrantyTaskFor(claim({ status: "closed" }), today)).toBeNull();
    expect(warrantyTaskFor(claim({ status: "cancelled" }), today)).toBeNull();
  });

  it("ages the task from the date the stage started", () => {
    const task = warrantyTaskFor(
      claim({ status: "sent_to_company", receivedDate: "2026-09-28", sentToCompanyDate: "2026-10-01" }),
      today,
    );
    expect(task?.ageDays).toBe(9);
    expect(task?.overdue).toBe(false);
  });

  it("marks a task overdue once the customer has waited too long", () => {
    const task = warrantyTaskFor(claim({ receivedDate: "2026-09-01" }), today);
    expect(task?.overdue).toBe(true);
  });

  it("puts overdue work at the top of the queue", () => {
    const tasks = buildWarrantyTasks(
      [claim(), claim({ id: "claim-2", customerName: "Sita", receivedDate: "2026-09-01" })],
      today,
    );
    expect(tasks.map((task) => task.claimId)).toEqual(["claim-2", "claim-1"]);
  });
});

describe("WARRANTY_EXCEPTION_ACTIONS", () => {
  it("tells the manager what to do for every problem kind", () => {
    for (const kind of WARRANTY_EXCEPTION_KINDS) {
      expect(WARRANTY_EXCEPTION_ACTIONS[kind].length).toBeGreaterThan(10);
    }
  });
});

describe("detectWarrantyExceptions", () => {
  it("raises a company delay past the limit", () => {
    const exceptions = detectWarrantyExceptions(
      [
        claim({
          status: "sent_to_company",
          receivedDate: "2026-09-05",
          sentToCompanyDate: "2026-09-06",
        }),
      ],
      [],
      today,
    );
    expect(exceptions.map((row) => row.kind)).toContain("company_delay");
    expect(exceptions.map((row) => row.kind)).toContain("customer_waiting");
  });

  it("raises a missing serial number", () => {
    const exceptions = detectWarrantyExceptions(
      [claim({ items: [{ itemType: "battery", side: "old", serialNumber: "  ", quantity: 1 }] })],
      [],
      today,
    );
    expect(exceptions.map((row) => row.kind)).toEqual(["serial_missing"]);
  });

  it("does not raise serial_missing when the claim is tracked by batch", () => {
    const exceptions = detectWarrantyExceptions(
      [
        claim({
          trackingMode: "batch",
          items: [
            {
              itemType: "battery",
              side: "old",
              serialNumber: null,
              batchNumber: "BAT-LOT-2026-08",
              trackingMode: "batch",
              quantity: 2,
            },
          ],
        }),
      ],
      [],
      today,
    );
    expect(exceptions.map((row) => row.kind)).not.toContain("serial_missing");
  });

  it("allows many open claims to share one batch unless bike, customer, and part match", () => {
    const batchItem = {
      itemType: "battery",
      side: "old" as const,
      serialNumber: null,
      batchNumber: "BAT-LOT-2026-08",
      trackingMode: "batch" as const,
      quantity: 1,
    };
    const differentCustomer = detectWarrantyExceptions(
      [
        claim({
          trackingMode: "batch",
          items: [batchItem],
        }),
        claim({
          id: "claim-2",
          caseNumber: "WC-0002",
          customerName: "Sita",
          trackingMode: "batch",
          items: [batchItem],
        }),
      ],
      [],
      today,
    );
    expect(differentCustomer.map((row) => row.kind)).not.toContain("duplicate_serial");
    expect(differentCustomer.map((row) => row.kind)).not.toContain("duplicate_batch");

    const sameCustomerAndPart = detectWarrantyExceptions(
      [
        claim({
          trackingMode: "batch",
          customerName: "Rajesh Kumar",
          bikeNumber: "EB1025",
          items: [batchItem],
        }),
        claim({
          id: "claim-2",
          caseNumber: "WC-0002",
          trackingMode: "batch",
          customerName: "Rajesh Kumar",
          bikeNumber: "EB1025",
          items: [batchItem],
        }),
      ],
      [],
      today,
    );
    expect(sameCustomerAndPart.map((row) => row.kind)).toContain("duplicate_batch");
  });

  it("raises a duplicate claim on one serial", () => {
    const exceptions = detectWarrantyExceptions(
      [claim(), claim({ id: "claim-2", caseNumber: "WC-0002", customerName: "Sita" })],
      [],
      today,
    );
    const duplicate = exceptions.find((row) => row.kind === "duplicate_serial");
    expect(duplicate?.reference).toBe("BAT-8821");
    expect(duplicate?.detail).toContain("WC-0002");
  });

  it("raises a missing credit note and unavailable replacement after receiving", () => {
    const exceptions = detectWarrantyExceptions(
      [claim({ status: "received_from_company" })],
      [],
      today,
    );
    expect(exceptions.map((row) => row.kind)).toContain("credit_note_missing");
    expect(exceptions.map((row) => row.kind)).toContain("replacement_unavailable");
  });

  it("clears both once stock exists and the credit note is recorded", () => {
    const exceptions = detectWarrantyExceptions(
      [claim({ status: "received_from_company", companyInvoiceNumber: "CN-77" })],
      [stock()],
      today,
    );
    expect(exceptions.map((row) => row.kind)).not.toContain("credit_note_missing");
    expect(exceptions.map((row) => row.kind)).not.toContain("replacement_unavailable");
  });

  it("chases a component that was allocated but never installed", () => {
    const exceptions = detectWarrantyExceptions(
      [claim({ allocatedStockId: "stock-1" })],
      [stock({ status: "allocated", allocatedClaimId: "claim-1", allocatedAt: "2026-10-02" })],
      today,
    );
    expect(exceptions.map((row) => row.kind)).toContain("allocated_not_installed");
  });

  it("raises stock received with no matching claim", () => {
    const exceptions = detectWarrantyExceptions([], [stock({ sourceClaimId: null })], today);
    expect(exceptions.map((row) => row.kind)).toEqual(["stock_without_claim"]);
  });

  it("ignores closed claims", () => {
    expect(detectWarrantyExceptions([claim({ status: "closed" })], [], today)).toEqual([]);
  });
});

describe("buildWarrantyBoard", () => {
  const claims = [
    claim(),
    claim({
      id: "claim-2",
      caseNumber: "WC-0002",
      customerName: "Sita",
      status: "sent_to_company",
      receivedDate: "2026-08-20",
      sentToCompanyDate: "2026-09-01",
      items: [{ itemType: "battery", side: "old", serialNumber: "BAT-7000", quantity: 1 }],
    }),
    claim({
      id: "claim-3",
      caseNumber: "WC-0003",
      customerName: "Anil",
      status: "received_from_company",
      companyInvoiceNumber: "CN-12",
      items: [{ itemType: "charger", side: "old", serialNumber: "CHG-4491", quantity: 1 }],
    }),
    claim({ id: "claim-4", caseNumber: "WC-0004", customerName: "Old case", status: "closed" }),
  ];

  it("counts the manager dashboard from live claims", () => {
    const board = buildWarrantyBoard("warranty_manager", claims, [stock()], today);
    expect(board.counts.openClaims).toBe(3);
    expect(board.counts.readyToDispatch).toBe(1);
    expect(board.counts.withCompany).toBe(1);
    expect(board.counts.overdueWithCompany).toBe(1);
    expect(board.counts.awaitingAllocation).toBe(1);
    expect(board.counts.customerWaiting).toBe(1);
    expect(board.counts.exceptions).toBeGreaterThan(0);
    expect(board.pendingFromCompany.battery).toBe(1);
    expect(board.pendingFromCompany.charger).toBe(1);
    expect(board.pendingFromCompany.total).toBe(2);
    expect(board.counts.pendingFromCompanyItems).toBe(2);
  });

  it("counts pieces pending from the company, not just claims", () => {
    const board = buildWarrantyBoard(
      "warranty_manager",
      [
        claim({
          id: "batch-4",
          status: "sent_to_company",
          sentToCompanyDate: "2026-10-01",
          items: [{ itemType: "battery", side: "old", batchNumber: "BAT-LOT-1", quantity: 4 }],
        }),
        claim({
          id: "partial",
          status: "received_from_company",
          items: [
            { itemType: "charger", side: "old", serialNumber: "CHG-1", quantity: 2 },
            { itemType: "charger", side: "new", serialNumber: "CHG-2", quantity: 1 },
          ],
        }),
      ],
      [],
      today,
    );
    expect(board.pendingFromCompany.battery).toBe(4);
    expect(board.pendingFromCompany.charger).toBe(1);
    expect(board.pendingFromCompany.total).toBe(5);
  });

  it("shows every queue and exception to a supervisor", () => {
    const board = buildWarrantyBoard("warranty_manager", claims, [stock()], today);
    expect(board.seesAllCases).toBe(true);
    expect(board.queues.map((queue) => queue.role)).toEqual([
      "dispatch",
      "followup",
      "receiving",
      "allocation",
      "accounts",
    ]);
    expect(board.exceptions.length).toBeGreaterThan(0);
  });

  it("gives receiving the items coming back and accounts the paperwork", () => {
    const receiving = buildWarrantyBoard("receiving", claims, [stock()], today);
    expect(receiving.myTasks.map((task) => task.claimId)).toEqual(["claim-2"]);

    const accounts = buildWarrantyBoard("accounts", claims, [stock()], today);
    expect(accounts.myTasks.map((task) => task.claimId)).toEqual(["claim-3"]);
  });

  it("shows an executive only their own tasks", () => {
    const board = buildWarrantyBoard("dispatch", claims, [stock()], today);
    expect(board.seesAllCases).toBe(false);
    expect(board.queues).toEqual([]);
    expect(board.exceptions).toEqual([]);
    expect(board.myTasks.map((task) => task.claimId)).toEqual(["claim-1"]);
  });

  it("gives a technician no tasks when nothing is allocated", () => {
    const board = buildWarrantyBoard("technician", claims, [stock()], today);
    expect(board.myTasks).toEqual([]);
  });
});

describe("buildWarrantyPipeline", () => {
  it("places every claim on one strip from complaint to closed", () => {
    const pipeline = buildWarrantyPipeline(
      [
        claim(),
        claim({
          id: "claim-2",
          status: "sent_to_company",
          receivedDate: "2026-09-28",
          sentToCompanyDate: "2026-10-01",
        }),
        claim({ id: "claim-3", status: "received_from_company" }),
        claim({ id: "claim-4", allocatedStockId: "stock-1" }),
        claim({
          id: "claim-5",
          status: "returned_to_customer",
          returnedToCustomerDate: "2026-10-09",
        }),
        claim({ id: "claim-6", status: "closed" }),
      ],
      today,
    );

    expect(pipeline.map((stage) => [stage.step, stage.count])).toEqual([
      ["complaint_received", 1],
      ["with_company", 1],
      ["received_back", 1],
      ["waiting_installation", 1],
      ["installed_coded", 1],
      ["closed", 1],
    ]);
  });

  it("keeps every step visible when nothing is in it", () => {
    const pipeline = buildWarrantyPipeline([], today);
    expect(pipeline).toHaveLength(6);
    expect(pipeline.every((stage) => stage.count === 0)).toBe(true);
    expect(pipeline[0].label).toBe("Complaint received");
  });
});

describe("canUseWarrantyBoard", () => {
  it("opens the board to supervisors and queue owners", () => {
    expect(canUseWarrantyBoard("admin")).toBe(true);
    expect(canUseWarrantyBoard("manager")).toBe(true);
    expect(canUseWarrantyBoard("purchasing")).toBe(true);
    expect(canUseWarrantyBoard("store")).toBe(true);
    expect(canUseWarrantyBoard("mechanic")).toBe(true);
  });

  it("keeps out staff with no warranty queue", () => {
    expect(canUseWarrantyBoard("sales")).toBe(false);
    expect(canUseWarrantyBoard("senior_developer")).toBe(false);
    expect(canUseWarrantyBoard("junior_developer")).toBe(false);
  });

  it("knows which warranty roles own a queue", () => {
    expect(warrantyRoleHasQueue("dispatch")).toBe(true);
    expect(warrantyRoleHasQueue("receiving")).toBe(true);
    expect(warrantyRoleHasQueue("accounts")).toBe(true);
    expect(warrantyRoleHasQueue("warranty_manager")).toBe(true);
    expect(warrantyRoleHasQueue("support")).toBe(false);
    expect(warrantyRoleHasQueue("intake")).toBe(false);
  });
});

describe("warrantyDaysBetween", () => {
  it("counts whole days and never goes negative", () => {
    expect(warrantyDaysBetween("2026-10-01", today)).toBe(9);
    expect(warrantyDaysBetween("2026-10-20", today)).toBe(0);
  });
});
