import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, Save, X, Layers, FileText, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadZone, FileUploadProgress, FileUploadQueue } from "../components/FileUpload";
import { MappingWorkspace } from "../components/MappingWorkspace";
import { BatchSummaryTable } from "../components/BatchSummaryTable";
import {
  useGetExcelTemplates,
  useUploadExcelTemplate,
  useProcessInvoice,
  useGetVendorTemplate,
  useCreateVendorTemplate,
  useUpdateVendorTemplate,
  useGetBatchDetails,
  useProcessBatch,
  useArchiveBatch,
  useExportBatchData,
  useUpdateBatchInvoiceMapping,
  useGetBatchInvoices,
} from "../hooks/useQueries";
import {
  parseExcelHeaders,
  fileToUint8Array,
  createExcelFromMappings,
  createBatchExcelFromExportData,
  downloadBlob,
  isExcelFile,
  isInvoiceFile,
} from "../lib/excel-utils";
import { ExternalBlob } from "../backend";
import type { ExtractedFields, ProcessedInvoiceInput, BatchInvoice } from "../backend";

interface FieldMapping {
  columnName: string;
  fieldName: string;
  fieldValue: string;
}

interface FileQueueItem {
  file: File;
  status: "waiting" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
}

export function MapperPage() {
  // Mode state
  const [batchMode, setBatchMode] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<bigint | null>(null);

  // State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [currentVendorName, setCurrentVendorName] = useState<string | null>(null);

  // Upload states
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentInvoiceFile, setCurrentInvoiceFile] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Batch upload states
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [processingBatch, setProcessingBatch] = useState(false);

  // Dialog state
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [columnSetupDialogOpen, setColumnSetupDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [manualColumns, setManualColumns] = useState<string[]>([
    "Doc No",
    "Date",
    "Vendor Name",
    "GST/Tax ID",
    "Invoice Number",
    "Subtotal",
    "Total Amount",
  ]);

  // Queries
  const { data: excelTemplates = [], isLoading: loadingTemplates } = useGetExcelTemplates();
  const uploadExcelMutation = useUploadExcelTemplate();
  const processInvoiceMutation = useProcessInvoice();
  const createTemplateMutation = useCreateVendorTemplate();
  const updateTemplateMutation = useUpdateVendorTemplate();
  const processBatchMutation = useProcessBatch();
  const archiveBatchMutation = useArchiveBatch();
  const exportBatchMutation = useExportBatchData();
  const updateBatchInvoiceMutation = useUpdateBatchInvoiceMapping();

  // Get vendor template when vendor name is detected
  const { data: vendorTemplate } = useGetVendorTemplate(currentVendorName);

  // Get batch details if in batch mode
  const { data: batchDetails, refetch: refetchBatchDetails } = useGetBatchDetails(currentBatchId);
  const { data: batchInvoices = [], refetch: refetchBatchInvoices } = useGetBatchInvoices(currentBatchId);

  // Get selected template details
  const selectedTemplate = excelTemplates.find(
    (t) => t.id.toString() === selectedTemplateId,
  );

  // Load column headers when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      setColumnHeaders(selectedTemplate.columnHeaders);
    }
  }, [selectedTemplate]);

  // Check for batch mode from sessionStorage on mount
  useEffect(() => {
    const storedBatchId = sessionStorage.getItem("currentBatchId");
    const exportMode = sessionStorage.getItem("batchExportMode");
    
    if (storedBatchId) {
      const batchId = BigInt(storedBatchId);
      setCurrentBatchId(batchId);
      setBatchMode(true);
      
      // If export mode, trigger export
      if (exportMode === "true") {
        sessionStorage.removeItem("batchExportMode");
        // We'll handle export in a separate effect after data loads
      }
    }
  }, []);

  // Auto-apply vendor template if available
  const handleAutoMap = useCallback(() => {
    if (!vendorTemplate || !extractedFields) {
      toast.error("No vendor template available");
      return;
    }

    const newMappings: FieldMapping[] = [];

    vendorTemplate.fieldMappings.forEach(([fieldName, columnName]) => {
      const fieldValue = (extractedFields as any)[fieldName] || "";
      if (columnHeaders.includes(columnName)) {
        newMappings.push({ columnName, fieldName, fieldValue });
      }
    });

    setMappings(newMappings);
    toast.success("Auto-mapped fields from vendor template");
  }, [vendorTemplate, extractedFields, columnHeaders]);

  // Handle Excel template upload
  const handleExcelUpload = useCallback(
    async (file: File) => {
      if (!isExcelFile(file)) {
        toast.error("Please upload an Excel file (.xlsx)");
        return;
      }

      setUploadingExcel(true);

      try {
        // For MVP: Use default headers. In production, parse the Excel file.
        const headers = await parseExcelHeaders(file);

        // Convert to bytes
        const bytes = await fileToUint8Array(file);
        const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (percentage) => {
            setUploadProgress(percentage);
          },
        );

        // Upload to backend
        await uploadExcelMutation.mutateAsync({
          blob,
          filename: file.name,
          columnHeaders: headers,
        });

        setColumnHeaders(headers);
        toast.success("Excel template uploaded successfully");
        toast.info("Column headers detected. You can customize them if needed.");
      } catch (error) {
        console.error("Excel upload error:", error);
        toast.error("Failed to upload Excel template");
      } finally {
        setUploadingExcel(false);
        setUploadProgress(0);
      }
    },
    [uploadExcelMutation],
  );

  // Handle manual column setup
  const handleManualColumnSetup = useCallback(async () => {
    if (manualColumns.length === 0) {
      toast.error("Please add at least one column");
      return;
    }

    try {
      // Create a dummy Excel template with just column headers
      const dummyBytes = new Uint8Array([]);
      const blob = ExternalBlob.fromBytes(dummyBytes);

      await uploadExcelMutation.mutateAsync({
        blob,
        filename: `manual_template_${Date.now()}.xlsx`,
        columnHeaders: manualColumns,
      });

      setColumnHeaders(manualColumns);
      setColumnSetupDialogOpen(false);
      toast.success("Excel columns configured successfully");
    } catch (error) {
      console.error("Column setup error:", error);
      toast.error("Failed to configure columns");
    }
  }, [manualColumns, uploadExcelMutation]);

  // Handle single invoice upload
  const handleInvoiceUpload = useCallback(
    async (file: File) => {
      if (!isInvoiceFile(file)) {
        toast.error("Please upload a PDF, PNG, or JPG file");
        return;
      }

      setUploadingInvoice(true);
      setCurrentInvoiceFile(file.name);
      setProcessingError(null);
      setLastFailedFile(null);

      try {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setInvoicePreviewUrl(previewUrl);

        // Convert to bytes
        const bytes = await fileToUint8Array(file);
        const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (percentage) => {
            setUploadProgress(percentage);
          },
        );

        // Process invoice
        const result = await processInvoiceMutation.mutateAsync({
          blob,
          filename: file.name,
          vendorName: "",
        });

        if (result.status.__kind__ === "success" && result.extractedFields) {
          setExtractedFields(result.extractedFields);
          setCurrentVendorName(result.vendorName || null);
          toast.success("Invoice processed successfully");
        } else {
          const error =
            result.status.__kind__ === "fail" ? result.status.fail : "Unknown error";
          
          setProcessingError(error);
          setLastFailedFile(file);
          
          // Check if it's an API credentials error
          if (error.toLowerCase().includes("api") || error.toLowerCase().includes("credentials")) {
            toast.error("Analysis failed. Please check your API key in Settings.", {
              description: error,
              action: {
                label: "Go to Settings",
                onClick: () => {
                  window.location.href = "/settings";
                },
              },
            });
          } else {
            toast.error(`Failed to process invoice: ${error}`);
          }
        }
      } catch (error) {
        console.error("Invoice upload error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setProcessingError(errorMessage);
        setLastFailedFile(file);
        toast.error("Failed to upload invoice", {
          description: errorMessage,
        });
      } finally {
        setUploadingInvoice(false);
        setUploadProgress(0);
        setCurrentInvoiceFile(null);
      }
    },
    [processInvoiceMutation],
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    if (lastFailedFile) {
      handleInvoiceUpload(lastFailedFile);
    }
  }, [lastFailedFile, handleInvoiceUpload]);

  // Handle batch file selection
  const handleBatchFilesSelect = useCallback((files: File[]) => {
    const items: FileQueueItem[] = files.map((file) => ({
      file,
      status: "waiting",
      progress: 0,
    }));
    setFileQueue(items);
    toast.success(`${files.length} files added to queue`);
  }, []);

  // Handle batch processing
  const handleProcessBatch = useCallback(async () => {
    if (!currentBatchId) {
      toast.error("No batch ID available");
      return;
    }

    if (fileQueue.length === 0) {
      toast.error("No files to process");
      return;
    }

    setProcessingBatch(true);

    try {
      // Convert files to ProcessedInvoiceInput
      const invoiceInputs: ProcessedInvoiceInput[] = [];

      // Process files sequentially with progress updates
      for (let i = 0; i < fileQueue.length; i++) {
        const item = fileQueue[i];

        // Update status to uploading
        setFileQueue((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "uploading" as const } : f,
          ),
        );

        try {
          const bytes = await fileToUint8Array(item.file);
          const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
            (percentage) => {
              setFileQueue((prev) =>
                prev.map((f, idx) =>
                  idx === i ? { ...f, progress: percentage } : f,
                ),
              );
            },
          );

          invoiceInputs.push({
            blob,
            filename: item.file.name,
          });

          // Update to processing
          setFileQueue((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "processing" as const, progress: 100 } : f,
            ),
          );
        } catch (error) {
          console.error(`Failed to process file ${item.file.name}:`, error);
          setFileQueue((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: "error" as const, error: "Upload failed" }
                : f,
            ),
          );
        }
      }

      // Process batch on backend
      const results = await processBatchMutation.mutateAsync({
        batchId: currentBatchId,
        invoices: invoiceInputs,
      });

      // Update queue with results
      if (results) {
        setFileQueue((prev) =>
          prev.map((item, idx) => ({
            ...item,
            status: "success" as const,
          })),
        );
        toast.success(`Batch processed: ${results.length} invoices`);
      }

      // Refresh batch details
      refetchBatchDetails();
      refetchBatchInvoices();
    } catch (error) {
      console.error("Batch processing error:", error);
      toast.error("Failed to process batch");
    } finally {
      setProcessingBatch(false);
    }
  }, [currentBatchId, fileQueue, processBatchMutation, refetchBatchDetails, refetchBatchInvoices]);

  // Handle mapping creation
  const handleMappingCreate = useCallback(
    (columnName: string, fieldName: string) => {
      if (!extractedFields) return;

      const fieldValue = (extractedFields as any)[fieldName] || "";

      setMappings((prev) => {
        const filtered = prev.filter((m) => m.columnName !== columnName);
        return [...filtered, { columnName, fieldName, fieldValue }];
      });

      toast.success(`Mapped "${fieldName}" to "${columnName}"`);
    },
    [extractedFields],
  );

  // Handle mapping removal
  const handleMappingRemove = useCallback((columnName: string) => {
    setMappings((prev) => prev.filter((m) => m.columnName !== columnName));
    toast.info("Mapping removed");
  }, []);

  // Handle save template
  const handleSaveTemplate = useCallback(async () => {
    if (!currentVendorName) {
      toast.error("No vendor name detected");
      return;
    }

    if (mappings.length === 0) {
      toast.error("No mappings to save");
      return;
    }

    try {
      const fieldMappings: Array<[string, string]> = mappings.map((m) => [
        m.fieldName,
        m.columnName,
      ]);

      if (vendorTemplate) {
        await updateTemplateMutation.mutateAsync({
          vendorName: currentVendorName,
          fieldMappings,
        });
        toast.success("Vendor template updated");
      } else {
        await createTemplateMutation.mutateAsync({
          vendorName: currentVendorName,
          fieldMappings,
        });
        toast.success("Vendor template saved");
      }

      setSaveTemplateDialogOpen(false);
    } catch (error) {
      console.error("Save template error:", error);
      toast.error("Failed to save template");
    }
  }, [
    currentVendorName,
    mappings,
    vendorTemplate,
    createTemplateMutation,
    updateTemplateMutation,
  ]);

  // Handle export (single invoice)
  const handleExport = useCallback(() => {
    if (mappings.length === 0) {
      toast.error("No mappings to export");
      return;
    }

    if (!extractedFields) {
      toast.error("No invoice data to export");
      return;
    }

    try {
      const mappingMap = new Map<string, string>();
      mappings.forEach((m) => {
        mappingMap.set(m.columnName, m.fieldValue);
      });

      const csvBlob = createExcelFromMappings(columnHeaders, mappingMap);
      const filename = `invoice_export_${Date.now()}.csv`;
      downloadBlob(csvBlob, filename);

      toast.success("CSV file downloaded (Excel-compatible)");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  }, [mappings, extractedFields, columnHeaders]);

  // Handle batch export
  const handleBatchExport = useCallback(async () => {
    if (!currentBatchId) {
      toast.error("No batch ID available");
      return;
    }

    if (columnHeaders.length === 0) {
      toast.error("No Excel template configured");
      return;
    }

    try {
      const exportData = await exportBatchMutation.mutateAsync({
        batchId: currentBatchId,
        columnHeaders,
      });

      if (!exportData) {
        toast.error("No data to export");
        return;
      }

      const csvBlob = createBatchExcelFromExportData(exportData, columnHeaders);
      downloadBlob(csvBlob, `batch_${currentBatchId}_${Date.now()}.csv`);

      // Archive batch after export
      await archiveBatchMutation.mutateAsync(currentBatchId);
      toast.success("Batch exported and archived");

      // Clear batch mode and navigate back
      sessionStorage.removeItem("currentBatchId");
      setCurrentBatchId(null);
      setBatchMode(false);
      setFileQueue([]);
    } catch (error) {
      console.error("Batch export error:", error);
      toast.error("Failed to export batch");
    }
  }, [currentBatchId, columnHeaders, exportBatchMutation, archiveBatchMutation]);

  // Handle batch invoice mapping update
  const handleUpdateBatchInvoiceMapping = useCallback(
    async (invoiceId: bigint, fieldMappings: ExtractedFields) => {
      if (!currentBatchId) return;

      await updateBatchInvoiceMutation.mutateAsync({
        batchId: currentBatchId,
        invoiceId,
        fieldMappings,
      });
    },
    [currentBatchId, updateBatchInvoiceMutation],
  );

  // Handle mode toggle
  const handleModeChange = useCallback((mode: "single" | "batch") => {
    if (mode === "batch") {
      setBatchMode(true);
      // Clear single mode state
      setExtractedFields(null);
      setInvoicePreviewUrl(null);
      setMappings([]);
      setCurrentVendorName(null);
    } else {
      setBatchMode(false);
      // Clear batch mode state
      setCurrentBatchId(null);
      setFileQueue([]);
      sessionStorage.removeItem("currentBatchId");
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="border-b bg-card">
        <div className="container py-4 space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <Tabs
              value={batchMode ? "batch" : "single"}
              onValueChange={(v) => handleModeChange(v as "single" | "batch")}
            >
              <TabsList>
                <TabsTrigger value="single" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Single Invoice
                </TabsTrigger>
                <TabsTrigger value="batch" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Batch Processing
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {batchMode && currentBatchId && (
              <Badge variant="outline" className="gap-2">
                <Layers className="h-3 w-3" />
                Batch #{currentBatchId.toString()}
              </Badge>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Upload buttons */}
            {!batchMode ? (
              <div className="flex items-center gap-3">
                <label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInvoiceUpload(file);
                    }}
                    className="hidden"
                  />
                  <Button variant="outline" className="gap-2" asChild>
                    <span>
                      <Upload className="h-4 w-4" />
                      Upload Invoice
                    </span>
                  </Button>
                </label>

                <label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelUpload(file);
                    }}
                    className="hidden"
                  />
                  <Button variant="outline" className="gap-2" asChild>
                    <span>
                      <FileSpreadsheet className="h-4 w-4" />
                      Upload Template
                    </span>
                  </Button>
                </label>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColumnSetupDialogOpen(true)}
                  className="gap-2"
                >
                  Setup Columns
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {fileQueue.length === 0 ? (
                  <label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) handleBatchFilesSelect(Array.from(files));
                      }}
                      className="hidden"
                    />
                    <Button variant="outline" className="gap-2" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                        Upload Invoices (max 50)
                      </span>
                    </Button>
                  </label>
                ) : (
                  <Button
                    onClick={handleProcessBatch}
                    disabled={processingBatch}
                    className="gap-2"
                  >
                    Process {fileQueue.length} Invoices
                  </Button>
                )}
              </div>
            )}

            {/* Center: Template selector */}
            <Select value={selectedTemplateId || ""} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Excel template" />
              </SelectTrigger>
              <SelectContent>
                {excelTemplates.map((template) => (
                  <SelectItem key={template.id.toString()} value={template.id.toString()}>
                    {template.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {!batchMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveTemplateDialogOpen(true)}
                  disabled={!currentVendorName || mappings.length === 0}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
              )}

              <Button
                size="sm"
                onClick={batchMode ? handleBatchExport : handleExport}
                disabled={batchMode ? !batchInvoices.length : mappings.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {(uploadingInvoice || uploadingExcel) && currentInvoiceFile && !batchMode && (
        <div className="container py-3">
          <FileUploadProgress
            filename={currentInvoiceFile}
            progress={uploadProgress}
            status={uploadingInvoice ? "uploading" : "processing"}
          />
        </div>
      )}

      {/* Processing Error Alert */}
      {processingError && !batchMode && (
        <div className="container py-3">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <X className="h-4 w-4 text-red-600" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400 font-medium">
                  Invoice processing failed
                </p>
                <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                  {processingError}
                </p>
                {processingError.toLowerCase().includes("api") && (
                  <p className="text-red-600 dark:text-red-500 text-xs mt-2">
                    Please check your Affinda API credentials in Settings.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {processingError.toLowerCase().includes("api") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (window.location.href = "/settings")}
                    className="gap-2 whitespace-nowrap"
                  >
                    <SettingsIcon className="h-3.5 w-3.5" />
                    Go to Settings
                  </Button>
                )}
                {lastFailedFile && (
                  <Button
                    size="sm"
                    onClick={handleRetry}
                    className="gap-2 whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Batch Upload Queue */}
      {batchMode && fileQueue.length > 0 && (
        <div className="container py-3">
          <FileUploadQueue files={fileQueue} />
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        {batchMode ? (
          <div className="container py-6">
            {batchInvoices.length > 0 ? (
              <BatchSummaryTable
                batchId={currentBatchId!}
                invoices={batchInvoices}
                columnHeaders={columnHeaders}
                onUpdateMapping={handleUpdateBatchInvoiceMapping}
                onRefresh={() => {
                  refetchBatchDetails();
                  refetchBatchInvoices();
                }}
              />
            ) : (
              <Card className="p-12 text-center">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Upload invoices to start</h3>
                <p className="text-sm text-muted-foreground">
                  You can upload up to 50 invoices at once for batch processing
                </p>
              </Card>
            )}
          </div>
        ) : (
          <MappingWorkspace
            columnHeaders={columnHeaders}
            extractedFields={extractedFields}
            invoicePreviewUrl={invoicePreviewUrl}
            mappings={mappings}
            onMappingCreate={handleMappingCreate}
            onMappingRemove={handleMappingRemove}
            onAutoMap={handleAutoMap}
            hasVendorTemplate={!!vendorTemplate}
          />
        )}
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {vendorTemplate ? "Update" : "Save"} Vendor Template
            </DialogTitle>
            <DialogDescription>
              {vendorTemplate
                ? `Update the mapping template for "${currentVendorName}"`
                : `Save this mapping as a template for future invoices from "${currentVendorName}"`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {mappings.length} field mappings will be saved
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {vendorTemplate ? "Update" : "Save"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Setup Dialog */}
      <Dialog open={columnSetupDialogOpen} onOpenChange={setColumnSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup Excel Columns</DialogTitle>
            <DialogDescription>
              Define the column structure for your Excel export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {manualColumns.map((column, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={column}
                  onChange={(e) => {
                    const updated = [...manualColumns];
                    updated[index] = e.target.value;
                    setManualColumns(updated);
                  }}
                  placeholder="Column name"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualColumns((prev) => prev.filter((_, i) => i !== index));
                  }}
                  className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualColumns([...manualColumns, ""])}
              className="w-full"
            >
              Add Column
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setColumnSetupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleManualColumnSetup}>
              Save Columns
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
