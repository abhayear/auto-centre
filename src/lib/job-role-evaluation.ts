export const GENERAL_ROLE_TEMPLATE = "general" as const;
export const EV_MECHANIC_ROLE_TEMPLATE = "ev_mechanic" as const;
export const SALES_EXECUTIVE_ROLE_TEMPLATE = "sales_executive" as const;
export const SERVICE_ADVISOR_ROLE_TEMPLATE = "service_advisor" as const;

export const JOB_ROLE_TEMPLATES = [
  GENERAL_ROLE_TEMPLATE,
  EV_MECHANIC_ROLE_TEMPLATE,
  SALES_EXECUTIVE_ROLE_TEMPLATE,
  SERVICE_ADVISOR_ROLE_TEMPLATE,
] as const;

export type JobRoleTemplate = (typeof JOB_ROLE_TEMPLATES)[number];

export type ScreeningQuestionType = "yes_no" | "select" | "text" | "textarea";

export type ScreeningQuestion = {
  id: string;
  label: string;
  type: ScreeningQuestionType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type EvaluationCriterion = {
  id: string;
  label: string;
  description: string;
  lowLabel: string;
  highLabel: string;
};

export type RoleTemplateConfig = {
  id: JobRoleTemplate;
  label: string;
  screeningTitle: string;
  screeningDescription: string;
  evaluationTitle: string;
  screeningQuestions: ScreeningQuestion[];
  evaluationCriteria: EvaluationCriterion[];
};

const EXPERIENCE_YEAR_OPTIONS = [
  { value: "under_1", label: "Less than 1 year" },
  { value: "1_2", label: "1–2 years" },
  { value: "2_3", label: "2–3 years" },
  { value: "3_5", label: "3–5 years" },
  { value: "5_plus", label: "5+ years" },
];

const WILLING_LALITPUR: ScreeningQuestion = {
  id: "willingToWorkLalitpur",
  label: "Are you willing to work at our Lalitpur, UP location?",
  type: "yes_no",
  required: true,
};

const TWO_WHEELER_LICENSE: ScreeningQuestion = {
  id: "twoWheelerLicense",
  label: "Do you hold a valid two-wheeler driving licence?",
  type: "yes_no",
  required: true,
};

const HINDI_ENGLISH: ScreeningQuestion = {
  id: "hindiEnglishFluent",
  label: "Are you comfortable communicating in Hindi and English?",
  type: "yes_no",
  required: true,
};

const ITI_DIPLOMA: ScreeningQuestion = {
  id: "itiDiploma",
  label: "Do you hold an ITI or diploma in automobile / electrical trade?",
  type: "yes_no",
  required: true,
};

function experienceYearsQuestion(id: string, label: string): ScreeningQuestion {
  return {
    id,
    label,
    type: "select",
    required: true,
    options: EXPERIENCE_YEAR_OPTIONS,
  };
}

function experienceDetailsQuestion(
  id: string,
  label: string,
  placeholder: string,
): ScreeningQuestion {
  return {
    id,
    label,
    type: "textarea",
    required: true,
    placeholder,
  };
}

/** Shared closing questions: licence → location → (optional language) → experience details */
function assembleScreeningQuestions(options: {
  experience: ScreeningQuestion;
  core: ScreeningQuestion[];
  includeLicense?: boolean;
  includeHindiEnglish?: boolean;
  experienceDetails: ScreeningQuestion;
}): ScreeningQuestion[] {
  const shared: ScreeningQuestion[] = [];
  if (options.includeLicense !== false) shared.push(TWO_WHEELER_LICENSE);
  shared.push(WILLING_LALITPUR);
  if (options.includeHindiEnglish) shared.push(HINDI_ENGLISH);

  return [options.experience, ...options.core, ...shared, options.experienceDetails];
}

export const EV_MECHANIC_SCREENING_QUESTIONS: ScreeningQuestion[] = assembleScreeningQuestions({
  experience: experienceYearsQuestion(
    "evExperienceYears",
    "Years of two-wheeler EV service experience",
  ),
  core: [
    ITI_DIPLOMA,
    {
      id: "batteryExperience",
      label: "Have you inspected, tested, or replaced lithium-ion battery packs on EVs?",
      type: "yes_no",
      required: true,
    },
    {
      id: "hvSafetyTraining",
      label: "Are you trained in high-voltage EV safety protocols?",
      type: "yes_no",
      required: true,
    },
    {
      id: "diagnosticToolsUsed",
      label: "Have you used EV-specific diagnostic tools or software?",
      type: "yes_no",
      required: true,
    },
    {
      id: "bldcMotorExperience",
      label: "Do you have experience servicing BLDC motors, controllers, or inverters?",
      type: "yes_no",
      required: true,
    },
    {
      id: "chargingSystemsExperience",
      label: "Have you troubleshooted onboard chargers or external charging systems?",
      type: "yes_no",
      required: true,
    },
    {
      id: "firmwareUpdates",
      label: "Have you installed firmware updates on smart dashboards or IoT-enabled EVs?",
      type: "yes_no",
      required: true,
    },
    {
      id: "routineMaintenance",
      label: "Can you perform routine two-wheeler maintenance (brakes, suspension, tyres)?",
      type: "yes_no",
      required: true,
    },
  ],
  includeLicense: true,
  includeHindiEnglish: false,
  experienceDetails: experienceDetailsQuestion(
    "evBrandsWorked",
    "Which EV brands or models have you serviced?",
    "List brands/models and types of work performed (e.g. Yakuza Rubie — battery diagnostics, motor service)",
  ),
});

export const EV_MECHANIC_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "evTechnicalKnowledge",
    label: "EV Technical Knowledge",
    description: "Understanding of EV systems (battery, motor, controller)",
    lowLabel: "Basic",
    highLabel: "Expert",
  },
  {
    id: "batteryHandling",
    label: "Battery Handling",
    description: "Safe handling, testing, and replacement of lithium-ion batteries",
    lowLabel: "Unsafe",
    highLabel: "Highly Skilled",
  },
  {
    id: "electricalSafety",
    label: "Electrical Safety",
    description: "Knowledge of high-voltage safety protocols",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "diagnosticTools",
    label: "Diagnostic Tools",
    description: "Ability to use EV-specific diagnostic software and tools",
    lowLabel: "Limited",
    highLabel: "Advanced",
  },
  {
    id: "mechanicalSkills",
    label: "Mechanical Skills",
    description: "Brake, suspension, and chassis maintenance",
    lowLabel: "Weak",
    highLabel: "Strong",
  },
  {
    id: "softwareIot",
    label: "Software & IoT",
    description: "Ability to update firmware and troubleshoot smart dashboards",
    lowLabel: "None",
    highLabel: "Expert",
  },
  {
    id: "experience",
    label: "Experience",
    description: "Years of EV-specific service experience",
    lowLabel: "<1 year",
    highLabel: "5+ years",
  },
  {
    id: "customerCommunication",
    label: "Customer Communication",
    description: "Educating riders on EV care and safety",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
];

