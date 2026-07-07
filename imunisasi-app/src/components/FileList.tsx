import { FileSpreadsheet, X } from "lucide-react";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export default function FileList({
  files,
  onRemove,
  disabled = false,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {files.length} file update terpilih
      </p>
      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {files.map((file, idx) => (
          <li
            key={`${file.name}-${idx}`}
            className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {!disabled && (
              <button
                onClick={() => onRemove(idx)}
                className="p-1 hover:bg-red-100 rounded-md transition-colors group flex-shrink-0"
                title="Hapus file ini"
              >
                <X className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
