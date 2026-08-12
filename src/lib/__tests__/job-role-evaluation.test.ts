import { describe, expect, it } from "vitest";
import {
  EV_MECHANIC_ROLE_TEMPLATE,
  SALES_EXECUTIVE_ROLE_TEMPLATE,
  SERVICE_ADVISOR_ROLE_TEMPLATE,
  computeEvaluationAverage,
  formatEvaluationAverage,
  formatScreeningAnswer,
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
      twoWheelerLicense: "yes",
      willingToWorkLalitpur: "yes",
      evBrandsWorked: "Ola S1",
    });
    expect(responses?.evBrandsWorked).toBe("Ola S1");
  });

  it("validates sales executive screening", () => {
    const responses = validateScreeningResponses(SALES_EXECUTIVE_ROLE_TEMPLATE, {
      salesExperienceYears: "2_3",
      twoWheelerLicense: "yes",
      evProductKnowledge: "yes",
      hindiEnglishFluent: "yes",
      previousAutomotiveSales: "no",
      commissionExperience: "yes",
      testRideComfort: "yes",
      financingBasics: "yes",
      willingToWorkLalitpur: "yes",
      previousEmployers: "Local retail store",
    });
    expect(responses?.previousEmployers).toBe("Local retail store");
  });

  it("validates service advisor screening", () => {
    const responses = validateScreeningResponses(SERVICE_ADVISOR_ROLE_TEMPLATE, {
      customerServiceYears: "1_2",
      twoWheelerKnowledge: "yes",
      evBasicsKnowledge: "yes",
      appointmentSchedulingExp: "yes",
      hindiEnglishFluent: "yes",
      computerLiterate: "yes",
      availableSaturdays: "yes",
      willingToWorkLalitpur: "yes",
      previousWorkplace: "Workshop front desk",
    });
    expect(responses?.previousWorkplace).toBe("Workshop front desk");
  });

  it("returns null screening for general roles", () => {
    expect(validateScreeningResponses("general", {})).toBeNull();
  });
});
