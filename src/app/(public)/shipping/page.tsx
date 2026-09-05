import Link from "next/link";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";
import { SITE_ADDRESS, SITE_EMAIL, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping and Exchange",
  description: `Shipping, delivery, pickup, and exchange policy for ${SITE_NAME} e-scooters, parts, and services.`,
};

const LAST_UPDATED = "5 September 2026";

export default function ShippingAndExchangePage() {
  return (
    <PolicyLayout title="Shipping and Exchange" lastUpdated={LAST_UPDATED}>
      <PolicySection title="1. Overview">
        <p>
          {SITE_NAME} is a showroom and service centre at {SITE_ADDRESS}. We do not operate a
          nationwide e-commerce courier for complete vehicles. This policy covers showroom handover,
          local delivery where offered, spare parts / replacement items, and vehicle or part
          exchanges.
        </p>
      </PolicySection>

      <PolicySection title="2. E-scooter delivery and pickup">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-200">Showroom pickup:</strong> the default option. You
            collect the vehicle from our Lalitpur showroom after payment, documents, and inspection.
          </li>
          <li>
            <strong className="text-slate-200">Local delivery:</strong> home or locality delivery in
            Lalitpur and nearby service areas may be arranged after booking. Charges, if any, and
            the delivery date are confirmed by phone or email before dispatch.
          </li>
          <li>
            <strong className="text-slate-200">Timelines:</strong> ready-stock vehicles are typically
            handed over within a few working days after booking confirmation and paperwork. Ordered
            or out-of-stock models follow manufacturer supply times, which we will communicate.
          </li>
          <li>
            Risk and title pass as stated on the sale invoice / agreement, usually on handover or
            confirmed delivery.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="3. Shipping of spare parts and accessories">
        <p>
          Replacement parts, batteries, and accessories may be collected from the showroom or sent
          by courier when we agree in writing. Courier cost, packing, and transit risk are confirmed
          before dispatch. Transit times depend on the courier and destination.
        </p>
      </PolicySection>

      <PolicySection title="4. Inspection on receipt">
        <p>
          Please inspect the vehicle or parts at handover. Note visible damage on the delivery
          document and contact us the same day at {SITE_PHONE} or {SITE_EMAIL}. Hidden defects are
          handled under manufacturer warranty or our{" "}
          <Link href="/refund-policy" className="text-red-400 hover:text-red-300">
            Cancellation and Refund
          </Link>{" "}
          policy, as applicable.
        </p>
      </PolicySection>

      <PolicySection title="5. Vehicle exchange">
        <p>
          Used or new vehicle exchange (trade-in) is evaluated at the showroom. Valuation, documents,
          and any balance payable or refundable are agreed in writing before the exchange is
          completed. Online booking amounts may be adjusted against the final invoice as per the
          sales team.
        </p>
        <p>
          We do not offer an unrestricted &quot;change of mind&quot; exchange after registration or
          after the vehicle has been used, except where required by law or the manufacturer.
        </p>
      </PolicySection>

      <PolicySection title="6. Parts exchange and warranty replacements">
        <p>
          Faulty parts returned under warranty or our replacement-parts process are exchanged after
          inspection. Turnaround depends on company / supplier stock. We will update you when the
          replacement is ready for collection or delivery.
        </p>
      </PolicySection>

      <PolicySection title="7. Failed delivery">
        <p>
          If delivery cannot be completed because of an incorrect address, unreachable phone, or
          refused handover, we may reschedule. Extra trip charges may apply. Repeated failure may
          be treated as cancellation under the refund policy.
        </p>
      </PolicySection>

      <PolicySection title="8. International shipping">
        <p>We do not ship e-scooters or parts outside India unless expressly agreed in writing.</p>
      </PolicySection>

      <PolicySection title="9. Contact">
        <p>
          For shipping or exchange queries:
          <br />
          {SITE_NAME}
          <br />
          {SITE_ADDRESS}
          <br />
          Phone: {SITE_PHONE}
          <br />
          Email:{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="text-red-400 hover:text-red-300">
            {SITE_EMAIL}
          </a>
          <br />
          <Link href="/contact" className="text-red-400 hover:text-red-300">
            Contact Us
          </Link>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
