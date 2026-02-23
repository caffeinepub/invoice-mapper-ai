import { useCallback, useState } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  accept: string;
  maxSizeMB?: number;
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUploadZone({
  accept,
  maxSizeMB = 10,
  onFileSelect,
  onFilesSelect,
  multiple = false,
  maxFiles = 50,
  label,
  description,
  disabled = false,
  className,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (files: FileList | File[]) => {
      setError(null);

      const fileArray = Array.from(files);

      // Check file count for multiple mode
      if (multiple && fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      const maxBytes = maxSizeMB * 1024 * 1024;
      const acceptedTypes = accept.split(",").map((t) => t.trim());

      for (const file of fileArray) {
        // Check file size
        if (file.size > maxBytes) {
          setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
          return;
        }

        // Check file type
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const isAccepted =
          acceptedTypes.includes(file.type) ||
          acceptedTypes.some((type) =>
            type.startsWith(".") ? type === fileExtension : false,
          );

        if (!isAccepted) {
          setError(`File "${file.name}" type not supported. Accepted: ${accept}`);
          return;
        }
      }

      // Call appropriate callback
      if (multiple && onFilesSelect) {
        onFilesSelect(fileArray);
      } else if (!multiple && onFileSelect && fileArray.length > 0) {
        onFileSelect(fileArray[0]);
      }
    },
    [accept, maxSizeMB, multiple, maxFiles, onFileSelect, onFilesSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        validateAndSelect(files);
      }
    },
    [disabled, validateAndSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        validateAndSelect(files);
      }
    },
    [validateAndSelect],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Card
        className={cn(
          "relative border-2 border-dashed transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-primary/50 cursor-pointer",
          error && "border-destructive",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <label
          className={cn(
            "flex flex-col items-center justify-center p-8 gap-3",
            !disabled && "cursor-pointer",
          )}
        >
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            disabled={disabled}
            className="hidden"
          />

          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{label}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Drag & drop or click to browse
          </p>
        </label>
      </Card>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

interface FileUploadProgressProps {
  filename: string;
  progress: number;
  status: "uploading" | "processing" | "success" | "error";
  error?: string;
  onCancel?: () => void;
}

export function FileUploadProgress({
  filename,
  progress,
  status,
  error,
  onCancel,
}: FileUploadProgressProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate max-w-[200px]">
              {filename}
            </p>

            {status === "uploading" && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {status === "uploading" && (
            <>
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-muted-foreground">
                Uploading... {Math.round(progress)}%
              </p>
            </>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing invoice...
            </div>
          )}

          {status === "success" && (
            <p className="text-xs text-success">Upload complete!</p>
          )}

          {status === "error" && error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface FileQueueItem {
  file: File;
  status: "waiting" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileUploadQueueProps {
  files: FileQueueItem[];
  onCancel?: (index: number) => void;
}

export function FileUploadQueue({ files, onCancel }: FileUploadQueueProps) {
  const processed = files.filter(
    (f) => f.status === "success" || f.status === "error",
  ).length;
  const total = files.length;

  return (
    <div className="space-y-3">
      {/* Overall Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">
            Processing {processed}/{total} invoices
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round((processed / total) * 100)}%
          </p>
        </div>
        <Progress value={(processed / total) * 100} className="h-2" />
      </Card>

      {/* Individual File Progress */}
      <div className="space-y-2 max-h-[400px] overflow-auto">
        {files.map((fileItem, index) => {
          // Map "waiting" to "uploading" for display
          const displayStatus =
            fileItem.status === "waiting" ? "uploading" : fileItem.status;
          
          return (
            <FileUploadProgress
              key={index}
              filename={fileItem.file.name}
              progress={fileItem.progress}
              status={displayStatus}
              error={fileItem.error}
              onCancel={
                onCancel && fileItem.status === "uploading"
                  ? () => onCancel(index)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
