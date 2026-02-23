// Indian GST Invoice Field Definitions
// These are the 13 mandatory fields required for TallyPrime 4.0 import and GST compliance

export interface TallyPrimeFields {
  voucherDate: string; // 1. Voucher Date - Format: DD-MM-YYYY
  voucherNumber: string; // 2. Voucher Number - Unique Invoice/Bill number
  partyLedgerName: string; // 3. Party Ledger Name - Buyer's legal name
  gstinUinParty: string; // 4. GSTIN/UIN Party - 15-digit buyer GSTIN
  placeOfSupply: string; // 5. Place of Supply - State name or 2-digit code
  hsnSacOfSupply: string; // 6. HSN/SAC Of Supply - Comma-separated codes
  quantity: string; // 7. Quantity - Sum of (Qty + Free) for ALL items
  rate: string; // 8. Rate - GST percentage applied
  totalTaxableValue: string; // 9. Total Taxable Value - Pre-tax assessable value
  cgstAmount: string; // 10. CGST Amount - Central Tax
  sgstAmount: string; // 11. SGST Amount - State Tax
  igstAmount: string; // 12. IGST Amount - Integrated Tax (0.00 if CGST/SGST exist)
  totalInvoiceValue: string; // 13. Total Invoice Value - Final net amount
}

// Legacy alias for backward compatibility
export type GSTFields = TallyPrimeFields;

export interface TallyFieldWithConfidence {
  value: string;
  confidence: number; // 0.0 to 1.0
  needsReview?: boolean; // true if confidence < 0.85
}

export interface ExtendedTallyFields {
  voucherDate: TallyFieldWithConfidence;
  voucherNumber: TallyFieldWithConfidence;
  partyLedgerName: TallyFieldWithConfidence;
  gstinUinParty: TallyFieldWithConfidence;
  placeOfSupply: TallyFieldWithConfidence;
  hsnSacOfSupply: TallyFieldWithConfidence;
  quantity: TallyFieldWithConfidence;
  rate: TallyFieldWithConfidence;
  totalTaxableValue: TallyFieldWithConfidence;
  cgstAmount: TallyFieldWithConfidence;
  sgstAmount: TallyFieldWithConfidence;
  igstAmount: TallyFieldWithConfidence;
  totalInvoiceValue: TallyFieldWithConfidence;
}

// Legacy alias
export type GSTFieldWithConfidence = TallyFieldWithConfidence;
export type ExtendedGSTFields = ExtendedTallyFields;

// State check status for tax validation
export type StateCheckStatus = 'IntraState' | 'InterState' | 'Mismatch';

// Quantity breakdown for Qty + Free calculation
export interface QuantityBreakdown {
  qty: number;
  free: number;
  total: number;
}

// Extended invoice data with confidence and validation metadata
export interface InvoiceWithConfidence {
  invoiceId: bigint;
  vendorName: string;
  tallyFields: ExtendedTallyFields;
  overallConfidence: number; // Average confidence across all fields
  needsReview: boolean; // true if any critical field < 0.85
  stateCheckStatus: StateCheckStatus;
  quantityBreakdown?: QuantityBreakdown;
  affindaId?: string; // Document ID from Affinda
  reviewUrl?: string; // Link to Affinda validation tool
  status: "success" | "failed" | "processing";
  errorMessage?: string;
}

// TallyPrime 4.0 field display configuration for UI
export const TALLY_FIELD_CONFIG = [
  {
    key: "voucherDate" as keyof TallyPrimeFields,
    label: "Voucher Date",
    description: "Invoice issue date (DD-MM-YYYY format)",
    isCritical: false,
    example: "01-09-25",
  },
  {
    key: "voucherNumber" as keyof TallyPrimeFields,
    label: "Voucher Number",
    description: "Unique Invoice/Bill number",
    isCritical: true,
    example: "AR898/25-26",
  },
  {
    key: "partyLedgerName" as keyof TallyPrimeFields,
    label: "Party Ledger Name",
    description: "Buyer's legal name (Customer/Recipient)",
    isCritical: false,
    example: "PALANI MEDICAL AGENCIES",
  },
  {
    key: "gstinUinParty" as keyof TallyPrimeFields,
    label: "GSTIN/UIN Party",
    description: "15-digit buyer GSTIN (look for 'GST-' prefix)",
    isCritical: true,
    example: "33AALFP9155G1ZZ",
  },
  {
    key: "placeOfSupply" as keyof TallyPrimeFields,
    label: "Place of Supply",
    description: "State name or 2-digit State Code",
    isCritical: false,
    example: "Tamil Nadu (33)",
  },
  {
    key: "hsnSacOfSupply" as keyof TallyPrimeFields,
    label: "HSN/SAC Of Supply",
    description: "Product classification codes (comma-separated)",
    isCritical: false,
    example: "30049091, 30049039",
  },
  {
    key: "quantity" as keyof TallyPrimeFields,
    label: "Quantity",
    description: "Total units (Sum of Qty + Free for ALL items)",
    isCritical: false,
    example: "280",
  },
  {
    key: "rate" as keyof TallyPrimeFields,
    label: "Rate",
    description: "GST percentage applied",
    isCritical: false,
    example: "12.00",
  },
  {
    key: "totalTaxableValue" as keyof TallyPrimeFields,
    label: "Total Taxable Value",
    description: "Assessable value before tax",
    isCritical: true,
    example: "17,839.00",
  },
  {
    key: "cgstAmount" as keyof TallyPrimeFields,
    label: "CGST Amount",
    description: "Central Tax (Intra-state transactions)",
    isCritical: true,
    example: "1,070.34",
  },
  {
    key: "sgstAmount" as keyof TallyPrimeFields,
    label: "SGST Amount",
    description: "State Tax (Intra-state transactions)",
    isCritical: true,
    example: "1,070.34",
  },
  {
    key: "igstAmount" as keyof TallyPrimeFields,
    label: "IGST Amount",
    description: "Integrated Tax (Inter-state transactions, 0 if CGST/SGST exist)",
    isCritical: true,
    example: "0.00",
  },
  {
    key: "totalInvoiceValue" as keyof TallyPrimeFields,
    label: "Total Invoice Value",
    description: "Final net amount including all taxes",
    isCritical: false,
    example: "19,980.00",
  },
] as const;

