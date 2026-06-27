import { describe, expect, it } from "vitest";
import { parseAddressComponents } from "../google-maps";

describe("parseAddressComponents", () => {
  it("extracts locality and pin code from address components", () => {
    const parsed = parseAddressComponents(
      "Civil Line, Lalitpur, Uttar Pradesh 284403, India",
      [
        { long_name: "Civil Line", short_name: "Civil Line", types: ["sublocality", "political"] },
        { long_name: "Lalitpur", short_name: "Lalitpur", types: ["locality", "political"] },
        { long_name: "284403", short_name: "284403", types: ["postal_code"] },
        {
          long_name: "Uttar Pradesh",
          short_name: "UP",
          types: ["administrative_area_level_1", "political"],
        },
      ],
      25.38,
      78.41
    );

    expect(parsed.locality).toBe("Lalitpur");
    expect(parsed.sublocality).toBe("Civil Line");
    expect(parsed.postalCode).toBe("284403");
    expect(parsed.lat).toBe(25.38);
    expect(parsed.displayLabel).toContain("Lalitpur");
  });
});
