/**
 * Internal vaccine column names used throughout the app.
 * These map to pairs of L/P columns in the actual master Excel.
 */
export const VACCINE_COLUMNS = [
  "HB0_lt24h",        // HB0 (<24 JAM)
  "HB0_1_7d",         // HB0 (1-7 HARI)
  "BCG",
  "Polio1",
  "DPT1",
  "Polio2",
  "PCV1",
  "Rota1",
  "DPT2",
  "Polio3",
  "PCV2",
  "Rota2",
  "DPT3",
  "Polio4",
  "IPV1",
  "Rota3",            // 3rd Rota dose — exists in master
  "CampakRubella",
  "IPV2",             // 2nd IPV dose — exists in master
  "PCV3",
  "BoosterDPT",       // Booster DPT/HB/Hib
  "BoosterMR",
] as const;

export type VaccineColumn = (typeof VACCINE_COLUMNS)[number];

/**
 * Maps the normalized (uppercase) vaccine header name from the master Excel file
 * (row 5) to our internal VaccineColumn name.
 * Used when reading/writing the master file.
 */
export const MASTER_VACCINE_TO_INTERNAL: Record<string, VaccineColumn> = {
  "HB0 (<24 JAM)":        "HB0_lt24h",
  "HB0 (1-7 HARI)":       "HB0_1_7d",
  "BCG":                  "BCG",
  "POLIO (1)":             "Polio1",
  "DPT/HB-HIB (1)":       "DPT1",
  "POLIO (2)":             "Polio2",
  "PCV (1)":               "PCV1",
  "ROTA (1)":              "Rota1",
  "DPT/HB-HIB (2)":       "DPT2",
  "POLIO (3)":             "Polio3",
  "PCV (2)":               "PCV2",
  "ROTA (2)":              "Rota2",
  "DPT/HB-HIB (3)":       "DPT3",
  "POLIO (4)":             "Polio4",
  "IPV (1)":               "IPV1",
  "ROTA (3)":              "Rota3",
  "CAMPAK-RUBELLA (MR)":   "CampakRubella",
  "IPV (2)":               "IPV2",
  "PCV (3)":               "PCV3",
  "BOOSTER DPT/HB/HIB":   "BoosterDPT",
  "BOOSTER MR":            "BoosterMR",
};

/**
 * Maps "Nama Antigen" values from ASIK export files (normalized to uppercase)
 * to our internal VaccineColumn name.
 * null  = known antigen but no master column (skip silently, e.g. IBL)
 * Key lookup is done after .toUpperCase().trim() on the antigen string.
 */
export const ANTIGEN_TO_COLUMN: Record<string, VaccineColumn | null> = {
  // HB0
  "HB0 - 1":                  "HB0_lt24h",
  "HB0":                      "HB0_lt24h",
  "HEPATITIS B0":              "HB0_lt24h",
  "HB0 (<24 JAM)":             "HB0_lt24h",
  "HB0 (1-7 HARI)":            "HB0_1_7d",
  "HEP B0":                   "HB0_lt24h",
  // BCG
  "BCG - 1":                  "BCG",
  "BCG":                      "BCG",
  // Polio oral
  "POLIO TETES - 1":           "Polio1",
  "POLIO TETES - 2":           "Polio2",
  "POLIO TETES - 3":           "Polio3",
  "POLIO TETES - 4":           "Polio4",
  "OPV - 1":                  "Polio1",
  "OPV - 2":                  "Polio2",
  "OPV - 3":                  "Polio3",
  "OPV - 4":                  "Polio4",
  "POLIO - 1":                 "Polio1",
  "POLIO - 2":                 "Polio2",
  "POLIO - 3":                 "Polio3",
  "POLIO - 4":                 "Polio4",
  // DPT-HB-Hib (doses 1–3) and booster (dose 4)
  "DPT-HB-HIB - 1":           "DPT1",
  "DPT-HB-HIB - 2":           "DPT2",
  "DPT-HB-HIB - 3":           "DPT3",
  "DPT-HB-HIB - 4":           "BoosterDPT",
  "PENTAVALEN - 1":            "DPT1",
  "PENTAVALEN - 2":            "DPT2",
  "PENTAVALEN - 3":            "DPT3",
  "PENTAVALEN - 4":            "BoosterDPT",
  // PCV
  "PCV - 1":                  "PCV1",
  "PCV - 2":                  "PCV2",
  "PCV - 3":                  "PCV3",
  // Rotavirus — 3 doses!
  "ROTA - 1":                 "Rota1",
  "ROTA - 2":                 "Rota2",
  "ROTA - 3":                 "Rota3",
  "ROTAVIRUS - 1":             "Rota1",
  "ROTAVIRUS - 2":             "Rota2",
  "ROTAVIRUS - 3":             "Rota3",
  // IPV — 2 doses!
  "IPV - 1":                  "IPV1",
  "IPV - 2":                  "IPV2",
  "IPV":                      "IPV1",
  "POLIO SUNTIK - 1":          "IPV1",
  "POLIO SUNTIK - 2":          "IPV2",
  // MR / Campak Rubella
  "MR - 1":                   "CampakRubella",
  "MR - 2":                   "BoosterMR",
  "CAMPAK RUBELLA - 1":        "CampakRubella",
  "CAMPAK RUBELLA - 2":        "BoosterMR",
  "MR":                       "CampakRubella",
  // Administrative records — no master vaccine column
  "IMUNISASI BADUTA LENGKAP - 1": null,
  "IMUNISASI DASAR LENGKAP - 1":  null,
  "IDL - 1":                  null,
  "IBL - 1":                  null,
};

