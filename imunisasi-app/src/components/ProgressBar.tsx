import { ProcessProgress } from "../types";
import { Loader2, CheckCircle2 } from "lucide-react";

interface ProgressBarProps {
  progress: ProcessProgress;
  totalFiles: number;
}

export default function ProgressBar({ progress, totalFiles }: ProgressBarProps) {
  const filePercent =
    totalFiles > 0
      ? Math.round(((progress.currentFile - 1) / totalFiles) * 100)
      : 0;

  const rowPercent =
    progress.totalRows > 0
      ? Math.round((progress.currentRow / progress.totalRows) * 100)
      : 0;

  const overallPercent =
    totalFiles > 0
      ? Math.round(
          ((progress.currentFile - 1 + (progress.phase === "done" ? 1 : rowPercent / 100)) /
            totalFiles) *
            100
        )
      : 0;

  const isDone = progress.phase === "done";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium text-gray-700 truncate">
              {isDone
                ? "Selesai diproses"
                : progress.phase === "reading"
                ? `Membaca file ${progress.currentFile}/${totalFiles}...`
                : `Memproses file ${progress.currentFile}/${totalFiles}`}
            </p>
            <span className="text-sm font-bold text-blue-600 ml-2 flex-shrink-0">
              {overallPercent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {!isDone && progress.currentFileName && (
        <div className="pl-8 space-y-1">
          <p className="text-xs text-gray-500 truncate">
            <span className="font-medium">File:</span> {progress.currentFileName}
          </p>
          {progress.currentSheet && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">Sheet:</span> {progress.currentSheet}
            </p>
          )}
          {progress.totalRows > 0 && (
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <p className="text-xs text-gray-400">
                  Baris {progress.currentRow}/{progress.totalRows}
                </p>
                <span className="text-xs text-gray-400">{rowPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-indigo-400 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${rowPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!isDone && (
        <p className="text-xs text-center text-gray-400">
          File {progress.currentFile} dari {totalFiles}
          {filePercent > 0 && ` — ${filePercent}% file selesai`}
        </p>
      )}
    </div>
  );
}
