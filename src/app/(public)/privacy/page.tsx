import Link from "next/link";
import { PolicyLayout, PolicySection } from "@/components/legal/PolicyLayout";
import { SITE_ADDRESS, SITE_EMAIL, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME} — how we collect, use, and protect your information.`,
};

const LAST_UPDATED = "12 August 2026";

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <PolicySection title="1. Introduction">
        <p>
          {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this website and
          showroom at {SITE_ADDRESS}. This Privacy Policy explains how we collect, use, store, and
          protect personal information when you browse our site, book services, book an e-scooter
          online, or contact us.
        </p>
        <p>
          By using our website, you agree to the practices described here. If you do not agree,
          please do not use the site.
        </p>
      </PolicySection>

      <PolicySection title="2. Information we collect">
        <p>We may collect the following information when you interact with us:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-slate-200">Contact details:</strong> name, phone number, email
            address, and messages you submit through inquiry, booking, or service forms.
          </li>
          <li>
            <strong className="text-slate-200">Booking details:</strong> selected vehicle model,
            preferred dates, service location, and notes you provide for test rides or service
            appointments.
          </li>
          <li>
            <strong className="text-slate-200">Payment-related information:</strong> when you pay
            an online booking amount, payment processing is handled by Razorpay. We receive payment
            status, order reference, and amount — not your full card or UPI credentials.
          </li>
          <li>
            <strong className="text-slate-200">Technical data:</strong> browser type, device
            information, and approximate usage data through standard web server logs and analytics
            (where enabled).
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="3. How we use your information">
        <p>We use your information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Process online booking inquiries and confirm appointments</li>
          <li>Contact you about your booking, service, or purchase</li>
          <li>Process online booking payments through our payment partner</li>
          <li>Provide after-sales service and customer support</li>
          <li>Improve our website and services</li>
          <li>Comply with applicable laws and respond to lawful requests</li>
        </ul>
      </PolicySection>

      <PolicySection title="4. Payment processing (Razorpay)">
        <p>
          Online booking payments on this website are processed by Razorpay Software Private
          Limited. When you pay, you are also subject to Razorpay&apos;s privacy and security
          practices. We do not store your complete payment instrument details on our servers.
        </p>
        <p>
          For payment issues, contact us first at {SITE_EMAIL} or {SITE_PHONE}. Payment disputes may
          also be handled according to Razorpay and your bank or UPI app policies.
        </p>
      </PolicySection>

      <PolicySection title="5. Sharing of information">
        <p>We do not sell your personal information. We may share data only:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>With Razorpay and other service providers who help us operate the website and payments</li>
          <li>With delivery or service partners when needed to fulfil your booking</li>
          <li>When required by law, court order, or government authority</li>
          <li>To protect the rights, safety, and property of {SITE_NAME}, our customers, or others</li>
        </ul>
      </PolicySection>

      <PolicySection title="6. Data retention">
        <p>
          We retain booking and inquiry records for as long as needed to provide services, handle
          warranty or refund matters, and meet legal or accounting requirements. You may request
          deletion of non-essential data by contacting us, subject to records we must keep by law.
        </p>
      </PolicySection>

      <PolicySection title="7. Security">
        <p>
          We use reasonable technical and organisational measures to protect your information.
          However, no method of transmission over the internet is completely secure. Please use
          strong passwords for any accounts and avoid sharing sensitive payment details outside our
          official checkout flow.
        </p>
      </PolicySection>

      <PolicySection title="8. Your rights">
        <p>
          You may request access, correction, or deletion of your personal information, or withdraw
          consent for marketing communications, by emailing {SITE_EMAIL} or calling {SITE_PHONE}. We
          will respond within a reasonable time.
        </p>
      </PolicySection>

      <PolicySection title="9. Cookies">
        <p>
          Our website may use essential cookies and session storage for login (admin area),
          booking flow, and basic site functionality. We do not use invasive tracking for visitors
          browsing public pages beyond what is needed to operate the site securely.
        </p>
      </PolicySection>

      <PolicySection title="10. Third-party links">
        <p>
          Our site may link to external services (for example, our online store or maps). We are
          not responsible for the privacy practices of those third-party websites. Please review
          their policies separately.
        </p>
      </PolicySection>

      <PolicySection title="11. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
          the top will reflect changes. Continued use of the site after updates means you accept
          the revised policy.
        </p>
      </PolicySection>

      <PolicySection title="12. Contact">
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