// ---------------------------------------------------------------------------
// Column-position map for master Excel sheets
// ---------------------------------------------------------------------------

/** L/P column pair for one vaccine in the master Excel. */
export interface VaccineColPair {
  colL: number;  // column index (1-based) for Laki-laki
  colP: number;  // column index (1-based) for Perempuan
}

/** Identity column positions in the master Excel. */
export interface IdentityColMap {
  no?: number;
  nama: number;
  jk?: number;
  tanggalLahir: number;
  nik?: number;
  namaOrangTua?: number;
  alamat?: number;
}

// ---------------------------------------------------------------------------
// BalitaRow — internal per-child representation
// ---------------------------------------------------------------------------

export interface BalitaRow {
  NO?: string | number | null;
  Nama: string;
  JK?: "L" | "P" | string | null;
  "Tanggal Lahir": Date | string | null;
  NIK?: string;
  "Nama Orang Tua"?: string;
  Alamat?: string;
  // Vaccine columns (internal names)
  HB0_lt24h?: Date | string | null;
  HB0_1_7d?: Date | string | null;
  BCG?: Date | string | null;
  Polio1?: Date | string | null;
  DPT1?: Date | string | null;
  Polio2?: Date | string | null;
  PCV1?: Date | string | null;
  Rota1?: Date | string | null;
  DPT2?: Date | string | null;
  Polio3?: Date | string | null;
  PCV2?: Date | string | null;
  Rota2?: Date | string | null;
  DPT3?: Date | string | null;
  Polio4?: Date | string | null;
  IPV1?: Date | string | null;
  Rota3?: Date | string | null;
  CampakRubella?: Date | string | null;
  IPV2?: Date | string | null;
  PCV3?: Date | string | null;
  BoosterDPT?: Date | string | null;
  BoosterMR?: Date | string | null;
  [key: string]: Date | string | number | null | undefined;
}

// ---------------------------------------------------------------------------
// Sheet + Master data structures
// ---------------------------------------------------------------------------

export interface SheetData {
  sheetName: string;
  rows: BalitaRow[];
  /** Internal vaccine name → L/P column positions in master Excel. */
  vaccineColMap: Partial<Record<VaccineColumn, VaccineColPair>>;
  /** Identity field → column position in master Excel. */
  identityColMap: IdentityColMap;
  /** Row number (1-based) where data starts (typically 7 in this master format). */
  dataStartRow: number;
  /**
   * Row number (1-based) where the footer section begins ("Jumlah" / "Total L+P").
   * Data rows must NOT be written at or beyond this row.
   * If undefined, the sheet has no detected footer.
   */
  footerStartRow?: number;
}

export interface MasterData {
  sheets: Map<string, SheetData>;
  fileName: string;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Kejar (catch-up) age thresholds
// ---------------------------------------------------------------------------
/**
 * Age in COMPLETE months at which a vaccination event is considered "KEJAR"
 * (catch-up immunization). Derived from the Indonesian KMS 2022 schedule:
 * pink zone = usia di luar jadwal normal, masuk sheet Kejar di master.
 *
 * undefined = no kejar applies for this vaccine (e.g. HB0, Rota 1-3).
 */
export const KEJAR_AGE_THRESHOLD: Partial<Record<VaccineColumn, number>> = {
  // HB0_lt24h / HB0_1_7d: no kejar — time-critical, can't catch up
  BCG: 3,       // ideal 0-2 months; brown at 2-3; kejar ≥ 3 months
  Polio1: 4,    // ideal 1 month;  kejar ≥ 4 months
  Polio2: 5,    // ideal 2 months; kejar ≥ 5 months
  Polio3: 6,    // ideal 3 months; kejar ≥ 6 months
  Polio4: 7,    // ideal 4 months; kejar ≥ 7 months
  DPT1: 4,      // ideal 2 months; kejar ≥ 4 months
  DPT2: 5,      // ideal 3 months; kejar ≥ 5 months
  DPT3: 6,      // ideal 4 months; kejar ≥ 6 months
  PCV1: 4,      // ideal 2 months; kejar ≥ 4 months
  PCV2: 6,      // ideal 4 months; kejar ≥ 6 months
  PCV3: 9,      // ideal 6 months; kejar ≥ 9 months
  // Rota 1-3: no kejar — strict max 8 months, no pink zone
  IPV1: 6,      // ideal 4 months; kejar ≥ 6 months
  IPV2: 12,     // ideal 9 months; kejar ≥ 12 months
  CampakRubella: 12, // ideal 9 months; kejar ≥ 12 months
  BoosterDPT: 24,    // ideal 18 months; kejar ≥ 24 months
  BoosterMR: 24,     // ideal 18 months; kejar ≥ 24 months
};

export interface RowDetail {
  nama: string;
  jk?: string | null;
  action: "added" | "updated";
  sheetName: string;
  updatedColumns: string[];
}

export interface SheetResult {
  sheetName: string;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  rowDetails: RowDetail[];
}

export interface FileResult {
  fileName: string;
  sheetsProcessed: SheetResult[];
  totalAdded: number;
  totalUpdated: number;
  totalSkipped: number;
  warnings: string[];
  error?: string;
}

export interface GlobalResult {
  filesProcessed: number;
  totalAdded: number;
  totalUpdated: number;
  fileResults: FileResult[];
  warnings: string[];
}

export interface ProcessProgress {
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  currentSheet: string;
  currentRow: number;
  totalRows: number;
  phase: "reading" | "processing" | "done" | "error";
}
