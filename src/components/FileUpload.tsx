import { useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  label: string;
  accept?: Accept;
  multiple?: boolean;
  onFileDrop: (files: File[]) => void;
  currentFile?: File | null;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
}

export default function FileUpload({
  label,
  accept,
  multiple = false,
  onFileDrop,
  currentFile,
  loading = false,
  error,
  disabled = false,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileDrop(acceptedFiles);
      }
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      multiple,
      disabled: disabled || loading,
    });

  const hasError = error || isDragReject;

  return (
    <div>
      <div
        {...getRootProps()}
        className={[
          "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
          isDragActive && !isDragReject
            ? "border-blue-400 bg-blue-50"
            : hasError
            ? "border-red-300 bg-red-50"
            : currentFile && !loading
            ? "border-green-300 bg-green-50"
            : disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">Membaca file...</p>
          </div>
        ) : currentFile && !error ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <p className="text-sm font-medium text-green-700 truncate max-w-xs">
              {currentFile.name}
            </p>
            <p className="text-xs text-gray-500">
              {(currentFile.size / 1024).toFixed(1)} KB · Klik untuk ganti
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {hasError ? (
              <AlertCircle className="w-8 h-8 text-red-400" />
            ) : (
              <UploadCloud
                className={`w-8 h-8 ${isDragActive ? "text-blue-500" : "text-gray-400"}`}
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? "Lepaskan file di sini" : label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {multiple
                  ? "Drag & drop atau klik untuk pilih beberapa file"
                  : "Drag & drop atau klik untuk pilih file"}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
