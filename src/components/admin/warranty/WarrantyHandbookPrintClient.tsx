"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SITE_ADDRESS, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import {
  DEFAULT_WARRANTY_POLICY,
  WARRANTY_START_BASIS_LABELS,
  policyMonthsFor,
} from "@/lib/component-warranty";
import {
  LETTER_ITEM_TYPE_ORDER,
  REPLACEMENT_ITEM_TYPE_LABELS,
} from "@/lib/replacement-parts";
import {
  WARRANTY_ROLES,
  WARRANTY_ROLE_LABELS,
  canViewAllWarrantyCases,
  type WarrantyRole,
} from "@/lib/warranty-roles";
import {
  WARRANTY_IDENTIFIER_LABEL,
  WARRANTY_SENT_BY_LABELS,
} from "@/lib/warranty-tracking";
import {
  WARRANTY_COMPANY_DELAY_DAYS,
  WARRANTY_CUSTOMER_WAITING_DAYS,
  WARRANTY_INSTALL_DELAY_DAYS,
  WARRANTY_STAGE_LABELS,
  warrantyRoleHasQueue,
} from "@/lib/warranty-workflow";

type Step = {
  title: string;
  owner: WarrantyRole;
  boardStage: string;
  points: string[];
};

const STEPS: Step[] = [
  {
    title: "Customer tells us the problem",
    owner: "intake",
    boardStage: "Not on the board yet",
    points: [
      "Listen and write the problem in simple words. Example: battery does not charge.",
      "Take the phone number, the bike number and the date of the complaint.",
      "Take photos of the bike and of the part that is not working.",
    ],
  },
  {
    title: "Create the claim in the portal",
    owner: "intake",
    boardStage: WARRANTY_STAGE_LABELS.ready_to_dispatch,
    points: [
      "Open a new warranty claim. Choose the bike and the part: battery, charger, motor or controller.",
      "Choose how the part will be sent: serial number or batch number. That choice is how we track it after it leaves.",
      "Type the complaint date. The portal itself shows if the warranty is still live.",
      "Save. The case gets its own number. Give that number to the customer.",
    ],
  },
  {
    title: "Remove the faulty part",
    owner: "technician",
    boardStage: WARRANTY_STAGE_LABELS.ready_to_dispatch,
    points: [
      "Take the part off the bike.",
      `Read the ${WARRANTY_IDENTIFIER_LABEL.toLowerCase()} from the part or the lot label and check it is the same in the portal.`,
      "Take one clear photo of that identifier.",
    ],
  },
  {
    title: "Send it to the plant with a challan",
    owner: "dispatch",
    boardStage: WARRANTY_STAGE_LABELS.with_company,
    points: [
      `Make the delivery challan. Write one line for each part with the ${WARRANTY_IDENTIFIER_LABEL.toLowerCase()} it is sent by.`,
      "In the claim, choose the plant and save the challan number and the send date.",
      "Keep the courier receipt and attach it to the claim.",
    ],
  },
  {
    title: "Follow up until it comes back",
    owner: "followup",
    boardStage: `${WARRANTY_STAGE_LABELS.with_company}, then ${WARRANTY_STAGE_LABELS.company_overdue}`,
    points: [
      "Call the company. Ask when the part will come back.",
      "Write what they said, and the date you called, in the claim.",
      `After ${WARRANTY_COMPANY_DELAY_DAYS} days the board marks the case late. Then tell your manager the same day.`,
    ],
  },
  {
    title: "Receive it back with the papers",
    owner: "receiving",
    boardStage: WARRANTY_STAGE_LABELS.awaiting_allocation,
    points: [
      "Open the box with the challan in hand. Count the parts.",
      "Match the part to the batch or serial it was sent under. If a unique serial comes back on a batch-sent part, add it. Do not erase the batch.",
      "Collect the credit note and the company bill. Attach both. Do not wait for them later.",
    ],
  },
  {
    title: "Install the part and do the coding",
    owner: "technician",
    boardStage: WARRANTY_STAGE_LABELS.awaiting_installation,
    points: [
      "Fit the part on the bike and finish the coding.",
      "In the claim, save the old serial number, the new serial number and the coding reference.",
      "Attach the coding proof: a photo of the screen or the slip.",
    ],
  },
  {
    title: "Claim closed",
    owner: "warranty_manager",
    boardStage: `${WARRANTY_STAGE_LABELS.awaiting_verification}, then ${WARRANTY_STAGE_LABELS.closed}`,
    points: [
      "The manager checks the serial numbers and the papers, then closes the case with a reason line.",
      "Call the customer and tell them the work is finished.",
      "A closed case still keeps its full history. Nobody deletes it.",
    ],
  },
];

const ROLE_JOBS: Record<WarrantyRole, string> = {
  owner: "Sees everything. Changes the warranty months and the staff list.",
  warranty_manager: "Checks the finished case and closes it.",
  intake: "Writes down the complaint and opens the claim.",
  dispatch: "Sends the faulty part to the plant with a challan.",
  followup: "Calls the company until the part comes back.",
  receiving: "Takes the part back into the store and checks the papers.",
  allocation: "Decides which waiting customer gets a ready part.",
  technician: "Removes the old part, fits the new one and does the coding.",
  accounts: "Collects the credit note, the company bill and the challan copies.",
  support: "Tells the customer where the case has reached.",
  auditor: "Only reads. Checks that nothing is missing.",
};