// Legacy alias for backward compatibility
export const GST_FIELD_CONFIG = TALLY_FIELD_CONFIG;

// Utility to get TallyPrime field label
export function getTallyFieldLabel(key: keyof TallyPrimeFields): string {
  const config = TALLY_FIELD_CONFIG.find((f) => f.key === key);
  return config?.label || key;
}

// Utility to check if field is critical
export function isTallyFieldCritical(key: keyof TallyPrimeFields): boolean {
  const config = TALLY_FIELD_CONFIG.find((f) => f.key === key);
  return config?.isCritical || false;
}

// Legacy aliases
export const getGSTFieldLabel = getTallyFieldLabel;
export const isGSTFieldCritical = isTallyFieldCritical;

// Mock confidence generator (for visual testing until backend is connected)
export function generateMockConfidence(): number {
  // Generate confidence between 0.6 and 1.0 for realistic testing
  return 0.6 + Math.random() * 0.4;
}

// Convert old ExtractedFields to TallyPrime format with mock confidence
export function convertToTallyFields(
  extractedFields: {
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    gstTaxId: string;
    subtotalAmount: string;
    totalAmount: string;
  },
  overallConfidence = 0.85
): ExtendedTallyFields {
  // Mock mapping from old structure to new TallyPrime fields
  // Generate realistic confidence scores and needsReview flags
  
  const createField = (value: string, baseConfidence?: number): TallyFieldWithConfidence => {
    const confidence = baseConfidence ?? generateMockConfidence();
    return {
      value,
      confidence,
      needsReview: confidence < 0.85,
    };
  };

  // Mock quantity breakdown data
  const mockQty = 250;
  const mockFree = 30;
  const mockTotal = mockQty + mockFree;

  return {
    voucherDate: createField(
      extractedFields.invoiceDate 
        ? formatDateToDDMMYYYY(extractedFields.invoiceDate) 
        : "",
      0.95
    ),
    voucherNumber: createField(extractedFields.invoiceNumber || "", 0.98),
    partyLedgerName: createField(extractedFields.vendorName || "", 0.89),
    gstinUinParty: createField(extractedFields.gstTaxId || "", 0.78), // Low confidence for testing
    placeOfSupply: createField("Tamil Nadu (33)", 0.92),
    hsnSacOfSupply: createField("30049091, 30049039", 0.85),
    quantity: createField(mockTotal.toString(), 0.91),
    rate: createField("12.00", 0.96),
    totalTaxableValue: createField(extractedFields.subtotalAmount || "", 0.87),
    cgstAmount: createField("1070.34", 0.88),
    sgstAmount: createField("1070.34", 0.88),
    igstAmount: createField("0.00", 1.0),
    totalInvoiceValue: createField(extractedFields.totalAmount || "", 0.93),
  };
}

// Legacy alias
export const convertToGSTFields = convertToTallyFields;

// Utility to format date to DD-MM-YYYY
function formatDateToDDMMYYYY(date: string): string {
  // Handle various date formats
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return date; // Return as-is if parsing fails
  }
}

// Determine state check status from tax amounts
export function determineStateCheckStatus(
  cgstAmount: string,
  sgstAmount: string,
  igstAmount: string
): StateCheckStatus {
  const cgst = parseFloat(cgstAmount) || 0;
  const sgst = parseFloat(sgstAmount) || 0;
  const igst = parseFloat(igstAmount) || 0;

  // IntraState: CGST and SGST are non-zero, IGST is zero
  if (cgst > 0 && sgst > 0 && igst === 0) {
    return 'IntraState';
  }

  // InterState: IGST is non-zero, CGST and SGST are zero
  if (igst > 0 && cgst === 0 && sgst === 0) {
    return 'InterState';
  }

  // Mismatch: Invalid combination
  return 'Mismatch';
}

// Calculate quantity breakdown from TallyPrime fields
export function calculateQuantityBreakdown(quantity: string): QuantityBreakdown | null {
  // Mock breakdown for demonstration (in real implementation, this would come from backend)
  const total = parseInt(quantity) || 0;
  if (total === 0) return null;

  // Assume 90% qty, 10% free (mock logic)
  const qty = Math.floor(total * 0.9);
  const free = total - qty;

  return { qty, free, total };
}