export const SALES_EXECUTIVE_SCREENING_QUESTIONS: ScreeningQuestion[] = assembleScreeningQuestions({
  experience: experienceYearsQuestion("salesExperienceYears", "Years of retail or sales experience"),
  core: [
    {
      id: "evProductKnowledge",
      label: "Do you have knowledge of electric scooters or two-wheelers?",
      type: "yes_no",
      required: true,
    },
    {
      id: "previousAutomotiveSales",
      label: "Have you sold vehicles, automobiles, or EVs before?",
      type: "yes_no",
      required: true,
    },
    {
      id: "showroomFloorExperience",
      label: "Have you worked on a vehicle showroom floor?",
      type: "yes_no",
      required: true,
    },
    {
      id: "testRideComfort",
      label: "Are you comfortable conducting customer test rides?",
      type: "yes_no",
      required: true,
    },
    {
      id: "financingBasics",
      label: "Can you explain basic EMI / finance options to customers?",
      type: "yes_no",
      required: true,
    },
    {
      id: "commissionExperience",
      label: "Are you comfortable with commission-based sales targets?",
      type: "yes_no",
      required: true,
    },
    {
      id: "digitalSalesTools",
      label: "Are you comfortable using WhatsApp or CRM tools for lead follow-up?",
      type: "yes_no",
      required: true,
    },
    {
      id: "localCustomerNetwork",
      label: "Do you have a local customer network or referral base in Lalitpur area?",
      type: "yes_no",
      required: true,
    },
  ],
  includeLicense: true,
  includeHindiEnglish: true,
  experienceDetails: experienceDetailsQuestion(
    "previousEmployers",
    "Previous employers or brands you sold for",
    "List showroom names, brands handled, and your sales role (e.g. Yakuza dealer — walk-in and test rides)",
  ),
});

