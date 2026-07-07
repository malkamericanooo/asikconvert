import { describe, it, expect } from "vitest";
import {
  matchBalita,
  applyVaccineUpdateDirect,
  createNewBalitaRow,
} from "../../src/utils/imunisasiLogic";
import { BalitaRow } from "../../src/types";

const makeRow = (overrides: Partial<BalitaRow> = {}): BalitaRow => ({
  NIK: "3201234567890001",
  Nama: "Budi Santoso",
  JK: "L",
  "Tanggal Lahir": new Date(2023, 0, 15),
  Alamat: "Kelurahan A",
  ...overrides,
});

describe("matchBalita", () => {
  it("finds by name + birth date match", () => {
    const masterRows: BalitaRow[] = [makeRow()];
    const updateRow = makeRow();
    const result = matchBalita(masterRows, updateRow);
    expect(result.found).toBe(true);
    expect(result.rowIndex).toBe(0);
  });

  it("returns not found when name differs", () => {
    const masterRows: BalitaRow[] = [makeRow({ Nama: "Siti Aminah" })];
    const updateRow = makeRow({ Nama: "Budi Santoso" });
    const result = matchBalita(masterRows, updateRow);
    expect(result.found).toBe(false);
  });

  it("returns not found when birth date differs", () => {
    const masterRows: BalitaRow[] = [
      makeRow({ "Tanggal Lahir": new Date(2023, 5, 1) }),
    ];
    const updateRow = makeRow({ "Tanggal Lahir": new Date(2023, 0, 15) });
    const result = matchBalita(masterRows, updateRow);
    expect(result.found).toBe(false);
  });

  it("matches multiple entries and returns first match", () => {
    const masterRows: BalitaRow[] = [
      makeRow({ Nama: "Ana" }),
      makeRow({ Nama: "Budi Santoso" }),
      makeRow({ Nama: "Budi Santoso" }),
    ];
    const updateRow = makeRow({ Nama: "Budi Santoso" });
    const result = matchBalita(masterRows, updateRow);
    expect(result.found).toBe(true);
    expect(result.rowIndex).toBe(1);
  });
});

describe("applyVaccineUpdateDirect", () => {
  it("fills first empty Polio slot when update has Polio1", () => {
    const master = makeRow();
    const update = makeRow({ Polio1: new Date(2023, 2, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("Polio1");
    expect(master.Polio1).toBeInstanceOf(Date);
  });

  it("skips already-filled slot — does NOT advance series", () => {
    const master = makeRow({ Polio1: new Date(2023, 1, 1) });
    const update = makeRow({ Polio1: new Date(2023, 2, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).not.toContain("Polio1");
    expect(result.updatedColumns).not.toContain("Polio2");
    expect(result.skippedColumns.length).toBeGreaterThan(0);
    expect(master.Polio1).toEqual(new Date(2023, 1, 1));
  });

  it("skips when all Polio slots are full", () => {
    const master = makeRow({
      Polio1: new Date(2023, 1, 1),
      Polio2: new Date(2023, 2, 1),
      Polio3: new Date(2023, 3, 1),
      Polio4: new Date(2023, 4, 1),
    });
    const update = makeRow({ Polio1: new Date(2023, 5, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toHaveLength(0);
    expect(result.skippedColumns.length).toBeGreaterThan(0);
  });

  it("fills multiple vaccine columns at once", () => {
    const master = makeRow();
    const update = makeRow({
      BCG: new Date(2023, 1, 15),
      DPT1: new Date(2023, 3, 10),
    });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("BCG");
    expect(result.updatedColumns).toContain("DPT1");
  });

  it("does not overwrite existing data", () => {
    const existingDate = new Date(2023, 1, 1);
    const master = makeRow({ BCG: existingDate });
    const update = makeRow({ BCG: new Date(2023, 3, 1) });
    applyVaccineUpdateDirect(master, update);
    expect(master.BCG).toEqual(existingDate);
  });

  it("fills DPT3 even when DPT1 and DPT2 are already filled", () => {
    const master = makeRow({
      DPT1: new Date(2023, 2, 1),
      DPT2: new Date(2023, 4, 1),
    });
    const update = makeRow({ DPT3: new Date(2023, 6, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("DPT3");
    expect(master.DPT3).toBeInstanceOf(Date);
  });

  it("fills Rota3 correctly", () => {
    const master = makeRow({ Rota1: new Date(2023, 2, 1), Rota2: new Date(2023, 4, 1) });
    const update = makeRow({ Rota3: new Date(2023, 6, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("Rota3");
    expect(master.Rota3).toBeInstanceOf(Date);
  });

  it("fills IPV2 correctly", () => {
    const master = makeRow({ IPV1: new Date(2023, 5, 1) });
    const update = makeRow({ IPV2: new Date(2023, 9, 1) });
    const result = applyVaccineUpdateDirect(master, update);
    expect(result.updatedColumns).toContain("IPV2");
    expect(master.IPV2).toBeInstanceOf(Date);
  });
});

describe("createNewBalitaRow", () => {
  it("copies identity and vaccine data from update", () => {
    const updateRow = makeRow({
      Polio1: new Date(2023, 2, 1),
      BCG: new Date(2023, 1, 10),
    });
    const newRow = createNewBalitaRow(updateRow);
    expect(newRow.Nama).toBe("Budi Santoso");
    expect(newRow.Polio1).toBeInstanceOf(Date);
    expect(newRow.BCG).toBeInstanceOf(Date);
    expect(newRow.NIK).toBe("3201234567890001");
  });

  it("sets unfilled vaccine columns to null", () => {
    const updateRow = makeRow({ BCG: new Date(2023, 1, 10) });
    const newRow = createNewBalitaRow(updateRow);
    expect(newRow.Polio1).toBeNull();
    expect(newRow.DPT1).toBeNull();
    expect(newRow.Rota3).toBeNull();
    expect(newRow.IPV2).toBeNull();
  });
});
