import ExcelJS from "exceljs";
import {
  BalitaRow,
  MasterData,
  SheetData,
  FileResult,
  GlobalResult,
  ProcessProgress,
  VACCINE_COLUMNS,
  VaccineColumn,
  VaccineColPair,
  IdentityColMap,
  SheetResult,
  RowDetail,
  ANTIGEN_TO_COLUMN,
  MASTER_VACCINE_TO_INTERNAL,
  KEJAR_AGE_THRESHOLD,
} from "../types";
import { isCellFilled, parseDate, normalizeName, getAgeInMonths } from "./validators";
import {
  matchBalita,
  applyVaccineUpdateDirect,
  createNewBalitaRow,
} from "./imunisasiLogic";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readCellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && "richText" in v)
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  if (typeof v === "object" && "result" in v)
    return String((v as { result: unknown }).result ?? "");
  return String(v);
}

function readCellValue(cell: ExcelJS.Cell): Date | string | null {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && "richText" in v)
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  if (typeof v === "object" && "result" in v)
    return String((v as { result: unknown }).result ?? "");
  return String(v);
}

function normVaccineName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

function normSheet(name: string): string {
  return name.trim().toUpperCase().replace(/[''`]/g, "").replace(/\s+/g, " ");
}

/**
 * Find the vaccine-header row in a worksheet.
 * Returns row number where col 1 = "NO" and col 2 = "Nama".
 * Scans the first 15 rows.
 */
function findHeaderRow(ws: ExcelJS.Worksheet): number {
  for (let r = 1; r <= 15; r++) {
    const row = ws.getRow(r);
    const col1 = readCellText(row.getCell(1)).trim().toUpperCase();
    const col2 = readCellText(row.getCell(2)).trim().toUpperCase();
    if (col1 === "NO" && col2 === "NAMA") return r;
  }
  return -1;
}

/**
 * Build vaccine column map and identity column map from the two header rows.
 */
function buildColumnMaps(
  vaccineHeaderRow: ExcelJS.Row,
  genderRow: ExcelJS.Row,
  maxCol: number
): {
  vaccineColMap: Partial<Record<VaccineColumn, VaccineColPair>>;
  identityColMap: IdentityColMap;
} {
  const vaccineColMap: Partial<Record<VaccineColumn, VaccineColPair>> = {};
  const identityColMap: IdentityColMap = { nama: 2, tanggalLahir: 4 };

  // Temporary: vaccine name → colL or colP
  const lCols = new Map<string, number>();
  const pCols = new Map<string, number>();

  for (let col = 1; col <= maxCol; col++) {
    const vName = readCellText(vaccineHeaderRow.getCell(col)).trim();
    const gender = readCellText(genderRow.getCell(col)).trim().toUpperCase();
    if (!vName) continue;

    if (gender === "L") {
      lCols.set(normVaccineName(vName), col);
    } else if (gender === "P") {
      pCols.set(normVaccineName(vName), col);
    } else {
      // Identity column
      const vUpper = vName.toUpperCase();
      if (vUpper === "NO") identityColMap.no = col;
      else if (vUpper === "NAMA") identityColMap.nama = col;
      else if (vUpper === "JK") identityColMap.jk = col;
      else if (vUpper === "TANGGAL LAHIR") identityColMap.tanggalLahir = col;
      else if (vUpper === "NIK") identityColMap.nik = col;
      else if (vUpper === "NAMA ORANG TUA") identityColMap.namaOrangTua = col;
      else if (vUpper === "ALAMAT") identityColMap.alamat = col;
    }
  }

  // Merge L and P cols for each vaccine
  for (const [normName, colL] of lCols.entries()) {
    const colP = pCols.get(normName);
    if (!colP) continue;
    const internalName = MASTER_VACCINE_TO_INTERNAL[normName];
    if (internalName) {
      vaccineColMap[internalName] = { colL, colP };
    }
  }

  return { vaccineColMap, identityColMap };
}

// ---------------------------------------------------------------------------
// Read master file
// ---------------------------------------------------------------------------

export async function readMasterFile(file: File): Promise<MasterData> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets = new Map<string, SheetData>();

  for (const ws of workbook.worksheets) {
    const sheetName = ws.name;
    const headerRowNum = findHeaderRow(ws);
    if (headerRowNum < 0) continue; // skip sheets without proper header

    const genderRowNum = headerRowNum + 1;
    const dataStartRow = genderRowNum + 1;

    const vaccineHeaderRow = ws.getRow(headerRowNum);
    const genderRow = ws.getRow(genderRowNum);
    const maxCol = ws.columnCount || 60;

    const { vaccineColMap, identityColMap } = buildColumnMaps(
      vaccineHeaderRow,
      genderRow,
      maxCol
    );

    const rows: BalitaRow[] = [];
    let footerStartRow: number | undefined;

    for (let rowIdx = dataStartRow; rowIdx <= ws.rowCount; rowIdx++) {
      const row = ws.getRow(rowIdx);

      const namaRaw = readCellText(row.getCell(identityColMap.nama)).trim();
      if (!namaRaw) {
        // Check if this is the start of the Jumlah / Total footer section
        const col7 = identityColMap.alamat
          ? readCellText(row.getCell(identityColMap.alamat)).trim()
          : readCellText(row.getCell(7)).trim();
        if (
          col7.toLowerCase().includes("jumlah") ||
          col7.toLowerCase().startsWith("total")
        ) {
          footerStartRow = rowIdx;
          break;
        }
        continue;
      }

      const tglLahir = readCellValue(
        row.getCell(identityColMap.tanggalLahir)
      );
      const jkRaw = identityColMap.jk
        ? readCellText(row.getCell(identityColMap.jk)).trim().toUpperCase()
        : null;
      const jk = jkRaw === "L" ? "L" : jkRaw === "P" ? "P" : null;
      const nik = identityColMap.nik
        ? readCellText(row.getCell(identityColMap.nik)).replace(/^'/, "").trim()
        : "";
      const namaOrangTua = identityColMap.namaOrangTua
        ? readCellText(row.getCell(identityColMap.namaOrangTua)).trim()
        : "";
      const alamat = identityColMap.alamat
        ? readCellText(row.getCell(identityColMap.alamat)).trim()
        : "";
      const no = identityColMap.no
        ? readCellValue(row.getCell(identityColMap.no))
        : null;

      const rowData: BalitaRow = {
        NO: no !== null ? String(no) : null,
        Nama: namaRaw,
        JK: jk,
        "Tanggal Lahir": tglLahir,
        NIK: nik,
        "Nama Orang Tua": namaOrangTua,
        Alamat: alamat,
      };

      // Read vaccine dates: take L value if JK=L, P value if JK=P, or whichever is non-null
      for (const [internalName, pair] of Object.entries(vaccineColMap) as [
        VaccineColumn,
        VaccineColPair
      ][]) {
        if (!pair) continue;
        const lVal = readCellValue(row.getCell(pair.colL));
        const pVal = readCellValue(row.getCell(pair.colP));
        let dateVal: Date | string | null = null;
        if (jk === "L") dateVal = lVal;
        else if (jk === "P") dateVal = pVal;
        else dateVal = lVal ?? pVal; // fallback if JK missing

        // Treat "0" or empty string as null
        if (dateVal === "0" || dateVal === "") dateVal = null;
        rowData[internalName] = dateVal;
      }

      rows.push(rowData);
    }

    sheets.set(sheetName, {
      sheetName,
      rows,
      vaccineColMap,
      identityColMap,
      dataStartRow,
      footerStartRow,
    });
  }

  return { sheets, fileName: file.name };
}

// ---------------------------------------------------------------------------
// Read ASIK update file (1 row per vaccination event)
// ---------------------------------------------------------------------------

export interface AsikReadResult {
  sheets: Map<string, SheetData>;
  unknownAntigens: string[];
}

/**
 * Resolves a Nama Antigen string from ASIK to an internal VaccineColumn.
 * Returns VaccineColumn, null (known but no master column), or undefined (unknown).
 */
function resolveAntigen(antigenRaw: string): VaccineColumn | null | undefined {
  const key = antigenRaw.trim().toUpperCase();
  if (Object.prototype.hasOwnProperty.call(ANTIGEN_TO_COLUMN, key)) {
    return ANTIGEN_TO_COLUMN[key] as VaccineColumn | null;
  }
  return undefined;
}

/**
 * Returns true when the vaccination event for `vaccineCol` should be routed
 * to the Kejar (catch-up) sheet instead of the child's home kelurahan sheet.
 *
 * A vaccination is "KEJAR" when the child's age in complete months at the
 * time of vaccination meets or exceeds the threshold defined in
 * KEJAR_AGE_THRESHOLD for that vaccine. Vaccines with no threshold (HB0,
 * Rota 1-3) never produce a Kejar routing.
 */
export function isKejarVaccination(
  vaccineCol: string,
  birthDate: Date | null,
  vaccinationDate: Date | null
): boolean {
  const threshold =
    KEJAR_AGE_THRESHOLD[vaccineCol as VaccineColumn];
  if (threshold === undefined) return false;
  const age = getAgeInMonths(birthDate, vaccinationDate);
  if (age === null) return false;
  return age >= threshold;
}

export async function readAsikFile(file: File): Promise<AsikReadResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.worksheets[0];
  if (!ws) return { sheets: new Map(), unknownAntigens: [] };

  // Discover column indices by header name (row 1)
  const colIdx: Record<string, number> = {};
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    const h = readCellText(cell).trim();
    if (h) colIdx[h] = col;
  });

  const NAMA_COL = colIdx["Nama Anak"];
  const TGL_LAHIR_COL = colIdx["Tanggal Lahir Anak"];
  const NIK_COL = colIdx["NIK Anak"];
  const KELURAHAN_COL = colIdx["Kelurahan atau Desa"];
  const ANTIGEN_COL = colIdx["Nama Antigen"];
  const TGL_IMUNISASI_COL = colIdx["Tanggal Imunisasi"];
  const JK_COL = colIdx["Jenis Kelamin Anak"];

  if (!NAMA_COL || !ANTIGEN_COL || !TGL_IMUNISASI_COL) {
    return { sheets: new Map(), unknownAntigens: [] };
  }

  // child key → { kelurahan, BalitaRow }
  const childMap = new Map<string, { kelurahan: string; row: BalitaRow }>();
  const unknownAntigens = new Set<string>();

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const nama = readCellText(row.getCell(NAMA_COL)).trim();
    if (!nama) continue;

    const antigenRaw = readCellText(row.getCell(ANTIGEN_COL)).trim();
    const tglImunisasiRaw = readCellValue(row.getCell(TGL_IMUNISASI_COL));
    const kelurahanRaw = KELURAHAN_COL
      ? readCellText(row.getCell(KELURAHAN_COL)).trim()
      : "";
    const tglLahirRaw = TGL_LAHIR_COL
      ? readCellValue(row.getCell(TGL_LAHIR_COL))
      : null;
    const nikRaw = NIK_COL
      ? readCellText(row.getCell(NIK_COL)).replace(/^'/, "").trim()
      : "";
    const jkRaw = JK_COL
      ? readCellText(row.getCell(JK_COL)).trim()
      : "";

    const vaccineCol = resolveAntigen(antigenRaw);
    if (vaccineCol === undefined) {
      if (antigenRaw) unknownAntigens.add(antigenRaw);
      continue;
    }

    const nik =
      nikRaw && !/^0+$/.test(nikRaw) ? nikRaw : "";

    // Normalize JK from ASIK (Laki-laki / Perempuan) to L / P
    const jk: "L" | "P" | null = jkRaw.toLowerCase().startsWith("l")
      ? "L"
      : jkRaw.toLowerCase().startsWith("p")
      ? "P"
      : null;

    const tglLahirStr =
      tglLahirRaw instanceof Date
        ? tglLahirRaw.toISOString().slice(0, 10)
        : String(tglLahirRaw ?? "");

    // Determine if this specific vaccination event is KEJAR based on the
    // child's age at vaccination time vs the KMS 2022 threshold for this
    // antigen (pink zone). Kejar events route to the "Kejar" master sheet.
    const birthDateObj = tglLahirRaw instanceof Date
      ? tglLahirRaw
      : parseDate(tglLahirStr);
    const vaccDateObj = tglImunisasiRaw instanceof Date
      ? tglImunisasiRaw
      : tglImunisasiRaw !== null
      ? parseDate(String(tglImunisasiRaw))
      : null;

    const kejar =
      vaccineCol !== null &&
      isCellFilled(tglImunisasiRaw) &&
      isKejarVaccination(vaccineCol as string, birthDateObj, vaccDateObj);

    // Kejar vaccinations go into a separate child entry routed to the "Kejar"
    // master sheet; normal vaccinations go to the home kelurahan entry.
    const effectiveKelurahan = kejar ? "KEJAR" : kelurahanRaw;
    const childKey = kejar
      ? `KEJAR||${normalizeName(nama)}||${tglLahirStr}`
      : `${kelurahanRaw}||${normalizeName(nama)}||${tglLahirStr}`;

    if (!childMap.has(childKey)) {
      childMap.set(childKey, {
        kelurahan: effectiveKelurahan,
        row: {
          Nama: nama,
          JK: jk,
          "Tanggal Lahir": tglLahirRaw,
          NIK: nik,
          Alamat: kejar ? kelurahanRaw : kelurahanRaw, // preserve original address
        },
      });
    }

    // Set the vaccine column if valid and not yet set for this child entry
    if (vaccineCol && isCellFilled(tglImunisasiRaw)) {
      const entry = childMap.get(childKey)!;
      if (!isCellFilled(entry.row[vaccineCol])) {
        entry.row[vaccineCol] = tglImunisasiRaw;
      }
    }
  }

  // Group by kelurahan → SheetData
  const sheetMap = new Map<string, SheetData>();
  for (const { kelurahan, row } of childMap.values()) {
    if (!sheetMap.has(kelurahan)) {
      sheetMap.set(kelurahan, {
        sheetName: kelurahan,
        rows: [],
        vaccineColMap: {},
        identityColMap: { nama: 2, tanggalLahir: 4 },
        dataStartRow: 7,
      });
    }
    sheetMap.get(kelurahan)!.rows.push(row);
  }

  return { sheets: sheetMap, unknownAntigens: [...unknownAntigens] };
}

// ---------------------------------------------------------------------------
// Route kelurahan → master sheet name
// ---------------------------------------------------------------------------

export function routeKelurahan(
  kelurahan: string,
  masterSheetNames: string[]
): string {
  const normK = normSheet(kelurahan);
  for (const name of masterSheetNames) {
    if (normSheet(name) === normK) return name;
  }
  // Return the Luar Wilayah sheet from the list (case-insensitive), preserving its casing
  const luarWilayah = masterSheetNames.find(
    (n) => normSheet(n) === "LUAR WILAYAH"
  );
  return luarWilayah ?? "LUAR WILAYAH";
}

// ---------------------------------------------------------------------------
// Process one ASIK file against masterData
// ---------------------------------------------------------------------------

export async function processUpdateFile(
  masterData: MasterData,
  updateFile: File,
  onProgress?: (progress: ProcessProgress) => void,
  fileIndex?: number,
  totalFiles?: number
): Promise<FileResult> {
  const warnings: string[] = [];
  const sheetResults: SheetResult[] = [];
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  let asikResult: AsikReadResult;
  try {
    asikResult = await readAsikFile(updateFile);
  } catch {
    return {
      fileName: updateFile.name,
      sheetsProcessed: [],
      totalAdded: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      warnings: [],
      error: `Gagal membaca file: ${updateFile.name}`,
    };
  }

  if (asikResult.unknownAntigens.length > 0) {
    warnings.push(
      `Antigen tidak dikenal (dilewati): ${asikResult.unknownAntigens.join(", ")}`
    );
  }

  const masterSheetNames = [...masterData.sheets.keys()];

  // Accumulate rows per destination master sheet
  const destRows = new Map<string, BalitaRow[]>();
  for (const [kelurahan, sheet] of asikResult.sheets.entries()) {
    const dest = routeKelurahan(kelurahan, masterSheetNames);
    if (!destRows.has(dest)) destRows.set(dest, []);
    destRows.get(dest)!.push(...sheet.rows);
  }

  for (const [destSheet, updateRows] of destRows.entries()) {
    onProgress?.({
      currentFile: (fileIndex ?? 0) + 1,
      totalFiles: totalFiles ?? 1,
      currentFileName: updateFile.name,
      currentSheet: destSheet,
      currentRow: 0,
      totalRows: updateRows.length,
      phase: "processing",
    });

    // Ensure master sheet exists
    let masterSheet = masterData.sheets.get(destSheet);
    if (!masterSheet) {
      // Clone column maps from first existing sheet
      const refSheet = masterData.sheets.values().next().value as
        | SheetData
        | undefined;
      masterSheet = {
        sheetName: destSheet,
        rows: [],
        vaccineColMap: refSheet ? { ...refSheet.vaccineColMap } : {},
        identityColMap: refSheet
          ? { ...refSheet.identityColMap }
          : { nama: 2, tanggalLahir: 4 },
        dataStartRow: refSheet?.dataStartRow ?? 7,
      };
      masterData.sheets.set(destSheet, masterSheet);
      if (destSheet !== "LUAR WILAYAH") {
        warnings.push(`Sheet "${destSheet}" tidak ada di master — dibuat baru.`);
      }
    }

    const sheetResult: SheetResult = {
      sheetName: destSheet,
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      rowDetails: [],
    };

    for (let rIdx = 0; rIdx < updateRows.length; rIdx++) {
      const updateRow = updateRows[rIdx];

      onProgress?.({
        currentFile: (fileIndex ?? 0) + 1,
        totalFiles: totalFiles ?? 1,
        currentFileName: updateFile.name,
        currentSheet: destSheet,
        currentRow: rIdx + 1,
        totalRows: updateRows.length,
        phase: "processing",
      });

      if (!updateRow.Nama) {
        sheetResult.skippedCount++;
        continue;
      }

      const hasVaccine = VACCINE_COLUMNS.some((col) =>
        isCellFilled(updateRow[col])
      );
      if (!hasVaccine) {
        sheetResult.skippedCount++;
        continue;
      }

      const match = matchBalita(masterSheet.rows, updateRow);

      if (match.found) {
        const masterRow = masterSheet.rows[match.rowIndex];
        const result = applyVaccineUpdateDirect(masterRow, updateRow);
        if (result.updatedColumns.length > 0) {
          sheetResult.updatedCount++;
          totalUpdated++;
          sheetResult.rowDetails.push({
            nama: updateRow.Nama,
            jk: updateRow.JK ?? null,
            action: "updated",
            sheetName: destSheet,
            updatedColumns: result.updatedColumns,
          });
        } else {
          sheetResult.skippedCount++;
          totalSkipped++;
        }
        if (result.skippedColumns.length > 0) {
          warnings.push(
            `${updateRow.Nama}: ${result.skippedColumns.join(", ")}`
          );
        }
      } else {
        masterSheet.rows.push(createNewBalitaRow(updateRow));
        sheetResult.addedCount++;
        totalAdded++;
        sheetResult.rowDetails.push({
          nama: updateRow.Nama,
          jk: updateRow.JK ?? null,
          action: "added",
          sheetName: destSheet,
          updatedColumns: VACCINE_COLUMNS.filter((col) =>
            isCellFilled(updateRow[col])
          ) as string[],
        });
      }
    }

    sheetResults.push(sheetResult);
  }

  return {
    fileName: updateFile.name,
    sheetsProcessed: sheetResults,
    totalAdded,
    totalUpdated,
    totalSkipped,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Process all ASIK files sequentially
// ---------------------------------------------------------------------------

export async function processAllUpdateFiles(
  masterData: MasterData,
  updateFiles: File[],
  onProgress?: (progress: ProcessProgress) => void
): Promise<GlobalResult> {
  const fileResults: FileResult[] = [];
  const warnings: string[] = [];
  let totalAdded = 0;
  let totalUpdated = 0;

  for (let i = 0; i < updateFiles.length; i++) {
    const file = updateFiles[i];
    onProgress?.({
      currentFile: i + 1,
      totalFiles: updateFiles.length,
      currentFileName: file.name,
      currentSheet: "",
      currentRow: 0,
      totalRows: 0,
      phase: "reading",
    });

    const result = await processUpdateFile(
      masterData,
      file,
      onProgress,
      i,
      updateFiles.length
    );

    fileResults.push(result);
    totalAdded += result.totalAdded;
    totalUpdated += result.totalUpdated;
    if (result.warnings)
      warnings.push(...result.warnings.map((w) => `[${file.name}] ${w}`));
  }

  return { filesProcessed: updateFiles.length, totalAdded, totalUpdated, fileResults, warnings };
}

// ---------------------------------------------------------------------------
// Export updated master back to .xlsx, preserving styling
// ---------------------------------------------------------------------------

export async function exportMasterToBlob(
  originalFile: File,
  masterData: MasterData
): Promise<Blob> {
  const originalBuffer = await originalFile.arrayBuffer();
  const origWb = new ExcelJS.Workbook();
  await origWb.xlsx.load(originalBuffer);

  const newWb = new ExcelJS.Workbook();
  newWb.creator = origWb.creator || "Imunisasi Updater";
  newWb.created = new Date();

  const processedSheets = new Set<string>();

  for (const origWs of origWb.worksheets) {
    const sheetName = origWs.name;
    processedSheets.add(sheetName);

    const masterSheet = masterData.sheets.get(sheetName);
    const newWs = newWb.addWorksheet(sheetName);
    newWs.properties = { ...origWs.properties };

    // Copy column widths
    for (let c = 1; c <= origWs.columnCount; c++) {
      newWs.getColumn(c).width = origWs.getColumn(c).width ?? 12;
    }

    // If no master data for this sheet, copy verbatim
    if (!masterSheet) {
      for (let r = 1; r <= origWs.rowCount; r++) {
        const origRow = origWs.getRow(r);
        const newRow = newWs.getRow(r);
        origRow.eachCell({ includeEmpty: true }, (cell, col) => {
          const newCell = newRow.getCell(col);
          newCell.value = cell.value;
          if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
        });
        newRow.height = origRow.height;
      }
      continue;
    }

    const { identityColMap, vaccineColMap, dataStartRow } = masterSheet;

    // Copy header rows (rows 1 to dataStartRow-1) verbatim
    for (let r = 1; r < dataStartRow; r++) {
      const origRow = origWs.getRow(r);
      const newRow = newWs.getRow(r);
      origRow.eachCell({ includeEmpty: true }, (cell, col) => {
        const newCell = newRow.getCell(col);
        newCell.value = cell.value;
        if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
      });
      newRow.height = origRow.height;
    }

    // Determine row range for style cloning: use last original data row
    // (but NOT the footer rows) as the style source for appended rows
    const origFooter = masterSheet.footerStartRow;
    const origLastDataRow = origFooter
      ? origFooter - 1
      : origWs.rowCount;

    // Write data rows
    for (let rIdx = 0; rIdx < masterSheet.rows.length; rIdx++) {
      const rowData = masterSheet.rows[rIdx];
      const excelRow = dataStartRow + rIdx;
      const newRow = newWs.getRow(excelRow);

      // Copy style from corresponding original data row, falling back to
      // the last original data row (so appended rows inherit its style).
      const styleRowNum = Math.min(excelRow, origLastDataRow);
      const styleSourceRow =
        styleRowNum >= dataStartRow ? origWs.getRow(styleRowNum) : null;

      if (styleSourceRow) {
        styleSourceRow.eachCell({ includeEmpty: true }, (cell, col) => {
          if (cell.style)
            newRow.getCell(col).style = JSON.parse(JSON.stringify(cell.style));
        });
        newRow.height = styleSourceRow.height;
      }

      // Write identity fields
      const writeCell = (col: number | undefined, value: unknown) => {
        if (!col) return;
        const cell = newRow.getCell(col);
        if (value instanceof Date) {
          cell.value = value;
          if (!cell.numFmt) cell.numFmt = "dd/mm/yyyy";
        } else if (value === null || value === undefined) {
          cell.value = null;
        } else {
          const d = parseDate(value as string);
          if (d) {
            cell.value = d;
            if (!cell.numFmt) cell.numFmt = "dd/mm/yyyy";
          } else {
            cell.value = value as string | number;
          }
        }
      };

      writeCell(identityColMap.no, rowData.NO ?? rIdx + 1);
      writeCell(identityColMap.nama, rowData.Nama);
      writeCell(identityColMap.jk, rowData.JK);
      writeCell(identityColMap.tanggalLahir, rowData["Tanggal Lahir"]);
      writeCell(identityColMap.nik, rowData.NIK);
      writeCell(identityColMap.namaOrangTua, rowData["Nama Orang Tua"]);
      writeCell(identityColMap.alamat, rowData.Alamat);

      // Write vaccine dates to correct L/P column
      for (const [internalName, pair] of Object.entries(vaccineColMap) as [
        VaccineColumn,
        VaccineColPair
      ][]) {
        if (!pair) continue;
        const dateVal = rowData[internalName as string];

        const jk = rowData.JK;
        const targetCol =
          jk === "L" ? pair.colL : jk === "P" ? pair.colP : null;

        if (targetCol && isCellFilled(dateVal)) {
          writeCell(targetCol, dateVal);
        }
      }
    }

    // Preserve footer rows (Jumlah / Total L+P) from the original sheet.
    // Place them immediately after the last data row — even if new rows were
    // appended, the footer follows the data.
    if (origFooter) {
      const newFooterStart = dataStartRow + masterSheet.rows.length;
      const origFooterEnd = origWs.rowCount;
      for (let origR = origFooter; origR <= origFooterEnd; origR++) {
        const offset = origR - origFooter;
        const newR = newFooterStart + offset;
        const origRow = origWs.getRow(origR);
        const newRow = newWs.getRow(newR);
        origRow.eachCell({ includeEmpty: true }, (cell, col) => {
          const newCell = newRow.getCell(col);
          newCell.value = cell.value;
          if (cell.style) newCell.style = JSON.parse(JSON.stringify(cell.style));
        });
        newRow.height = origRow.height;
      }
    }
  }

  // Add sheets that were created during processing (e.g. new "LUAR WILAYAH" if missing)
  for (const [sheetName, masterSheet] of masterData.sheets.entries()) {
    if (processedSheets.has(sheetName)) continue;

    const refOrigWs = origWb.worksheets[0];
    const newWs = newWb.addWorksheet(sheetName);

    // Copy column widths from first sheet
    if (refOrigWs) {
      for (let c = 1; c <= refOrigWs.columnCount; c++) {
        newWs.getColumn(c).width = refOrigWs.getColumn(c).width ?? 12;
      }
      // Copy header rows
      const refDataStart = masterSheet.dataStartRow;
      for (let r = 1; r < refDataStart; r++) {
        const origRow = refOrigWs.getRow(r);
        const newRow = newWs.getRow(r);
        origRow.eachCell({ includeEmpty: true }, (cell, col) => {
          newRow.getCell(col).value = cell.value;
          if (cell.style)
            newRow.getCell(col).style = JSON.parse(JSON.stringify(cell.style));
        });
        newRow.height = origRow.height;
      }
    }

    const { identityColMap, vaccineColMap, dataStartRow } = masterSheet;

    for (let rIdx = 0; rIdx < masterSheet.rows.length; rIdx++) {
      const rowData = masterSheet.rows[rIdx];
      const newRow = newWs.getRow(dataStartRow + rIdx);

      const writeCell = (col: number | undefined, value: unknown) => {
        if (!col) return;
        const cell = newRow.getCell(col);
        if (value instanceof Date) {
          cell.value = value;
          cell.numFmt = "dd/mm/yyyy";
        } else if (value !== null && value !== undefined) {
          const d = parseDate(value as string);
          if (d) {
            cell.value = d;
            cell.numFmt = "dd/mm/yyyy";
          } else {
            cell.value = value as string | number;
          }
        }
      };

      writeCell(identityColMap.no, rIdx + 1);
      writeCell(identityColMap.nama, rowData.Nama);
      writeCell(identityColMap.jk, rowData.JK);
      writeCell(identityColMap.tanggalLahir, rowData["Tanggal Lahir"]);
      writeCell(identityColMap.nik, rowData.NIK);
      writeCell(identityColMap.namaOrangTua, rowData["Nama Orang Tua"]);
      writeCell(identityColMap.alamat, rowData.Alamat);

      for (const [internalName, pair] of Object.entries(vaccineColMap) as [
        VaccineColumn,
        VaccineColPair
      ][]) {
        if (!pair) continue;
        const dateVal = rowData[internalName as string];
        const jk = rowData.JK;
        const targetCol = jk === "L" ? pair.colL : jk === "P" ? pair.colP : null;
        if (targetCol && isCellFilled(dateVal)) writeCell(targetCol, dateVal);
      }
    }
  }

  const uint8 = await newWb.xlsx.writeBuffer();
  return new Blob([uint8], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
