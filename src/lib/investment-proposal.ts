import {
  ONLINE_STORE_URL,
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_NAME,
  SITE_PHONES,
} from "@/lib/constants";

export const INVESTMENT_PROPOSAL = {
  title: "Investment Proposal",
  subtitle: `${SITE_NAME} — Electric 2-Wheeler Sales, Service & Digital Retail`,
  lastUpdated: "June 2026",
  confidentialNotice:
    "Confidential — for qualified investors and strategic partners only.",

  executiveSummary: `${SITE_NAME} is an established electric 2-wheeler dealership and service centre in Lalitpur, Uttar Pradesh. We combine showroom sales, EV-specialist workshop services, doorstep service coverage, and an online marketplace — positioning us to capture growing demand for affordable electric mobility across Bundelkhand.`,

  highlights: [
    { label: "E-Scooters Sold", value: "300+" },
    { label: "Location", value: "Civil Line, Lalitpur" },
    { label: "Channels", value: "Showroom + Online + Service" },
    { label: "Market", value: "EV 2-Wheelers, UP" },
  ],

  companyOverview: {
    title: "Company Overview",
    paragraphs: [
      `${SITE_NAME} operates from ${SITE_ADDRESS}, serving riders across Lalitpur and surrounding districts with electric scooter sales, test rides, financing guidance, and full EV after-sales support.`,
      "Our workshop handles battery diagnostics, motor service, brake work, and scheduled maintenance — with dedicated expertise for low-speed e-bikes and modern lithium-ion platforms.",
      `We also operate a digital storefront at ${ONLINE_STORE_URL.replace("https://", "")} for parts, accessories, and retail reach beyond the showroom floor.`,
    ],
  },

  marketOpportunity: {
    title: "Market Opportunity",
    points: [
      "India's electric 2-wheeler segment is expanding rapidly, driven by fuel savings, state subsidies, and urban last-mile demand.",
      "Tier-2 and Tier-3 cities in Uttar Pradesh remain underserved — strong demand with limited dedicated EV sales and service infrastructure.",
      "Bundelkhand commuters and small businesses need reliable dealers who can sell, finance, service, and support electric vehicles long-term.",
    ],
  },

  businessModel: {
    title: "Business Model",
    streams: [
      {
        title: "New & Pre-Owned EV Sales",
        detail: "Margin on vehicle sales, test-ride conversion, and trade-in opportunities.",
      },
      {
        title: "Service & Spares",
        detail: "Recurring revenue from maintenance, repairs, battery checks, and parts.",
      },
      {
        title: "Online Store",
        detail: "Accessories and retail sales through our Vyapar-powered digital storefront.",
      },
      {
        title: "Fleet & Institutional",
        detail: "Potential B2B sales to delivery partners, institutions, and fleet operators.",
      },
    ],
  },

  traction: {
    title: "Traction & Assets",
    items: [
      "300+ electric 2-wheelers sold to date",
      "Authorized sales and service operations with EV-trained technicians",
      "Established showroom and workshop at a high-visibility Civil Line location",
      "Online store live for digital commerce and wider reach",
      "Doorstep service booking with GPS-based service area validation",
      "Growing base of esteemed institutional and repeat customers",
    ],
  },

  investmentAsk: {
    title: "Investment Opportunity",
    summary:
      "We are seeking strategic investment and/or partnership to accelerate showroom expansion, inventory scale-up, service bay capacity, and digital marketing across Bundelkhand.",
    seeking: [
      "Growth capital for inventory and working capital",
      "Strategic partners in EV OEM, finance, or fleet mobility",
      "Support for second location or satellite service hub expansion",
    ],
    note: "Investment terms, valuation, and structure are available upon request under NDA.",
  },

  useOfFunds: {
    title: "Proposed Use of Funds",
    items: [
      { area: "Inventory & showroom", share: "40%" },
      { area: "Service infrastructure & tools", share: "25%" },
      { area: "Marketing & brand", share: "20%" },
      { area: "Working capital & operations", share: "15%" },
    ],
  },

  roadmap: {
    title: "12–24 Month Roadmap",
    phases: [
      {
        period: "Phase 1 (0–6 months)",
        goals: [
          "Expand fast-moving EV inventory and accessories",
          "Scale digital leads via online store and local campaigns",
          "Increase service bay throughput and doorstep coverage",
        ],
      },
      {
        period: "Phase 2 (6–18 months)",
        goals: [
          "Launch fleet and institutional sales channel",
          "Add satellite pickup/service points in nearby towns",
          "Deepen OEM and finance partnerships",
        ],
      },
      {
        period: "Phase 3 (18–24 months)",
        goals: [
          "Evaluate second showroom or hub in adjacent district",
          "Build recurring subscription-style maintenance plans",
          "Strengthen brand as Bundelkhand's EV mobility partner",
        ],
      },
    ],
  },

  contact: {
    title: "Investor Contact",
    email: SITE_EMAIL,
    phones: SITE_PHONES,
    address: SITE_ADDRESS,
    cta: "Request the full deck, financials, and site visit",
  },
} as const;
