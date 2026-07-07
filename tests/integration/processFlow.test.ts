import { describe, it, expect } from "vitest";
import {
  matchBalita,
  applyVaccineUpdateDirect,
} from "../../src/utils/imunisasiLogic";
import { routeKelurahan } from "../../src/utils/excelProcessor";
import { parseDate } from "../../src/utils/validators";
import type { BalitaRow, MasterData } from "../../src/types";
import { VACCINE_COLUMNS, ANTIGEN_TO_COLUMN } from "../../src/types";

function createMasterData(
  rows: BalitaRow[],
  sheetName = "Kelurahan A"
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

function simulateProcessFileDirect(
  masterData: MasterData,
  updateRows: BalitaRow[],
  sheetName = "Kelurahan A"
): { added: number; updated: number } {
  let added = 0;
  let updated = 0;

  const masterSheet = masterData.sheets.get(sheetName);
  if (!masterSheet) return { added, updated };

  for (const updateRow of updateRows) {
    const match = matchBalita(masterSheet.rows, updateRow);
    if (match.found) {
      const masterRow = masterSheet.rows[match.rowIndex];
      const result = applyVaccineUpdateDirect(masterRow, updateRow);
      if (result.updatedColumns.length > 0) updated++;
    } else {
      masterSheet.rows.push({ ...updateRow });
      added++;
    }
  }

  return { added, updated };
}

// ---------------------------------------------------------------------------
// ANTIGEN_TO_COLUMN mapping
// ---------------------------------------------------------------------------

describe("ANTIGEN_TO_COLUMN mapping", () => {
  it("maps BCG - 1 to BCG", () => {
    expect(ANTIGEN_TO_COLUMN["BCG - 1"]).toBe("BCG");
  });

  it("maps DPT-HB-HIB doses 1–3 correctly", () => {
    expect(ANTIGEN_TO_COLUMN["DPT-HB-HIB - 1"]).toBe("DPT1");
    expect(ANTIGEN_TO_COLUMN["DPT-HB-HIB - 2"]).toBe("DPT2");
    expect(ANTIGEN_TO_COLUMN["DPT-HB-HIB - 3"]).toBe("DPT3");
  });

  it("maps DPT-HB-HIB - 4 to BoosterDPT", () => {
    expect(ANTIGEN_TO_COLUMN["DPT-HB-HIB - 4"]).toBe("BoosterDPT");
  });

  it("maps POLIO TETES doses to Polio1–4", () => {
    expect(ANTIGEN_TO_COLUMN["POLIO TETES - 1"]).toBe("Polio1");
    expect(ANTIGEN_TO_COLUMN["POLIO TETES - 2"]).toBe("Polio2");
    expect(ANTIGEN_TO_COLUMN["POLIO TETES - 3"]).toBe("Polio3");
    expect(ANTIGEN_TO_COLUMN["POLIO TETES - 4"]).toBe("Polio4");
  });

  it("maps MR - 1 to CampakRubella and MR - 2 to BoosterMR", () => {
    expect(ANTIGEN_TO_COLUMN["MR - 1"]).toBe("CampakRubella");
    expect(ANTIGEN_TO_COLUMN["MR - 2"]).toBe("BoosterMR");
  });

  it("maps IPV - 1 to IPV1 and IPV - 2 to IPV2", () => {
    expect(ANTIGEN_TO_COLUMN["IPV - 1"]).toBe("IPV1");
    expect(ANTIGEN_TO_COLUMN["IPV - 2"]).toBe("IPV2");
  });

  it("maps IBL / IDL records to null (no master column)", () => {
    expect(ANTIGEN_TO_COLUMN["IMUNISASI BADUTA LENGKAP - 1"]).toBeNull();
    expect(ANTIGEN_TO_COLUMN["IDL - 1"]).toBeNull();
  });

  it("maps PCV and ROTA doses correctly", () => {
    expect(ANTIGEN_TO_COLUMN["PCV - 1"]).toBe("PCV1");
    expect(ANTIGEN_TO_COLUMN["PCV - 2"]).toBe("PCV2");
    expect(ANTIGEN_TO_COLUMN["PCV - 3"]).toBe("PCV3");
    expect(ANTIGEN_TO_COLUMN["ROTA - 1"]).toBe("Rota1");
    expect(ANTIGEN_TO_COLUMN["ROTA - 2"]).toBe("Rota2");
  });
});

// ---------------------------------------------------------------------------
// routeKelurahan
// ---------------------------------------------------------------------------

describe("routeKelurahan", () => {
  const masterSheets = [
    "TANTA HULU",
    "JANGKUNG",
    "BELIMBING RAYA",
    "BELIMBING",
    "Luar Wilayah",
  ];

  it("routes exact match to that sheet", () => {
    expect(routeKelurahan("TANTA HULU", masterSheets)).toBe("TANTA HULU");
  });

  it("routes case-insensitive match correctly", () => {
    expect(routeKelurahan("tanta hulu", masterSheets)).toBe("TANTA HULU");
    expect(routeKelurahan("Belimbing Raya", masterSheets)).toBe("BELIMBING RAYA");
  });

  it("routes unknown kelurahan to Luar Wilayah (fallback)", () => {
    expect(routeKelurahan("MABU'UN", masterSheets)).toBe("Luar Wilayah");
    expect(routeKelurahan("PEMBATAAN", masterSheets)).toBe("Luar Wilayah");
    expect(routeKelurahan("MABURAI", masterSheets)).toBe("Luar Wilayah");
    expect(routeKelurahan("SULINGAN", masterSheets)).toBe("Luar Wilayah");
  });

  it("handles apostrophe in kelurahan name gracefully", () => {
    const sheetsWithApostrophe = ["MABU'UN", ...masterSheets];
    expect(routeKelurahan("MABUUN", sheetsWithApostrophe)).toBe("MABU'UN");
    expect(routeKelurahan("MABU'UN", sheetsWithApostrophe)).toBe("MABU'UN");
  });
});

// ---------------------------------------------------------------------------
// applyVaccineUpdateDirect (ASIK mode — exact column, no series advance)
// ---------------------------------------------------------------------------

describe("applyVaccineUpdateDirect", () => {
  it("fills empty column in master", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
      BCG: new Date(2024, 0, 10),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("BCG");
    expect(master.BCG).toBeInstanceOf(Date);
  });

  it("skips already-filled column (does NOT advance series)", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
      DPT1: new Date(2024, 0, 10),
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
      DPT1: new Date(2024, 1, 10),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toHaveLength(0);
    expect(result.skippedColumns.length).toBeGreaterThan(0);
    // DPT2 must NOT be filled (no series advance in direct mode)
    expect(master.DPT2).toBeFalsy();
  });

  it("fills exact column when earlier slots already taken", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
      DPT1: new Date(2024, 0, 10),
      DPT2: new Date(2024, 2, 10),
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Kelurahan: "",
      DPT3: new Date(2024, 4, 10),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("DPT3");
    expect(master.DPT3).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Sequential file processing (direct mode)
// ---------------------------------------------------------------------------

describe("Integration: sequential multi-file processing", () => {
  const baseRows: BalitaRow[] = [
    {
      NIK: "3201000000000001",
      Nama: "Anak Satu",
      "Tanggal Lahir": new Date(2023, 0, 1),
      Kelurahan: "Kelurahan A",
    },
    {
      NIK: "3201000000000002",
      Nama: "Anak Dua",
      "Tanggal Lahir": new Date(2023, 2, 15),
      Kelurahan: "Kelurahan A",
    },
  ];

  it("file 1 adds new row and updates existing row", () => {
    const master = createMasterData(
      baseRows.map((r) => ({
        ...r,
        "Tanggal Lahir": new Date(r["Tanggal Lahir"] as Date),
      }))
    );

    const update1: BalitaRow[] = [
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        BCG: new Date(2023, 1, 5),
      },
      {
        NIK: "3201000000000003",
        Nama: "Anak Tiga",
        "Tanggal Lahir": new Date(2023, 4, 20),
        Kelurahan: "Kelurahan A",
        BCG: new Date(2023, 5, 10),
      },
    ];

    const result1 = simulateProcessFileDirect(master, update1);
    expect(result1.updated).toBe(1);
    expect(result1.added).toBe(1);

    const sheet = master.sheets.get("Kelurahan A")!;
    expect(sheet.rows).toHaveLength(3);
    expect(sheet.rows[0].BCG).toBeInstanceOf(Date);
  });

  it("file 2 builds on result of file 1", () => {
    const master = createMasterData([
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        BCG: new Date(2023, 1, 5),
      },
    ]);

    const update2: BalitaRow[] = [
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        Polio1: new Date(2023, 3, 10),
      },
    ];

    const result2 = simulateProcessFileDirect(master, update2);
    expect(result2.updated).toBe(1);
    expect(result2.added).toBe(0);

    const sheet = master.sheets.get("Kelurahan A")!;
    const row = sheet.rows[0];
    expect(row.BCG).toBeInstanceOf(Date);
    expect(row.Polio1).toBeInstanceOf(Date);
  });

  it("each ASIK file fills exact column — Polio2 only from ASIK_POLIO_2 file", () => {
    const master = createMasterData([
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
      },
    ]);

    const polio1Date = new Date(2023, 2, 1);
    const polio2Date = new Date(2023, 4, 1);
    const polio3Date = new Date(2023, 6, 1);

    // ASIK_POLIO_1: fills Polio1
    simulateProcessFileDirect(master, [
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        Polio1: polio1Date,
      },
    ]);

    // ASIK_POLIO_2: fills Polio2
    simulateProcessFileDirect(master, [
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        Polio2: polio2Date,
      },
    ]);

    // ASIK_POLIO_3: fills Polio3
    simulateProcessFileDirect(master, [
      {
        NIK: "3201000000000001",
        Nama: "Anak Satu",
        "Tanggal Lahir": new Date(2023, 0, 1),
        Kelurahan: "Kelurahan A",
        Polio3: polio3Date,
      },
    ]);

    const sheet = master.sheets.get("Kelurahan A")!;
    const row = sheet.rows[0];
    expect(row.Polio1).toEqual(polio1Date);
    expect(row.Polio2).toEqual(polio2Date);
    expect(row.Polio3).toEqual(polio3Date);
    expect(row.Polio4).toBeFalsy();
  });

  it("parseDate handles various formats", () => {
    expect(parseDate("2024-06-15")).not.toBeNull();
    expect(parseDate(new Date(2024, 5, 15))).not.toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyVaccineUpdateDirect — additional ASIK-mode edge cases
// ---------------------------------------------------------------------------

describe("applyVaccineUpdateDirect — edge cases", () => {
  it("fills Rota3 when Rota1 and Rota2 already filled", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Rota1: new Date(2023, 2, 1),
      Rota2: new Date(2023, 4, 1),
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      Rota3: new Date(2023, 6, 1),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("Rota3");
    expect(master.Rota3).toBeInstanceOf(Date);
  });

  it("fills IPV2 when IPV1 already filled", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      IPV1: new Date(2023, 5, 1),
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      IPV2: new Date(2023, 9, 1),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("IPV2");
    expect(master.IPV2).toBeInstanceOf(Date);
  });

  it("fills HB0_1_7d independently from HB0_lt24h", () => {
    const master: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      HB0_lt24h: new Date(2023, 0, 1),
    };
    const update: BalitaRow = {
      Nama: "A",
      "Tanggal Lahir": null,
      HB0_1_7d: new Date(2023, 0, 5),
    };
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("HB0_1_7d");
    expect(master.HB0_lt24h).toBeInstanceOf(Date);
    expect(master.HB0_1_7d).toBeInstanceOf(Date);
  });
});
