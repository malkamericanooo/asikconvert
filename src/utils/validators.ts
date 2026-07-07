import { isValid, parse, parseISO } from "date-fns";

export function sanitizeString(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function desanitizeString(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function isValidNIK(nik: string | null | undefined): boolean {
  if (!nik) return true;
  const cleaned = String(nik).trim().replace(/\s/g, "");
  return /^\d{16}$/.test(cleaned);
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value === "number") {
    const d = new Date((value - 25569) * 86400 * 1000);
    return isValid(d) ? d : null;
  }
  if (typeof value === "string") {
    const str = value.trim();
    if (!str) return null;
    const parsed = parseISO(str);
    if (isValid(parsed)) return parsed;
    const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "dd/MM/yy"];
    for (const fmt of formats) {
      const d = parse(str, fmt, new Date());
      if (isValid(d)) return d;
    }
  }
  return null;
}

export function isValidDate(value: unknown): boolean {
  return parseDate(value) !== null;
}

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeNIK(nik: string | null | undefined): string {
  if (!nik) return "";
  return String(nik).trim().replace(/\s/g, "");
}

export function formatDateForExcel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : parseDate(date);
  if (!d) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function isCellEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export function isCellFilled(value: unknown): boolean {
  return !isCellEmpty(value);
}

/**
 * Returns the number of COMPLETE months between birthDate and vaccinationDate.
 * For example: born Jan 15, vaccinated Apr 10 → 2 complete months (not 3).
 * Returns null if either date is null.
 */
export function getAgeInMonths(
  birthDate: Date | null,
  vaccinationDate: Date | null
): number | null {
  if (!birthDate || !vaccinationDate) return null;
  let months =
    (vaccinationDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (vaccinationDate.getMonth() - birthDate.getMonth());
  // Subtract one if the day hasn't been reached yet this month
  if (vaccinationDate.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return months < 0 ? 0 : months;
}
