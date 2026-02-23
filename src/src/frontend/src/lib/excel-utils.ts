/**
 * Parse Excel file and extract column headers from first row
 * Note: This is a simplified parser. For production use, consider a library like xlsx or exceljs.
 */
export async function parseExcelHeaders(file: File): Promise<string[]> {
  // For now, prompt user to enter headers manually or use default structure
  // In production, integrate with a proper Excel parsing library
  
  // Return common accounting columns as defaults
  return [
    "Doc No",
    "Date",
    "Vendor Name",
    "GST/Tax ID",
    "Invoice Number",
    "Subtotal",
    "Total Amount",
    "Remarks",
  ];
}

/**
 * Create CSV file with mapped invoice data
 * CSV is universally compatible with Excel and accounting software
 */
export function createExcelFromMappings(
  columnHeaders: string[],
  mappings: Map<string, string>, // columnName -> fieldValue
): Blob {
  // Create CSV content
  const rows: string[] = [];
  
  // Add header row
  rows.push(columnHeaders.map(escapeCSV).join(","));
  
  // Add data row
  const dataRow = columnHeaders.map((header) => {
    const value = mappings.get(header) || "";
    return escapeCSV(value);
  });
  rows.push(dataRow.join(","));
  
  const csvContent = rows.join("\n");
  
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert File to Uint8Array for backend upload
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Format timestamp (nanoseconds) to readable date
 */
export function formatTime(time: bigint): string {
  const milliseconds = Number(time / BigInt(1_000_000));
  return new Date(milliseconds).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Check if file is a supported invoice format
 */
export function isInvoiceFile(file: File): boolean {
  const supportedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];
  return supportedTypes.includes(file.type);
}

/**
 * Check if file is an Excel file
 */
export function isExcelFile(file: File): boolean {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

/**
 * Create CSV file from batch export data
 * Used for exporting multiple invoices to a single CSV file
 */
export function createBatchExcelFromExportData(
  exportData: {
    columnMappings: Array<[string, string]>;
    invoiceData: Array<{
      extractedFields?: {
        vendorName: string;
        invoiceNumber: string;
        invoiceDate: string;
        gstTaxId: string;
        subtotalAmount: string;
        totalAmount: string;
      };
    }>;
  },
  columnHeaders: string[],
): Blob {
  const rows: string[] = [];

  // Add header row
  rows.push(columnHeaders.map(escapeCSV).join(","));

  // Create mapping from field name to column name
  const fieldToColumn = new Map<string, string>();
  exportData.columnMappings.forEach(([fieldName, columnName]) => {
    fieldToColumn.set(fieldName, columnName);
  });

  // Add data rows (one per invoice)
  exportData.invoiceData.forEach((invoice) => {
    if (!invoice.extractedFields) return;

    const dataRow = columnHeaders.map((header) => {
      // Find which field maps to this column
      let value = "";
      for (const [fieldName, columnName] of fieldToColumn.entries()) {
        if (columnName === header) {
          const fieldValue = (invoice.extractedFields as any)[fieldName];
          if (fieldValue) {
            value = fieldValue;
            break;
          }
        }
      }
      return escapeCSV(value);
    });

    rows.push(dataRow.join(","));
  });

  const csvContent = rows.join("\n");

  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * Create TallyPrime 4.0 compatible CSV export
 * Uses exact 13-column structure required for Tally import
 */
export function createTallyPrimeExport(
  invoices: Array<{
    id: string;
    vendorName: string;
    tallyFields: {
      voucherDate: { value: string; confidence: number; needsReview?: boolean };
      voucherNumber: { value: string; confidence: number; needsReview?: boolean };
      partyLedgerName: { value: string; confidence: number; needsReview?: boolean };
      gstinUinParty: { value: string; confidence: number; needsReview?: boolean };
      placeOfSupply: { value: string; confidence: number; needsReview?: boolean };
      hsnSacOfSupply: { value: string; confidence: number; needsReview?: boolean };
      quantity: { value: string; confidence: number; needsReview?: boolean };
      rate: { value: string; confidence: number; needsReview?: boolean };
      totalTaxableValue: { value: string; confidence: number; needsReview?: boolean };
      cgstAmount: { value: string; confidence: number; needsReview?: boolean };
      sgstAmount: { value: string; confidence: number; needsReview?: boolean };
      igstAmount: { value: string; confidence: number; needsReview?: boolean };
      totalInvoiceValue: { value: string; confidence: number; needsReview?: boolean };
    };
    needsReview: boolean;
  }>
): Blob {
  const rows: string[] = [];

  // TallyPrime 4.0 exact column headers (in order 1-13)
  const headers = [
    "Voucher Date",
    "Voucher Number",
    "Party Ledger Name",
    "GSTIN/UIN Party",
    "Place of Supply",
    "HSN/SAC Of Supply",
    "Quantity",
    "Rate",
    "Total Taxable Value",
    "CGST Amount",
    "SGST Amount",
    "IGST Amount",
    "Total Invoice Value",
  ];

  // Add header row
  rows.push(headers.map(escapeCSV).join(","));

  // Add data rows (one per invoice)
  invoices.forEach((invoice) => {
    const { tallyFields } = invoice;
    
    const dataRow = [
      tallyFields.voucherDate.value,
      tallyFields.voucherNumber.value,
      tallyFields.partyLedgerName.value,
      tallyFields.gstinUinParty.value,
      tallyFields.placeOfSupply.value,
      tallyFields.hsnSacOfSupply.value,
      tallyFields.quantity.value,
      tallyFields.rate.value,
      tallyFields.totalTaxableValue.value,
      tallyFields.cgstAmount.value,
      tallyFields.sgstAmount.value,
      tallyFields.igstAmount.value,
      tallyFields.totalInvoiceValue.value,
    ].map(escapeCSV);

    rows.push(dataRow.join(","));
  });

  const csvContent = rows.join("\n");

  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}
