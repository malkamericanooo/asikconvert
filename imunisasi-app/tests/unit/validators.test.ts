import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  desanitizeString,
  isValidNIK,
  parseDate,
  isValidDate,
  normalizeName,
  normalizeNIK,
  isCellEmpty,
  isCellFilled,
} from "../../src/utils/validators";

describe("sanitizeString", () => {
  it("escapes & < > \" '", () => {
    expect(sanitizeString("a & b")).toBe("a &amp; b");
    expect(sanitizeString("<script>")).toBe("&lt;script&gt;");
    expect(sanitizeString('"hello"')).toBe("&quot;hello&quot;");
    expect(sanitizeString("it's")).toBe("it&#39;s");
  });

  it("leaves clean strings untouched", () => {
    expect(sanitizeString("hello world")).toBe("hello world");
  });
});

describe("desanitizeString", () => {
  it("round-trips with sanitize", () => {
    const original = 'R&D <test> "quote" it\'s';
    expect(desanitizeString(sanitizeString(original))).toBe(original);
  });
});

describe("isValidNIK", () => {
  it("returns true for null/undefined (optional)", () => {
    expect(isValidNIK(null)).toBe(true);
    expect(isValidNIK(undefined)).toBe(true);
    expect(isValidNIK("")).toBe(true);
  });

  it("returns true for valid 16-digit NIK", () => {
    expect(isValidNIK("3201234567890001")).toBe(true);
  });

  it("returns false for wrong length", () => {
    expect(isValidNIK("123456")).toBe(false);
    expect(isValidNIK("12345678901234567")).toBe(false);
  });

  it("returns false for non-digits", () => {
    expect(isValidNIK("320123456789000X")).toBe(false);
  });
});

describe("parseDate", () => {
  it("returns null for empty values", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate("")).toBeNull();
  });

  it("parses ISO date strings", () => {
    const d = parseDate("2024-01-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2024);
    expect(d!.getMonth()).toBe(0);
    expect(d!.getDate()).toBe(15);
  });

  it("parses Date objects", () => {
    const original = new Date(2024, 2, 10);
    const d = parseDate(original);
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(original.getTime());
  });

  it("returns null for invalid date string", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("isValidDate", () => {
  it("returns true for valid date", () => {
    expect(isValidDate("2024-05-20")).toBe(true);
    expect(isValidDate(new Date())).toBe(true);
  });

  it("returns false for invalid date", () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate("abc")).toBe(false);
  });
});

describe("normalizeName", () => {
  it("trims, lowercases, and collapses spaces", () => {
    expect(normalizeName("  BUDI  SANTOSO  ")).toBe("budi santoso");
    expect(normalizeName("ANA")).toBe("ana");
  });

  it("returns empty string for null/undefined", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("normalizeNIK", () => {
  it("strips spaces", () => {
    expect(normalizeNIK("3201 2345 6789 0001")).toBe("3201234567890001");
  });

  it("returns empty for null", () => {
    expect(normalizeNIK(null)).toBe("");
  });
});

describe("isCellEmpty / isCellFilled", () => {
  it("empty for null, undefined, empty string", () => {
    expect(isCellEmpty(null)).toBe(true);
    expect(isCellEmpty(undefined)).toBe(true);
    expect(isCellEmpty("")).toBe(true);
    expect(isCellEmpty("   ")).toBe(true);
  });

  it("filled for date and non-empty string", () => {
    expect(isCellFilled(new Date())).toBe(true);
    expect(isCellFilled("2024-01-01")).toBe(true);
  });
});
