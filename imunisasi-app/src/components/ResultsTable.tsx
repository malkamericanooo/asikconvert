import { useState } from "react";
import { FileResult, RowDetail } from "../types";

interface Props {
  fileResults: FileResult[];
}

export default function ResultsTable({ fileResults }: Props) {
  const [expandedFile, setExpandedFile] = useState<string | null>(
    fileResults.length === 1 ? fileResults[0].fileName : null
  );

  const allDetails: RowDetail[] = fileResults.flatMap((fr) =>
    fr.sheetsProcessed.flatMap((s) => s.rowDetails)
  );

  if (allDetails.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Detail Perubahan ({allDetails.length} baris)
      </h2>

      <div className="space-y-3">
        {fileResults.map((fr) => {
          const fileDetails = fr.sheetsProcessed.flatMap((s) => s.rowDetails);
          if (fileDetails.length === 0) return null;
          const isOpen = expandedFile === fr.fileName;

          return (
            <div
              key={fr.fileName}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                onClick={() =>
                  setExpandedFile(isOpen ? null : fr.fileName)
                }
              >
                <span className="text-sm font-medium text-gray-700 truncate">
                  {fr.fileName}
                </span>
                <span className="flex items-center gap-3 flex-shrink-0 ml-2 text-xs text-gray-500">
                  {fr.totalAdded > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      +{fr.totalAdded} baru
                    </span>
                  )}
                  {fr.totalUpdated > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      ~{fr.totalUpdated} update
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-gray-600 font-medium w-4">#</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Nama</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">JK</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Sheet</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Status</th>
                        <th className="px-3 py-2 text-left text-gray-600 font-medium">Kolom Diisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileDetails.map((row, i) => (
                        <tr
                          key={i}
                          className={
                            i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }
                        >
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-800">
                            {row.nama}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">
                            {row.jk ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">
                            <span className="flex items-center gap-1">
                              {row.sheetName}
                              {row.sheetName.toLowerCase() === "kejar" && (
                                <span className="bg-pink-100 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded text-xs font-semibold tracking-wide">
                                  KEJAR
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            {row.action === "added" ? (
                              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                <span>+</span> Baru
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                <span>~</span> Update
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {row.updatedColumns.map((col) => (
                                <span
                                  key={col}
                                  className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs"
                                >
                                  {col}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