const DOCUMENTS: { when: string; papers: string }[] = [
  { when: "Step 1 — complaint", papers: "Photos of the bike and of the fault" },
  { when: "Step 3 — part removed", papers: "Photo of the serial number on the part" },
  { when: "Step 4 — sent to plant", papers: "Delivery challan, courier receipt" },
  { when: "Step 5 — follow up", papers: "No new paper. Only write the call notes." },
  {
    when: "Step 6 — part received back",
    papers: "Challan from the plant, credit note, company bill, repair document",
  },
  {
    when: "Step 7 — install and coding",
    papers: "Coding proof, photo of the new part fitted",
  },
  {
    when: "Step 8 — closing",
    papers: "No new paper. The manager checks that all of the above are attached.",
  },
];

const LIMITS: { limit: string; days: number; action: string }[] = [
  {
    limit: "Part is with the company",
    days: WARRANTY_COMPANY_DELAY_DAYS,
    action: "Call the plant, write their answer, and tell the manager the same day.",
  },
  {
    limit: "Customer is waiting for the case to finish",
    days: WARRANTY_CUSTOMER_WAITING_DAYS,
    action: "Call the customer with a date. Ask allocation for a ready part.",
  },
  {
    limit: "Part is kept for a customer but not fitted",
    days: WARRANTY_INSTALL_DELAY_DAYS,
    action: "Fit it today, or call the customer to bring the bike.",
  },
];