export const SALES_EXECUTIVE_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "productKnowledge",
    label: "EV Product Knowledge",
    description: "Understanding of e-scooter features, range, and charging",
    lowLabel: "Basic",
    highLabel: "Expert",
  },
  {
    id: "salesSkills",
    label: "Sales Skills",
    description: "Needs discovery, objection handling, and closing",
    lowLabel: "Weak",
    highLabel: "Strong",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Clarity in Hindi and English with customers",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "customerRapport",
    label: "Customer Rapport",
    description: "Building trust and a positive showroom experience",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "testRideHandling",
    label: "Test Ride Handling",
    description: "Safely conducting and explaining test rides",
    lowLabel: "Limited",
    highLabel: "Advanced",
  },
  {
    id: "financingKnowledge",
    label: "Financing Knowledge",
    description: "Explaining EMI, down payment, and booking process",
    lowLabel: "Basic",
    highLabel: "Expert",
  },
  {
    id: "experience",
    label: "Experience",
    description: "Years of relevant sales experience",
    lowLabel: "<1 year",
    highLabel: "5+ years",
  },
  {
    id: "motivation",
    label: "Motivation & Fit",
    description: "Passion for EV mobility and team fit",
    lowLabel: "Low",
    highLabel: "High",
  },
];

export const SERVICE_ADVISOR_SCREENING_QUESTIONS: ScreeningQuestion[] = assembleScreeningQuestions({
  experience: experienceYearsQuestion(
    "customerServiceYears",
    "Years of customer-facing or front-desk experience",
  ),
  core: [
    {
      id: "twoWheelerKnowledge",
      label: "Do you have basic knowledge of two-wheelers?",
      type: "yes_no",
      required: true,
    },
    {
      id: "evBasicsKnowledge",
      label: "Are you familiar with basic EV service terms (battery, charger, range)?",
      type: "yes_no",
      required: true,
    },
    ITI_DIPLOMA,
    {
      id: "appointmentSchedulingExp",
      label: "Have you handled appointment scheduling or service bookings?",
      type: "yes_no",
      required: true,
    },
    {
      id: "estimateAndInvoiceExp",
      label: "Have you prepared service estimates or invoices for customers?",
      type: "yes_no",
      required: true,
    },
    {
      id: "complaintHandling",
      label: "Do you have experience handling customer complaints calmly?",
      type: "yes_no",
      required: true,
    },
    {
      id: "followUpCalls",
      label: "Are you comfortable making follow-up calls when vehicles are ready?",
      type: "yes_no",
      required: true,
    },
    {
      id: "computerLiterate",
      label: "Are you comfortable using a computer or smartphone for daily work?",
      type: "yes_no",
      required: true,
    },
    {
      id: "availableSaturdays",
      label: "Are you available to work on Saturdays?",
      type: "yes_no",
      required: true,
    },
  ],
  includeLicense: true,
  includeHindiEnglish: true,
  experienceDetails: experienceDetailsQuestion(
    "previousWorkplace",
    "Previous workplace or service centre experience",
    "Describe your role, workshop type, and brands served (e.g. EV service centre — job cards and customer updates)",
  ),
});

