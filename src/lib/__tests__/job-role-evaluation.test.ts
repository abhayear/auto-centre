import { describe, expect, it } from "vitest";
import {
  EV_MECHANIC_ROLE_TEMPLATE,
  SALES_EXECUTIVE_ROLE_TEMPLATE,
  SERVICE_ADVISOR_ROLE_TEMPLATE,
  computeEvaluationAverage,
  formatEvaluationAverage,
  formatScreeningAnswer,
  getScreeningQuestions,
  hasRoleScreening,
  parseEvaluationScores,
  validateScreeningResponses,
} from "@/lib/job-role-evaluation";

describe("job-role-evaluation", () => {
  it("detects roles with screening", () => {
    expect(hasRoleScreening(EV_MECHANIC_ROLE_TEMPLATE)).toBe(true);
    expect(hasRoleScreening(SALES_EXECUTIVE_ROLE_TEMPLATE)).toBe(true);
    expect(hasRoleScreening(SERVICE_ADVISOR_ROLE_TEMPLATE)).toBe(true);
    expect(hasRoleScreening("general")).toBe(false);
  });

  it("computes average per role criteria", () => {
    const average = computeEvaluationAverage(SALES_EXECUTIVE_ROLE_TEMPLATE, {
      productKnowledge: 4,
      salesSkills: 5,
      communication: 3,
    });
    expect(average).toBe(4);
  });

  it("formats evaluation average with role template", () => {
    expect(
      formatEvaluationAverage(SERVICE_ADVISOR_ROLE_TEMPLATE, {
        customerService: 5,
        communication: 3,
      }),
    ).toBe("4/5");
  });

  it("formats screening answers", () => {
    expect(
      formatScreeningAnswer({ id: "itiDiploma", label: "ITI", type: "yes_no" }, "yes"),
    ).toBe("Yes");
  });

  it("parses scores using role-specific criteria", () => {
    expect(
      parseEvaluationScores(SALES_EXECUTIVE_ROLE_TEMPLATE, {
        productKnowledge: 4,
        invalidField: 5,
      }),
    ).toEqual({ productKnowledge: 4 });
  });

  it("validates EV mechanic screening", () => {
    const responses = validateScreeningResponses(EV_MECHANIC_ROLE_TEMPLATE, {
      evExperienceYears: "3_5",
      itiDiploma: "yes",
      batteryExperience: "yes",
      hvSafetyTraining: "yes",
      diagnosticToolsUsed: "no",
      bldcMotorExperience: "yes",
      chargingSystemsExperience: "yes",
      firmwareUpdates: "no",
      routineMaintenance: "yes",
      twoWheelerLicense: "yes",
      willingToWorkLalitpur: "yes",
      evBrandsWorked: "Yakuza Rubie — battery and motor service",
    });
    expect(responses?.evBrandsWorked).toBe("Yakuza Rubie — battery and motor service");
  });

  it("validates sales executive screening", () => {
    const responses = validateScreeningResponses(SALES_EXECUTIVE_ROLE_TEMPLATE, {
      salesExperienceYears: "2_3",
      evProductKnowledge: "yes",
      previousAutomotiveSales: "no",
      showroomFloorExperience: "yes",
      testRideComfort: "yes",
      financingBasics: "yes",
      commissionExperience: "yes",
      digitalSalesTools: "yes",
      localCustomerNetwork: "no",
      twoWheelerLicense: "yes",
      willingToWorkLalitpur: "yes",
      hindiEnglishFluent: "yes",
      previousEmployers: "Local retail store",
    });
    expect(responses?.previousEmployers).toBe("Local retail store");
  });

  it("validates service advisor screening", () => {
    const responses = validateScreeningResponses(SERVICE_ADVISOR_ROLE_TEMPLATE, {
      customerServiceYears: "1_2",
      twoWheelerKnowledge: "yes",
      evBasicsKnowledge: "yes",
      itiDiploma: "no",
      appointmentSchedulingExp: "yes",
      estimateAndInvoiceExp: "yes",
      complaintHandling: "yes",
      followUpCalls: "yes",
      computerLiterate: "yes",
      availableSaturdays: "yes",
      twoWheelerLicense: "yes",
      willingToWorkLalitpur: "yes",
      hindiEnglishFluent: "yes",
      previousWorkplace: "Workshop front desk",
    });
    expect(responses?.previousWorkplace).toBe("Workshop front desk");
  });

  it("returns null screening for general roles", () => {
    expect(validateScreeningResponses("general", {})).toBeNull();
  });

  it("uses a consistent screening pattern per role template", () => {
    const ev = getScreeningQuestions(EV_MECHANIC_ROLE_TEMPLATE);
    const sales = getScreeningQuestions(SALES_EXECUTIVE_ROLE_TEMPLATE);
    const advisor = getScreeningQuestions(SERVICE_ADVISOR_ROLE_TEMPLATE);

    expect(ev[0].type).toBe("select");
    expect(ev.at(-1)?.type).toBe("textarea");
    expect(sales.some((q) => q.id === "twoWheelerLicense")).toBe(true);
    expect(sales.some((q) => q.id === "hindiEnglishFluent")).toBe(true);
    expect(advisor.some((q) => q.id === "itiDiploma")).toBe(true);
    expect(ev.length).toBeGreaterThanOrEqual(10);
    expect(sales.length).toBeGreaterThanOrEqual(10);
    expect(advisor.length).toBeGreaterThanOrEqual(10);
  });
});
