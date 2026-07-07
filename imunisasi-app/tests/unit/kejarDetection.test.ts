import { describe, it, expect } from "vitest";
import { getAgeInMonths } from "../../src/utils/validators";
import { KEJAR_AGE_THRESHOLD } from "../../src/types";
import { isKejarVaccination } from "../../src/utils/excelProcessor";

// ---------------------------------------------------------------------------
// getAgeInMonths
// ---------------------------------------------------------------------------
describe("getAgeInMonths", () => {
  it("returns 0 for same-day vaccination", () => {
    const d = new Date(2024, 0, 15);
    expect(getAgeInMonths(d, d)).toBe(0);
  });

  it("returns 2 for exactly 2 complete months (same day)", () => {
    expect(getAgeInMonths(new Date(2024, 0, 15), new Date(2024, 2, 15))).toBe(2);
  });

  it("returns 2 (not 3) when day of vacc < day of birth", () => {
    // born Jan 15, vaccinated Apr 10: only 2 complete months
    expect(getAgeInMonths(new Date(2024, 0, 15), new Date(2024, 3, 10))).toBe(2);
  });

  it("returns 3 when day of vacc >= day of birth across 3 months", () => {
    // born Jan 10, vaccinated Apr 10: exactly 3 months
    expect(getAgeInMonths(new Date(2024, 0, 10), new Date(2024, 3, 10))).toBe(3);
  });

  it("returns 12 for one year exactly", () => {
    expect(getAgeInMonths(new Date(2023, 5, 1), new Date(2024, 5, 1))).toBe(12);
  });

  it("returns null if either date is null", () => {
    expect(getAgeInMonths(null, new Date())).toBeNull();
    expect(getAgeInMonths(new Date(), null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// KEJAR_AGE_THRESHOLD sanity checks
// ---------------------------------------------------------------------------
describe("KEJAR_AGE_THRESHOLD constants", () => {
  it("BCG threshold is defined and > 0", () => {
    expect(KEJAR_AGE_THRESHOLD.BCG).toBeGreaterThan(0);
  });

  it("Rota1/2/3 have no kejar threshold (undefined)", () => {
    expect(KEJAR_AGE_THRESHOLD.Rota1).toBeUndefined();
    expect(KEJAR_AGE_THRESHOLD.Rota2).toBeUndefined();
    expect(KEJAR_AGE_THRESHOLD.Rota3).toBeUndefined();
  });

  it("HB0 variants have no kejar threshold", () => {
    expect(KEJAR_AGE_THRESHOLD.HB0_lt24h).toBeUndefined();
    expect(KEJAR_AGE_THRESHOLD.HB0_1_7d).toBeUndefined();
  });

  it("Booster thresholds are >= 24 months", () => {
    expect(KEJAR_AGE_THRESHOLD.BoosterDPT).toBeGreaterThanOrEqual(24);
    expect(KEJAR_AGE_THRESHOLD.BoosterMR).toBeGreaterThanOrEqual(24);
  });

  it("CampakRubella threshold is 12 months", () => {
    expect(KEJAR_AGE_THRESHOLD.CampakRubella).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// isKejarVaccination
// ---------------------------------------------------------------------------
describe("isKejarVaccination", () => {
  // BCG threshold is 3 months
  it("BCG at 1 month → NOT kejar", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 1, 1); // 1 month old
    expect(isKejarVaccination("BCG", birth, vacc)).toBe(false);
  });

  it("BCG at 3 months → IS kejar", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 3, 1); // 3 months old
    expect(isKejarVaccination("BCG", birth, vacc)).toBe(true);
  });

  it("BCG at 12 months → IS kejar", () => {
    const birth = new Date(2023, 0, 1);
    const vacc = new Date(2024, 0, 1); // 12 months old
    expect(isKejarVaccination("BCG", birth, vacc)).toBe(true);
  });

  it("DPT1 at 2 months → NOT kejar", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 2, 1); // 2 months old
    expect(isKejarVaccination("DPT1", birth, vacc)).toBe(false);
  });

  it("DPT1 at 4 months → IS kejar", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 4, 1); // 4 months old
    expect(isKejarVaccination("DPT1", birth, vacc)).toBe(true);
  });

  it("CampakRubella at 9 months → NOT kejar", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 9, 1); // 9 months
    expect(isKejarVaccination("CampakRubella", birth, vacc)).toBe(false);
  });

  it("CampakRubella at 12 months → IS kejar", () => {
    const birth = new Date(2023, 0, 1);
    const vacc = new Date(2024, 0, 1); // 12 months
    expect(isKejarVaccination("CampakRubella", birth, vacc)).toBe(true);
  });

  it("Rota1 at any age → never kejar (no threshold)", () => {
    const birth = new Date(2024, 0, 1);
    const vacc = new Date(2024, 6, 1); // 6 months
    expect(isKejarVaccination("Rota1", birth, vacc)).toBe(false);
  });

  it("BoosterDPT at 18 months → NOT kejar", () => {
    const birth = new Date(2023, 0, 1);
    const vacc = new Date(2024, 6, 1); // 18 months
    expect(isKejarVaccination("BoosterDPT", birth, vacc)).toBe(false);
  });

  it("BoosterDPT at 24 months → IS kejar", () => {
    const birth = new Date(2023, 0, 1);
    const vacc = new Date(2025, 0, 1); // 24 months
    expect(isKejarVaccination("BoosterDPT", birth, vacc)).toBe(true);
  });

  it("returns false if birth or vacc date is null", () => {
    expect(isKejarVaccination("BCG", null, new Date())).toBe(false);
    expect(isKejarVaccination("BCG", new Date(), null)).toBe(false);
  });
});