export function WarrantyHandbookPrintClient() {
  const printedOn = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div
        className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden"
        data-print-hide
      >
        <p className="text-sm text-slate-400">
          Press the button, then choose Save as PDF in the print window.{" "}
          <Link href="/admin/warranty" className="text-blue-300 hover:underline">
            Back to the warranty board
          </Link>
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="text-slate-300 print:text-black">
        <header className="mb-6 border-b-2 border-slate-700 pb-4 print:border-black">
          <h1 className="text-2xl font-bold text-white print:text-black">
            How to handle a warranty case
          </h1>
          <p className="mt-1 text-sm">
            {SITE_NAME} — staff guide. Keep one printed copy at the counter.
          </p>
          <p className="text-sm">
            {SITE_ADDRESS} · Phone: {SITE_PHONE}
          </p>
          <p className="mt-2 text-sm">Printed on {printedOn}</p>
        </header>

        <SectionTitle number={1} title="The 8 steps of every warranty case" />
        <p className="mb-4 text-sm">
          Do them in this order. Never skip a step. The board always shows you the next step, so you
          do not have to remember it.
        </p>
        <ol className="mb-8 space-y-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-lg border border-slate-800 p-3 print:break-inside-avoid print:rounded-none print:border-black"
            >
              <p className="font-semibold text-white print:text-black">
                Step {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm">
                Who does it: {WARRANTY_ROLE_LABELS[step.owner]} · On the board: {step.boardStage}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {step.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="print:break-before-page">
          <SectionTitle number={2} title="Who does what" />
          <p className="mb-3 text-sm">
            Each person owns one job. The owner and the warranty manager see every case. All other
            staff see only the cases waiting on them.
          </p>
          <table className="mb-8 w-full text-left text-sm print:break-inside-avoid">
            <thead>
              <tr>
                <Th>Role</Th>
                <Th>The one job it owns</Th>
                <Th>Sees</Th>
              </tr>
            </thead>
            <tbody>
              {WARRANTY_ROLES.map((role) => (
                <tr key={role}>
                  <Td>{WARRANTY_ROLE_LABELS[role]}</Td>
                  <Td>{ROLE_JOBS[role]}</Td>
                  <Td>
                    {canViewAllWarrantyCases(role)
                      ? "Every case"
                      : warrantyRoleHasQueue(role)
                        ? "Own list only"
                        : "Nothing to action"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionTitle number={3} title="How long the warranty runs" />
        <table className="mb-3 w-full text-left text-sm print:break-inside-avoid">
          <thead>
            <tr>
              <Th>Part</Th>
              <Th>Warranty</Th>
            </tr>
          </thead>
          <tbody>
            {LETTER_ITEM_TYPE_ORDER.map((type) => (
              <tr key={type}>
                <Td>{REPLACEMENT_ITEM_TYPE_LABELS[type]}</Td>
                <Td>{policyMonthsFor(type)} months</Td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mb-8 list-disc space-y-1 pl-5 text-sm">
          <li>
            Counting starts from the {WARRANTY_START_BASIS_LABELS[
              DEFAULT_WARRANTY_POLICY.startBasis
            ].toLowerCase()}.
          </li>
          <li>
            The portal works out the end date. Never count months by hand and never tell a customer a
            date from memory.
          </li>
          <li>
            The battery and the charger on the same bike finish on different dates. That is correct.
          </li>
          <li>
            The portal warns you {DEFAULT_WARRANTY_POLICY.expiringSoonDays} days before a warranty
            ends.
          </li>
          <li>
            These months are a setting. Only the owner can change them, and then the portal follows
            the new number everywhere.
          </li>
        </ul>

        <SectionTitle number={4} title="Three rules for serial numbers" />
        <ol className="mb-8 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <span className="font-semibold text-white print:text-black">
              Never change one serial number into another one.
            </span>{" "}
            A serial number is one real part. If it is typed wrong, ask for a correction with a
            reason. Do not overwrite it.
          </li>
          <li>
            <span className="font-semibold text-white print:text-black">
              Removing and fitting is a link, not a rewrite.
            </span>{" "}
            When you take a part off a bike, the portal only records that it left the bike. When you
            fit it, it records that it joined a bike.
          </li>
          <li>
            <span className="font-semibold text-white print:text-black">
              A replacement part is a new record, joined to the old one.
            </span>{" "}
            If battery BAT-111 goes and BAT-222 comes back, the portal keeps both and remembers that
            BAT-222 replaced BAT-111.
          </li>
        </ol>
        <p className="mb-8 text-sm">
          Why this matters: after two or three years a customer comes back and asks what was changed
          on the bike. If somebody had typed over the old serial number, that history would be gone
          for ever, and we could not claim from the company either.
        </p>

        <SectionTitle number={5} title="Sent by serial or sent by batch" />
        <p className="mb-3 text-sm">
          Tracking follows how the part was sent on the challan. It is not a later guess.
        </p>
        <ul className="mb-8 list-disc space-y-2 pl-5 text-sm">
          <li>
            <span className="font-semibold text-white print:text-black">
              {WARRANTY_SENT_BY_LABELS.serial}.
            </span>{" "}
            Follow-up, receiving, allocation and search use that serial. Do not later collapse it
            into a batch.
          </li>
          <li>
            <span className="font-semibold text-white print:text-black">
              {WARRANTY_SENT_BY_LABELS.batch}.
            </span>{" "}
            Follow-up, receiving, allocation and search use that batch. A batch can cover more than
            one piece. Keep the quantity.
          </li>
          <li>
            Intake or the warranty manager chooses serial or batch when the claim is created or
            sent. After dispatch, only the manager or owner may correct that choice, and only with a
            reason. Dispatch, store and mechanic cannot change it.
          </li>
          <li>
            If a batch-sent part comes back with a unique serial, add the serial as extra history.
            Never delete the batch it was sent under.
          </li>
          <li>
            One claim has one sent-as mode. Mixed is fine across claims: one battery by batch,
            another by serial.
          </li>
          <li>
            Staff type a {WARRANTY_IDENTIFIER_LABEL.toLowerCase()}. Receiving must not invent the
            identifier that was not on the challan.
          </li>
        </ul>

        <div className="print:break-before-page">
          <SectionTitle number={6} title="Papers to collect at each step" />
          <p className="mb-3 text-sm">
            Attach the paper on the same day. A case with missing papers cannot be closed.
          </p>
          <table className="mb-8 w-full text-left text-sm print:break-inside-avoid">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>What to attach</Th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENTS.map((row) => (
                <tr key={row.when}>
                  <Td>{row.when}</Td>
                  <Td>{row.papers}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <SectionTitle number={7} title="Time limits" />
          <p className="mb-3 text-sm">
            The portal counts the days for you. When a limit is crossed, the case turns red on the
            board.
          </p>
          <table className="mb-8 w-full text-left text-sm print:break-inside-avoid">
            <thead>
              <tr>
                <Th>Situation</Th>
                <Th>Limit</Th>
                <Th>When it is crossed</Th>
              </tr>
            </thead>
            <tbody>
              {LIMITS.map((row) => (
                <tr key={row.limit}>
                  <Td>{row.limit}</Td>
                  <Td>{row.days} days</Td>
                  <Td>{row.action}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print:break-before-page">
          <SectionTitle number={8} title="Nothing is ever deleted" />
          <ul className="mb-8 list-disc space-y-1 pl-5 text-sm">
            <li>A wrong claim is cancelled with a reason. It stays visible.</li>
            <li>A wrong entry is corrected with a reason. The old value stays in the history.</li>
            <li>A wrong action is reversed with a reason. Ask the manager if you are not sure.</li>
            <li>
              Never remove a claim, a part or a serial number from the portal. If something looks
              wrong, ask instead of fixing it quietly.
            </li>
          </ul>

          <p className="text-sm">
            Not sure what to do next? Open the warranty board. It always shows the next step for your
            case. If it is still not clear, ask the warranty manager before you promise anything to
            the customer.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <h2 className="mb-2 border-b border-slate-700 pb-1 text-lg font-semibold text-white print:break-after-avoid print:border-black print:text-black">
      {number}. {title}
    </h2>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-700 px-2 py-1 align-top font-semibold text-white print:border-black print:text-black">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border border-slate-700 px-2 py-1 align-top print:border-black">{children}</td>
  );
}