export const SERVICE_ADVISOR_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  {
    id: "customerService",
    label: "Customer Service",
    description: "Greeting customers and managing service enquiries",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Explaining service work and timelines clearly",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "organization",
    label: "Organization",
    description: "Scheduling, follow-ups, and job tracking",
    lowLabel: "Weak",
    highLabel: "Strong",
  },
  {
    id: "twoWheelerKnowledge",
    label: "Two-Wheeler Knowledge",
    description: "Basic understanding of scooter service needs",
    lowLabel: "Basic",
    highLabel: "Strong",
  },
  {
    id: "evAwareness",
    label: "EV Awareness",
    description: "Understanding EV-specific service terminology",
    lowLabel: "None",
    highLabel: "Good",
  },
  {
    id: "upselling",
    label: "Service Recommendations",
    description: "Suggesting genuine maintenance and add-on services",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
  {
    id: "experience",
    label: "Experience",
    description: "Years of service advisor or front-desk experience",
    lowLabel: "<1 year",
    highLabel: "5+ years",
  },
  {
    id: "professionalism",
    label: "Professionalism",
    description: "Punctuality, grooming, and workplace conduct",
    lowLabel: "Poor",
    highLabel: "Excellent",
  },
];

export const ROLE_TEMPLATE_CONFIGS: Record<JobRoleTemplate, RoleTemplateConfig> = {
  [GENERAL_ROLE_TEMPLATE]: {
    id: GENERAL_ROLE_TEMPLATE,
    label: "General role",
    screeningTitle: "",
    screeningDescription: "",
    evaluationTitle: "",
    screeningQuestions: [],
    evaluationCriteria: [],
  },
  [EV_MECHANIC_ROLE_TEMPLATE]: {
    id: EV_MECHANIC_ROLE_TEMPLATE,
    label: "Two-Wheeler EV Service Mechanic",
    screeningTitle: "EV service screening",
    screeningDescription: "Help us understand your electric two-wheeler service background.",
    evaluationTitle: "EV mechanic evaluation (1–5)",
    screeningQuestions: EV_MECHANIC_SCREENING_QUESTIONS,
    evaluationCriteria: EV_MECHANIC_EVALUATION_CRITERIA,
  },
  [SALES_EXECUTIVE_ROLE_TEMPLATE]: {
    id: SALES_EXECUTIVE_ROLE_TEMPLATE,
    label: "E-Scooter Sales Executive",
    screeningTitle: "Sales screening",
    screeningDescription: "Tell us about your sales experience and interest in electric two-wheelers.",
    evaluationTitle: "Sales executive evaluation (1–5)",
    screeningQuestions: SALES_EXECUTIVE_SCREENING_QUESTIONS,
    evaluationCriteria: SALES_EXECUTIVE_EVALUATION_CRITERIA,
  },
  [SERVICE_ADVISOR_ROLE_TEMPLATE]: {
    id: SERVICE_ADVISOR_ROLE_TEMPLATE,
    label: "Service Advisor",
    screeningTitle: "Service advisor screening",
    screeningDescription: "Share your customer service and two-wheeler workshop background.",
    evaluationTitle: "Service advisor evaluation (1–5)",
    screeningQuestions: SERVICE_ADVISOR_SCREENING_QUESTIONS,
    evaluationCriteria: SERVICE_ADVISOR_EVALUATION_CRITERIA,
  },
};

export const ROLE_TEMPLATE_OPTIONS = JOB_ROLE_TEMPLATES.filter(
  (template) => template !== GENERAL_ROLE_TEMPLATE,
).map((template) => ({
  value: template,
  label: ROLE_TEMPLATE_CONFIGS[template].label,
}));

