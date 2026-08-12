import Link from "next/link";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";
import { SITE_ADDRESS, SITE_EMAIL, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: `Cancellation and refund policy for online bookings, services, and purchases at ${SITE_NAME}.`,
};

const LAST_UPDATED = "12 August 2026";

export default function RefundPolicyPage() {
  return (
    <PolicyLayout title="Cancellation & Refund Policy" lastUpdated={LAST_UPDATED}>
      <PolicySection title="1. Overview">
        <p>
          This policy explains cancellations and refunds for {SITE_NAME} regarding online e-scooter
          bookings, booking payments collected through Razorpay, promotional cash refunds offered on
          selected models, service appointments, and vehicle sales. By booking or paying online, you
          agree to this policy.
        </p>
      </PolicySection>

      <PolicySection title="2. Online booking payment (Razorpay)">
        <p>
          Some e-scooter models require an online booking payment to confirm your booking. This
          amount is shown on the vehicle page or booking form before you pay. Payments are processed
          securely through Razorpay (UPI, cards, net banking, or wallets as available).
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-200">Booking confirmation:</strong> your booking is
            confirmed after successful payment and our team verifies availability.
          </li>
          <li>
            <strong className="text-slate-200">Payment records:</strong> keep your payment reference
            or confirmation email/SMS for support.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="3. Cancellation by customer">
        <p>If you wish to cancel an online booking:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Contact us as soon as possible at {SITE_PHONE} or {SITE_EMAIL} with your name, phone
            number, and booking reference.
          </li>
          <li>
            Cancellations made <strong className="text-slate-200">before</strong> we confirm
            delivery or handover may be eligible for a refund of the online booking payment, minus
            any payment gateway charges retained by the bank or Razorpay (if applicable).
          </li>
          <li>
            After vehicle allocation, registration processing, or delivery scheduling, cancellation
            may not qualify for a full refund.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="4. Refund of online booking payment">
        <p>Eligible refunds of the online booking amount are processed as follows:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Refunds are returned to the original payment method where possible (Razorpay/bank rules apply).</li>
          <li>Processing time is typically 5–10 working days after approval, depending on your bank or UPI provider.</li>
          <li>We will notify you by phone or email once a refund is initiated.</li>
          <li>Failed or duplicate payments verified by our team will be refunded after investigation.</li>
        </ul>
        <p>
          To request a refund, email {SITE_EMAIL} with your booking ID, payment date, and reason for
          cancellation.
        </p>
      </PolicySection>

      <PolicySection title="5. Promotional cash refund (online booking offers)">
        <p>
          Selected e-scooter models may show a promotional cash refund amount when you book online.
          This is a separate showroom offer from {SITE_NAME}, not an automatic Razorpay reversal.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The cash refund amount is displayed on the model page or booking form at the time of booking.</li>
          <li>
            Eligibility, payout timing, and conditions are explained by our sales team at booking or
            delivery.
          </li>
          <li>
            Promotional cash refunds are void if the booking is cancelled, fraudulent, or if terms
            communicated at purchase are not met.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="6. Service appointment cancellation">
        <p>
          For doorstep or workshop service bookings made through{" "}
          <Link href="/book-service" className="text-red-400 hover:text-red-300">
            Book Service
          </Link>
          :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Cancel or reschedule at least 24 hours before the appointment when possible.</li>
          <li>Prepaid service charges, if any, may be adjusted or refunded at our discretion for genuine cancellations.</li>
          <li>No-shows without notice may forfeit prepaid amounts.</li>
        </ul>
      </PolicySection>

      <PolicySection title="7. Vehicle sales & exchanges">
        <p>
          Refunds for completed vehicle purchases follow the sale agreement signed at the showroom.
          Deposits and booking amounts may be non-refundable after a certain stage of processing.
          Please confirm refund terms with our sales executive before paying.
        </p>
      </PolicySection>

      <PolicySection title="8. Cancellation by Auto Galaxy">
        <p>
          We may cancel a booking if a model becomes unavailable, pricing was listed in error, or
          payment could not be verified. In such cases, any amount paid online will be refunded in
          full through the original payment channel.
        </p>
      </PolicySection>

      <PolicySection title="9. Non-refundable situations">
        <p>Refunds may not be provided when:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The customer provided incorrect contact or payment details</li>
          <li>The booking was made under false pretences or violates our terms</li>
          <li>Custom-ordered or registered vehicles have already entered processing</li>
          <li>Third-party payment disputes are raised without contacting us first</li>
        </ul>
      </PolicySection>

      <PolicySection title="10. Shipping & delivery">
        <p>
          {SITE_NAME} primarily serves customers in Lalitpur and nearby areas. Delivery timelines,
          pickup options, and any delivery charges are confirmed by our team after booking. Risk of
          loss passes to the customer upon handover or confirmed delivery as per the sale agreement.
        </p>
      </PolicySection>

      <PolicySection title="11. Contact for refunds">
        <p>
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
            Contact page
          </Link>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
