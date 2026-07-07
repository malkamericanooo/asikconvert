import { useState, useCallback, useRef } from "react";
import { saveAs } from "file-saver";
import FileUpload from "./components/FileUpload";
import FileList from "./components/FileList";
import FileInfo from "./components/FileInfo";
import ProgressBar from "./components/ProgressBar";
import ResultSummary from "./components/ResultSummary";
import ResultsTable from "./components/ResultsTable";
import DownloadButton from "./components/DownloadButton";
import {
  readMasterFile,
  processAllUpdateFiles,
  exportMasterToBlob,
} from "./utils/excelProcessor";
import type {
  MasterData,
  GlobalResult,
  ProcessProgress,
} from "./types";

type AppPhase =
  | "idle"
  | "masterLoaded"
  | "processing"
  | "done"
  | "error";

export default function App() {
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [masterLoading, setMasterLoading] = useState(false);

  const [updateFiles, setUpdateFiles] = useState<File[]>([]);

  const [phase, setPhase] = useState<AppPhase>("idle");
  const [progress, setProgress] = useState<ProcessProgress | null>(null);
  const [globalResult, setGlobalResult] = useState<GlobalResult | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const originalMasterFileRef = useRef<File | null>(null);

  const handleMasterFileDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setMasterFile(file);
    setMasterError(null);
    setMasterLoading(true);
    setPhase("idle");
    setGlobalResult(null);
    setDownloadBlob(null);
    originalMasterFileRef.current = file;
    try {
      const data = await readMasterFile(file);
      setMasterData(data);
      setPhase("masterLoaded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membaca file master.";
      setMasterError(msg);
      setMasterData(null);
    } finally {
      setMasterLoading(false);
    }
  }, []);

  const handleUpdateFilesDrop = useCallback((files: File[]) => {
    setUpdateFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleRemoveUpdateFile = useCallback((index: number) => {
    setUpdateFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = useCallback(async () => {
    if (!masterData || updateFiles.length === 0) return;
    setPhase("processing");
    setGlobalResult(null);
    setDownloadBlob(null);
    setErrorMessage(null);

    const masterCopy: MasterData = {
      fileName: masterData.fileName,
      sheets: new Map(
        Array.from(masterData.sheets.entries()).map(([k, v]) => [
          k,
          {
            ...v,
            rows: v.rows.map((r) => ({ ...r })),
          },
        ])
      ),
    };

    try {
      const result = await processAllUpdateFiles(
        masterCopy,
        updateFiles,
        (prog) => setProgress({ ...prog })
      );

      setGlobalResult(result);

      if (originalMasterFileRef.current) {
        const blob = await exportMasterToBlob(
          originalMasterFileRef.current,
          masterCopy
        );
        setDownloadBlob(blob);
      }

      setPhase("done");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Terjadi kesalahan saat memproses.";
      setErrorMessage(msg);
      setPhase("error");
    }
  }, [masterData, updateFiles]);

  const handleDownload = useCallback(() => {
    if (!downloadBlob || !masterFile) return;
    const baseName = masterFile.name.replace(/\.xlsx$/i, "");
    saveAs(downloadBlob, `${baseName}_UPDATED.xlsx`);
  }, [downloadBlob, masterFile]);

  const handleReset = useCallback(() => {
    setMasterFile(null);
    setMasterData(null);
    setMasterError(null);
    setUpdateFiles([]);
    setPhase("idle");
    setProgress(null);
    setGlobalResult(null);
    setDownloadBlob(null);
    setErrorMessage(null);
    originalMasterFileRef.current = null;
  }, []);

  const sheetNames = masterData
    ? Array.from(masterData.sheets.keys())
    : [];

  const canProcess =
    masterData !== null && updateFiles.length > 0 && phase !== "processing";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Imunisasi Balita Updater
          </h1>
          <p className="text-gray-500 text-sm">
            Update data master akumulasi imunisasi dari file ASIK bulanan
          </p>
        </header>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">
                1
              </span>
              Upload File Master
            </h2>
            <FileUpload
              label="File Master Akumulasi (.xlsx)"
              accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
              multiple={false}
              onFileDrop={handleMasterFileDrop}
              currentFile={masterFile}
              loading={masterLoading}
              error={masterError ?? undefined}
            />
            {masterData && (
              <FileInfo
                fileName={masterFile!.name}
                sheetNames={sheetNames}
                totalRows={Array.from(masterData.sheets.values()).reduce(
                  (s, sh) => s + sh.rows.length,
                  0
                )}
              />
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">
                2
              </span>
              Upload File Update ASIK
            </h2>
            <FileUpload
              label="File Update ASIK (.xlsx) — bisa banyak sekaligus"
              accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
              multiple={true}
              onFileDrop={handleUpdateFilesDrop}
              disabled={!masterData}
            />
            {updateFiles.length > 0 && (
              <FileList
                files={updateFiles}
                onRemove={handleRemoveUpdateFile}
                disabled={phase === "processing"}
              />
            )}
          </section>

          {(phase === "processing" || phase === "done" || phase === "error") && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center">
                  3
                </span>
                Progress
              </h2>
              {progress && (
                <ProgressBar progress={progress} totalFiles={updateFiles.length} />
              )}
              {phase === "error" && errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}
            </section>
          )}

          {globalResult && phase === "done" && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center justify-center">
                  4
                </span>
                Hasil Update
              </h2>
              <ResultSummary result={globalResult} />
              <ResultsTable fileResults={globalResult.fileResults} />
            </section>
          )}

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {phase === "processing" ? "Memproses..." : "Proses Update"}
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
            {downloadBlob && phase === "done" && (
              <DownloadButton onClick={handleDownload} fileName={masterFile?.name} />
            )}
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-400">
          Semua pemrosesan dilakukan di browser — data tidak dikirim ke server
        </footer>
      </div>
    </div>
  );
}
