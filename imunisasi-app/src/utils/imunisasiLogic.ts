import {
  BalitaRow,
  VACCINE_COLUMNS,
  VaccineColumn,
} from "../types";
import {
  normalizeName,
  normalizeNIK,
  isCellEmpty,
  isCellFilled,
  parseDate,
} from "./validators";

export interface MatchResult {
  found: boolean;
  rowIndex: number;
}

/**
 * Match a balita from ASIK against existing master rows.
 * Primary key: normalized Nama + Tanggal Lahir.
 * Tiebreakers: NIK (if both present), Alamat/Kelurahan (if both present).
 */
export function matchBalita(
  masterRows: BalitaRow[],
  updateRow: BalitaRow
): MatchResult {
  const updateNama = normalizeName(updateRow.Nama);
  const updateNIK = normalizeNIK(updateRow.NIK);
  const updateTLDate = parseDate(updateRow["Tanggal Lahir"]);
  const updateAlamat = normalizeName(updateRow.Alamat ?? "");

  for (let i = 0; i < masterRows.length; i++) {
    const master = masterRows[i];
    const masterNama = normalizeName(master.Nama);

    if (updateNama !== masterNama) continue;

    const masterTLDate = parseDate(master["Tanggal Lahir"]);
    if (masterTLDate && updateTLDate) {
      if (masterTLDate.getTime() !== updateTLDate.getTime()) continue;
    }

    // NIK tiebreaker (only when both are present and non-zero)
    const masterNIK = normalizeNIK(master.NIK);
    if (updateNIK && masterNIK && updateNIK !== masterNIK) continue;

    // Alamat tiebreaker (optional)
    const masterAlamat = normalizeName(master.Alamat ?? "");
    if (
      updateAlamat &&
      masterAlamat &&
      !masterAlamat.includes(updateAlamat) &&
      !updateAlamat.includes(masterAlamat)
    ) {
      continue;
    }

    return { found: true, rowIndex: i };
  }

  return { found: false, rowIndex: -1 };
}

export interface VaccineUpdateResult {
  updatedColumns: string[];
  skippedColumns: string[];
}

/**
 * Direct column fill for ASIK data.
 * Each ASIK row already specifies the exact dose (e.g. DPT-HB-Hib - 2 → DPT2).
 * Fills only empty slots; does NOT overwrite or advance series.
 */
export function applyVaccineUpdateDirect(
  masterRow: BalitaRow,
  updateRow: BalitaRow
): VaccineUpdateResult {
  const updatedColumns: string[] = [];
  const skippedColumns: string[] = [];

  for (const col of VACCINE_COLUMNS) {
    const updateVal = updateRow[col];
    if (!isCellFilled(updateVal)) continue;

    if (isCellEmpty(masterRow[col])) {
      masterRow[col] = updateVal;
      updatedColumns.push(col);
    } else {
      skippedColumns.push(`${col} (sudah terisi)`);
    }
  }

  return { updatedColumns, skippedColumns };
}

export function createNewBalitaRow(updateRow: BalitaRow): BalitaRow {
  const newRow: BalitaRow = {
    Nama: updateRow.Nama || "",
    JK: updateRow.JK || null,
    "Tanggal Lahir": updateRow["Tanggal Lahir"] || null,
    NIK: updateRow.NIK || "",
    "Nama Orang Tua": updateRow["Nama Orang Tua"] || "",
    Alamat: updateRow.Alamat || "",
  };

  for (const col of VACCINE_COLUMNS) {
    newRow[col as string] = isCellFilled(updateRow[col])
      ? (updateRow[col] as Date | string)
      : null;
  }

  return newRow;
}
