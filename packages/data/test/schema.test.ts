import { describe, expect, it } from "vitest";
import plantsJson from "../plants.json" with { type: "json" };
import { plantArraySchema, plants, byId, byGrowthForm } from "../src/index.js";

describe("plants.json", () => {
  it("parses cleanly against plantArraySchema", () => {
    const result = plantArraySchema.safeParse(plantsJson);
    if (!result.success) {
      // Print the first few issues for easy debugging.
      const issues = result.error.issues.slice(0, 5).map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      throw new Error(
        `schema validation failed:\n${JSON.stringify(issues, null, 2)}`,
      );
    }
    expect(result.success).toBe(true);
  });

  it("has exactly the Phase 1 target count of species", () => {
    // Phase 1 target: 20 MVP species.
    expect(plants.length).toBe(20);
  });

  it("has unique IDs", () => {
    const ids = plants.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every plant has at least one citation", () => {
    for (const p of plants) {
      expect(p.citations.length).toBeGreaterThan(0);
    }
  });

  it("covers the required growth-form mix", () => {
    expect(byGrowthForm("stem").length).toBeGreaterThan(0);
    expect(byGrowthForm("carpeting").length).toBeGreaterThan(0);
    expect(byGrowthForm("epiphyte").length).toBeGreaterThan(0);
    expect(byGrowthForm("moss").length).toBeGreaterThan(0);
    expect(byGrowthForm("floating").length).toBeGreaterThan(0);
  });

  it("byId finds a known plant", () => {
    // Every dataset includes Anubias barteri — it's the easiest plant for
    // smoke-testing.
    expect(byId("anubias-barteri")).toBeDefined();
  });
});
