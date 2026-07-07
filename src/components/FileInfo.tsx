import { Layers, Users } from "lucide-react";

interface FileInfoProps {
  fileName: string;
  sheetNames: string[];
  totalRows: number;
}

export default function FileInfo({
  fileName,
  sheetNames,
  totalRows,
}: FileInfoProps) {
  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
        Info File Master
      </p>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Sheet (Kelurahan)</p>
            <p className="text-sm font-semibold text-gray-800">
              {sheetNames.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Total Data Balita</p>
            <p className="text-sm font-semibold text-gray-800">
              {totalRows.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Daftar Sheet:</p>
        <div className="flex flex-wrap gap-1.5">
          {sheetNames.map((name) => (
            <span
              key={name}
              className="inline-block px-2 py-0.5 bg-white border border-blue-200 text-blue-700 text-xs rounded-md font-medium"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 truncate">
        📄 {fileName}
      </p>
    </div>
  );
}