export const EVALUATION_RATING_OPTIONS = [
  { value: "1", label: "1 — Needs improvement" },
  { value: "2", label: "2 — Below average" },
  { value: "3", label: "3 — Adequate" },
  { value: "4", label: "4 — Strong" },
  { value: "5", label: "5 — Excellent" },
] as const;

export type EvaluationScores = Record<string, number>;
export type ScreeningResponses = Record<string, string>;

export function isJobRoleTemplate(value: string): value is JobRoleTemplate {
  return (JOB_ROLE_TEMPLATES as readonly string[]).includes(value);
}

export function hasRoleScreening(roleTemplate: string | null | undefined): boolean {
  if (!roleTemplate || !isJobRoleTemplate(roleTemplate)) return false;
  return ROLE_TEMPLATE_CONFIGS[roleTemplate].screeningQuestions.length > 0;
}

/** @deprecated Use hasRoleScreening(roleTemplate) */
export function isEvMechanicRole(roleTemplate: string | null | undefined): boolean {
  return roleTemplate === EV_MECHANIC_ROLE_TEMPLATE;
}

export function getRoleTemplateConfig(roleTemplate: string): RoleTemplateConfig | null {
  if (!isJobRoleTemplate(roleTemplate)) return null;
  return ROLE_TEMPLATE_CONFIGS[roleTemplate];
}

export function getScreeningQuestions(roleTemplate: string): ScreeningQuestion[] {
  return getRoleTemplateConfig(roleTemplate)?.screeningQuestions ?? [];
}

export function getEvaluationCriteria(roleTemplate: string): EvaluationCriterion[] {
  return getRoleTemplateConfig(roleTemplate)?.evaluationCriteria ?? [];
}

export function formatYesNo(value: string | undefined): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return value ?? "—";
}

export function formatScreeningAnswer(question: ScreeningQuestion, value: string | undefined): string {
  if (!value) return "—";
  if (question.type === "yes_no") return formatYesNo(value);
  if (question.type === "select") {
    return question.options?.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

export function computeEvaluationAverage(
  roleTemplate: string,
  scores: EvaluationScores | null | undefined,
): number | null {
  if (!scores) return null;
  const criteria = getEvaluationCriteria(roleTemplate);
  const values = criteria
    .map((criterion) => scores[criterion.id])
    .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 5);
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

export function formatEvaluationAverage(
  roleTemplate: string,
  scores: EvaluationScores | null | undefined,
): string | null {
  const average = computeEvaluationAverage(roleTemplate, scores);
  if (average == null) return null;
  return `${average}/5`;
}

export function parseEvaluationScores(
  roleTemplate: string,
  input: unknown,
): EvaluationScores | null {
  if (!input || typeof input !== "object") return null;
  const criteria = getEvaluationCriteria(roleTemplate);
  const result: EvaluationScores = {};
  for (const criterion of criteria) {
    const raw = (input as Record<string, unknown>)[criterion.id];
    if (raw == null || raw === "") continue;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(value) && value >= 1 && value <= 5) {
      result[criterion.id] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function validateScreeningResponses(
  roleTemplate: string,
  responses: unknown,
): ScreeningResponses | null {
  const questions = getScreeningQuestions(roleTemplate);
  if (questions.length === 0) return null;
  if (!responses || typeof responses !== "object") {
    throw new Error("Screening responses are required for this role");
  }

  const input = responses as Record<string, unknown>;
  const result: ScreeningResponses = {};

  for (const question of questions) {
    const raw = input[question.id];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (question.required && !value) {
      throw new Error(`${question.label} is required`);
    }

    if (!value) continue;

    if (question.type === "yes_no" && value !== "yes" && value !== "no") {
      throw new Error(`${question.label} must be Yes or No`);
    }

    if (question.type === "select") {
      const allowed = question.options?.map((option) => option.value) ?? [];
      if (!allowed.includes(value)) {
        throw new Error(`${question.label} has an invalid selection`);
      }
    }

    result[question.id] = value;
  }

  return result;
}
