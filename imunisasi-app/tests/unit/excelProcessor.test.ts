import { describe, it, expect } from "vitest";
import {
  processAllUpdateFiles,
  routeKelurahan,
} from "../../src/utils/excelProcessor";
import type { MasterData, BalitaRow } from "../../src/types";
import { VACCINE_COLUMNS } from "../../src/types";

function makeMasterData(
  rows: BalitaRow[] = [],
  sheetName = "Sheet1"
): MasterData {
  return {
    sheets: new Map([
      [
        sheetName,
        {
          sheetName,
          rows,
          vaccineColMap: {},
          identityColMap: { nama: 2, tanggalLahir: 4 },
          dataStartRow: 7,
        },
      ],
    ]),
    fileName: "master.xlsx",
  };
}

describe("processAllUpdateFiles (unit — no real files)", () => {
  it("returns empty result for empty file list", async () => {
    const master = makeMasterData();
    const result = await processAllUpdateFiles(master, []);
    expect(result.filesProcessed).toBe(0);
    expect(result.totalAdded).toBe(0);
    expect(result.totalUpdated).toBe(0);
  });
});

describe("MasterData structure", () => {
  it("creates proper sheet structure", () => {
    const rows: BalitaRow[] = [
      {
        NIK: "3201234567890001",
        Nama: "Test Anak",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kel A",
      },
    ];
    const master = makeMasterData(rows);
    expect(master.sheets.has("Sheet1")).toBe(true);
    const sheet = master.sheets.get("Sheet1")!;
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0].Nama).toBe("Test Anak");
  });

  it("includes all expected vaccine columns in VACCINE_COLUMNS", () => {
    expect(VACCINE_COLUMNS).toContain("Polio1");
    expect(VACCINE_COLUMNS).toContain("BoosterMR");
    expect(VACCINE_COLUMNS).toContain("BCG");
    expect(VACCINE_COLUMNS).toContain("HB0_lt24h");
  });
});

describe("routeKelurahan (unit)", () => {
  const masterSheets = ["TANTA HULU", "JANGKUNG", "BELIMBING", "Luar Wilayah"];

  it("exact match returns the sheet name", () => {
    expect(routeKelurahan("TANTA HULU", masterSheets)).toBe("TANTA HULU");
  });

  it("case-insensitive match works", () => {
    expect(routeKelurahan("tanta hulu", masterSheets)).toBe("TANTA HULU");
  });

  it("unknown kelurahan routes to the Luar Wilayah sheet in the list", () => {
    expect(routeKelurahan("MABU'UN", masterSheets)).toBe("Luar Wilayah");
    expect(routeKelurahan("SULINGAN", masterSheets)).toBe("Luar Wilayah");
  });
});
