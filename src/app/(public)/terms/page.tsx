import Link from "next/link";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";
import { SITE_ADDRESS, SITE_EMAIL, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: `Terms and conditions for using the ${SITE_NAME} website, showroom, bookings, and payments.`,
};

const LAST_UPDATED = "5 September 2026";

export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout title="Terms and Conditions" lastUpdated={LAST_UPDATED}>
      <PolicySection title="1. Agreement">
        <p>
          These Terms and Conditions (&quot;Terms&quot;) govern your use of the {SITE_NAME} website
          at autogalaxy.in, our showroom at {SITE_ADDRESS}, and related services including e-scooter
          sales, service bookings, and online payments. By accessing the website or placing a
          booking, you agree to these Terms.
        </p>
        <p>
          If you do not agree, please do not use the website or make an online payment.
        </p>
      </PolicySection>

      <PolicySection title="2. About us">
        <p>
          {SITE_NAME} sells and services electric two-wheelers in Lalitpur, Uttar Pradesh. Contact:
          phone {SITE_PHONE}, email {SITE_EMAIL}. Business hours are listed on our{" "}
          <Link href="/contact" className="text-red-400 hover:text-red-300">
            Contact Us
          </Link>{" "}
          page.
        </p>
      </PolicySection>

      <PolicySection title="3. Eligibility">
        <p>
          You must be legally capable of entering a contract under Indian law. For vehicle purchase,
          you must provide accurate identity, address, and contact details required for invoicing
          and registration.
        </p>
      </PolicySection>

      <PolicySection title="4. Website content and pricing">
        <p>
          Vehicle listings, prices, images, and offers are published in good faith and may change
          without notice. Stock, colours, and accessories are subject to availability. Obvious
          pricing errors may be corrected; we may cancel a booking and refund any online payment in
          that case.
        </p>
      </PolicySection>

      <PolicySection title="5. Online bookings and payments">
        <p>
          Selected models require an online booking amount paid through Razorpay. Payment confirms
          your request; final sale is completed at the showroom after verification, documentation,
          and handover. Online payment methods (UPI, cards, EMI, Pay Later, net banking, wallets)
          appear only when enabled by Razorpay and eligible for the amount charged.
        </p>
        <p>
          You authorise us and Razorpay to process the displayed amount. Chargebacks or disputes
          should be raised with us first at {SITE_EMAIL}.
        </p>
      </PolicySection>

      <PolicySection title="6. Service bookings">
        <p>
          Workshop and doorstep service appointments booked on this website are requests until our
          team confirms. Coverage areas, charges, and parts are confirmed separately. See also our{" "}
          <Link href="/refund-policy" className="text-red-400 hover:text-red-300">
            Cancellation and Refund
          </Link>{" "}
          policy.
        </p>
      </PolicySection>

      <PolicySection title="7. Delivery, shipping, and exchange">
        <p>
          Delivery, pickup, spare-part movement, and vehicle exchange are described in our{" "}
          <Link href="/shipping" className="text-red-400 hover:text-red-300">
            Shipping and Exchange
          </Link>{" "}
          policy.
        </p>
      </PolicySection>

      <PolicySection title="8. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Submit false bookings, fake payment references, or abusive communications</li>
          <li>Attempt to disrupt, scrape excessively, or gain unauthorised access to the site</li>
          <li>Use the site for any unlawful purpose</li>
        </ul>
      </PolicySection>

      <PolicySection title="9. Intellectual property">
        <p>
          Website design, logos, text, and photographs belong to {SITE_NAME} or their licensors.
          You may not copy them for commercial use without written permission.
        </p>
      </PolicySection>

      <PolicySection title="10. Limitation of liability">
        <p>
          To the extent permitted by law, {SITE_NAME} is not liable for indirect or consequential
          loss arising from use of the website. Vehicle warranties follow the manufacturer and the
          sale invoice. Nothing in these Terms limits liability that cannot be excluded under Indian
          consumer law.
        </p>
      </PolicySection>

      <PolicySection title="11. Privacy">
        <p>
          Personal data is handled as described in our{" "}
          <Link href="/privacy" className="text-red-400 hover:text-red-300">
            Privacy Policy
          </Link>
          .
        </p>
      </PolicySection>

      <PolicySection title="12. Changes">
        <p>
          We may update these Terms. The &quot;Last updated&quot; date will change. Continued use of
          the website after an update constitutes acceptance.
        </p>
      </PolicySection>

      <PolicySection title="13. Governing law">
        <p>
          These Terms are governed by the laws of India. Courts at Lalitpur, Uttar Pradesh have
          jurisdiction, subject to any non-excludable consumer rights.
        </p>
      </PolicySection>

      <PolicySection title="14. Contact">
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
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
