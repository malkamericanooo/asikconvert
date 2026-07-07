import { GlobalResult } from "../types";
import {
  CheckCircle2,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface ResultSummaryProps {
  result: GlobalResult;
}

export default function ResultSummary({ result }: ResultSummaryProps) {
  const [expandedFile, setExpandedFile] = useState<number | null>(null);
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {result.filesProcessed}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">File Diproses</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1">
            <UserPlus className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700">
            {result.totalAdded.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Baris Baru</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <div className="flex justify-center mb-1">
            <RefreshCw className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-700">
            {result.totalUpdated.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Baris Diupdate</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Detail per File
        </p>
        <div className="space-y-2">
          {result.fileResults.map((fr, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedFile(expandedFile === idx ? null : idx)
                }
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                {fr.error ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                  {fr.fileName}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  +{fr.totalAdded} baru · ~{fr.totalUpdated} update
                </span>
                {expandedFile === idx ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {expandedFile === idx && (
                <div className="px-4 py-3 border-t border-gray-100 bg-white space-y-3">
                  {fr.error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
                      Error: {fr.error}
                    </p>
                  )}
                  {fr.sheetsProcessed.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Per Sheet
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left font-semibold pb-1">Sheet</th>
                            <th className="text-right font-semibold pb-1">Baru</th>
                            <th className="text-right font-semibold pb-1">Update</th>
                            <th className="text-right font-semibold pb-1">Skip</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fr.sheetsProcessed.map((s) => (
                            <tr key={s.sheetName} className="border-t border-gray-100">
                              <td className="py-1 text-gray-700 font-medium">
                                {s.sheetName}
                              </td>
                              <td className="py-1 text-right text-green-600">
                                +{s.addedCount}
                              </td>
                              <td className="py-1 text-right text-orange-600">
                                ~{s.updatedCount}
                              </td>
                              <td className="py-1 text-right text-gray-400">
                                {s.skippedCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {fr.warnings && fr.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-1">
                        Peringatan ({fr.warnings.length})
                      </p>
                      <ul className="space-y-1">
                        {fr.warnings.slice(0, 5).map((w, i) => (
                          <li
                            key={i}
                            className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1"
                          >
                            {w}
                          </li>
                        ))}
                        {fr.warnings.length > 5 && (
                          <li className="text-xs text-gray-400">
                            +{fr.warnings.length - 5} peringatan lainnya
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div>
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="flex items-center gap-2 text-xs font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {result.warnings.length} peringatan global
            {showWarnings ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {showWarnings && (
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {result.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 border border-yellow-100"
                >
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
