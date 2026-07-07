import { Download } from "lucide-react";

interface DownloadButtonProps {
  onClick: () => void;
  fileName?: string | null;
}

export default function DownloadButton({ onClick, fileName }: DownloadButtonProps) {
  const baseName = fileName?.replace(/\.xlsx$/i, "") ?? "MASTER";
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl shadow hover:bg-green-700 active:bg-green-800 transition-colors"
    >
      <Download className="w-4 h-4" />
      Download {baseName}_UPDATED.xlsx
    </button>
  );
}
