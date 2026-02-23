# TaxMapper AI - TallyPrime 4.0 GST Invoice Extraction System

## Current State

The application currently has:
- Split-screen invoice mapper with Internet Identity authentication
- Batch processing (up to 50 invoices)
- Vendor template library with auto-mapping
- 30-day trash system with auto-cleanup timer
- Settings page for Affinda API credentials
- Affinda v3 integration UI with confidence badges and validation workflow
- Basic GST field extraction (13 fields with generic structure)

**Current Limitations:**
- Field structure doesn't match TallyPrime 4.0 exact column names
- No Qty + Free calculation logic
- Missing State-Check logic for CGST/SGST vs IGST validation
- Export headers not TallyPrime-compatible
- No "REVIEW REQUIRED" text flagging in cells

## Requested Changes (Diff)

### Add

**Backend:**
1. **TallyPrime 4.0 Field Structure** - 13-column data model with exact naming:
   - Voucher Date (DD-MM-YYYY format)
   - Voucher Number
   - Party Ledger Name
   - GSTIN/UIN Party
   - Place of Supply
   - HSN/SAC Of Supply (comma-separated)
   - Quantity (Qty + Free calculation)
   - Rate (GST %)
   - Total Taxable Value
   - CGST Amount
   - SGST Amount
   - IGST Amount
   - Total Invoice Value

2. **Qty + Free Math Engine** - Calculation logic:
   - Extract "Qty" and "Free" columns from invoice line items
   - Sum: Total Quantity = Σ(Qty + Free) for all items
   - Store calculated total in Quantity field

3. **State-Check Logic** - CGST/SGST vs IGST validation:
   - Extract first 2 digits from Seller GSTIN
   - Extract first 2 digits from Buyer GSTIN
   - If match → Intra-state → CGST/SGST active, IGST = 0.00
   - If differ → Inter-state → IGST active, CGST/SGST = 0.00
   - Flag mismatches for manual review

4. **REVIEW REQUIRED Flagging System**:
   - Per-field confidence scoring (0.0-1.0)
   - Mark fields with confidence < 0.85 as "REVIEW REQUIRED"
   - Store flag status in invoice data model

5. **TallyPrime Export Service**:
   - Generate CSV/Excel with exact TallyPrime 4.0 column headers
   - Maintain 1-13 column order
   - Include "REVIEW REQUIRED" markers in export
   - Format: DD-MM-YYYY for dates, comma-separated for HSN codes

**Frontend:**
1. **13-Column TallyPrime Display** - Mapping workspace update:
   - Replace current field labels with TallyPrime column names
   - Show calculated Quantity (Qty + Free) with calculation breakdown
   - Display State-Check result (Intra-state/Inter-state indicator)

2. **REVIEW REQUIRED UI Elements**:
   - Display "REVIEW REQUIRED" text in low-confidence cells
   - Show red confidence badge (< 0.6)
   - Orange badge for medium confidence (0.6-0.84)
   - Green badge for high confidence (≥ 0.85)

3. **Batch Summary Enhancements**:
   - Add "Needs Review" column showing count of flagged fields
   - State-Check status indicator per invoice
   - Quantity calculation preview

4. **Export Interface**:
   - "Export to TallyPrime" button with exact format confirmation
   - Preview modal showing column headers before export
   - Option to exclude flagged invoices or include with markers

### Modify

**Backend:**
1. **Invoice Data Model** - Update type definition:
   ```motoko
   type TallyPrimeFields = {
     voucherDate: Text;        // DD-MM-YYYY
     voucherNumber: Text;
     partyLedgerName: Text;
     gstinUinParty: Text;      // 15-digit
     placeOfSupply: Text;
     hsnSacOfSupply: Text;     // Comma-separated
     quantity: Text;           // Calculated: Qty + Free
     rate: Text;               // GST %
     totalTaxableValue: Text;
     cgstAmount: Text;
     sgstAmount: Text;
     igstAmount: Text;
     totalInvoiceValue: Text;
   };

   type Invoice = {
     id: Text;
     userId: Principal;
     batchId: ?Text;
     status: InvoiceStatus;
     uploadedAt: Int;
     affindaId: ?Text;
     confidence: Float;        // Overall confidence
     reviewUrl: ?Text;
     tallyFields: TallyPrimeFields;
     fieldConfidence: [(Text, Float)]; // Per-field confidence
     needsReview: Bool;        // Flagged if any field < 0.85
     stateCheckStatus: StateCheckResult;
     deletedAt: ?Nat64;
   };

   type StateCheckResult = {
     #IntraState;  // CGST/SGST apply
     #InterState;  // IGST applies
     #Mismatch;    // Requires manual review
   };
   ```

2. **Affinda Integration** - Update extraction logic:
   - Parse invoice for "Qty" and "Free" columns
   - Calculate quantity sum
   - Extract Seller and Buyer GSTIN
   - Perform State-Check validation
   - Assign per-field confidence scores
   - Flag fields < 0.85 threshold

3. **Export Function** - Update to TallyPrime format:
   - Use exact column names as headers
   - Format dates as DD-MM-YYYY
   - Include "REVIEW REQUIRED" text in flagged cells
   - Maintain strict column order (1-13)

**Frontend:**
1. **MappingWorkspace Component** - Update field display:
   - Replace field labels with TallyPrime names
   - Add Quantity calculation breakdown UI
   - Show State-Check indicator badge
   - Display "REVIEW REQUIRED" text in cells

2. **BatchSummaryTable Component** - Add columns:
   - "Needs Review" (count of flagged fields)
   - "Tax Type" (Intra-state/Inter-state)
   - "Quantity" (calculated total)

3. **Export Service** - Update headers and format:
   - Generate TallyPrime-compatible CSV
   - Include flagged field markers
   - Add export preview modal

### Remove

- Old field naming (Date → Voucher Date, Invoice No → Voucher Number, etc.)
- Generic GST field structure
- Non-TallyPrime export format

## Implementation Plan

### Phase 1: Backend Core Logic (Priority: Critical)

**Step 1.1: Update Data Model**
- Define `TallyPrimeFields` type with 13 exact fields
- Update `Invoice` type with new structure
- Add `StateCheckResult` enum
- Add `fieldConfidence` array for per-field scoring
- Add `needsReview` boolean flag

**Step 1.2: Implement Qty + Free Calculation Engine**
- Create `calculateQuantity()` function
- Parse invoice line items table
- Extract "Qty" and "Free" columns
- Sum: Total = Σ(Qty + Free) across all items
- Return calculated value as Text

**Step 1.3: Implement State-Check Logic**
- Create `performStateCheck()` function
- Extract first 2 digits from Seller GSTIN
- Extract first 2 digits from Buyer GSTIN  
- Compare digits:
  - Match → Return #IntraState
  - Differ → Return #InterState
  - Invalid → Return #Mismatch
- Validate CGST/SGST/IGST amounts based on result

**Step 1.4: Update Affinda Integration**
- Modify `submitToAffinda()` to extract 13 TallyPrime fields
- Parse line-item tables for Qty and Free columns
- Calculate quantity using Qty + Free engine
- Extract Seller and Buyer GSTIN for State-Check
- Assign per-field confidence scores
- Flag fields with confidence < 0.85
- Set `needsReview` flag if any field flagged
- Store `StateCheckResult` in invoice record

**Step 1.5: Implement REVIEW REQUIRED Flagging**
- Create `flagLowConfidenceFields()` function
- Iterate through `fieldConfidence` array
- Mark fields < 0.85 threshold
- Write "REVIEW REQUIRED" to field value if flagged
- Set `needsReview` boolean on invoice

**Step 1.6: Update Export Service**
- Create `exportToTallyPrime()` function
- Generate CSV with exact column headers (1-13 order)
- Format Voucher Date as DD-MM-YYYY
- Include "REVIEW REQUIRED" text in flagged cells
- Return downloadable CSV file

### Phase 2: Frontend TallyPrime UI (Priority: High)

**Step 2.1: Update MappingWorkspace Component**
- Replace field labels with TallyPrime column names
- Add Quantity field with calculation breakdown:
  - Display: "280 (Qty: 250 + Free: 30)"
- Add State-Check indicator badge:
  - Green "Intra-state" or Blue "Inter-state"
- Show "REVIEW REQUIRED" text in cells with confidence < 0.85
- Display confidence badge colors:
  - Red (< 0.6), Orange (0.6-0.84), Green (≥ 0.85)

**Step 2.2: Update BatchSummaryTable Component**
- Add "Needs Review" column showing count of flagged fields
- Add "Tax Type" column with State-Check result
- Add "Quantity" column with calculated total
- Show warning icon for invoices with `needsReview = true`

**Step 2.3: Create TallyPrime Export Interface**
- Add "Export to TallyPrime" button
- Create export preview modal:
  - Show column headers (1-13)
  - Display sample row with data
  - Highlight flagged fields
- Add option: "Include invoices needing review"
- Trigger CSV download with exact format

**Step 2.4: Update HistoryPage Component**
- Display TallyPrime field names in invoice details
- Show State-Check result badge
- Display Quantity calculation breakdown
- Highlight "REVIEW REQUIRED" fields

### Phase 3: Validation & Quality Control

**Step 3.1: Backend Validation**
- TypeScript type checking for Motoko bindings
- Test Qty + Free calculation with sample data
- Test State-Check logic with matching/non-matching GSTINs
- Verify confidence scoring threshold (< 0.85)
- Validate export CSV format matches TallyPrime spec

**Step 3.2: Frontend Validation**
- TypeScript compilation (0 errors)
- ESLint checks
- Test 13-column display in mapping workspace
- Verify "REVIEW REQUIRED" text appears in flagged cells
- Test export preview modal
- Verify confidence badge colors

**Step 3.3: Integration Testing**
- Upload sample invoice with multiple line items
- Verify Qty + Free calculation is correct
- Check State-Check logic produces correct result
- Confirm low-confidence fields show "REVIEW REQUIRED"
- Export to CSV and verify TallyPrime format
- Test batch processing with 10+ invoices

### Phase 4: Deployment

**Step 4.1: Build & Deploy**
- Run TypeScript compilation
- Run ESLint validation
- Build production frontend
- Deploy to Internet Computer
- Verify deployment success

**Step 4.2: Post-Deployment Verification**
- Test file upload with real invoice
- Verify Affinda API integration works
- Check TallyPrime export downloads correctly
- Confirm all UI elements render properly

## UX Notes

### Critical Business Logic

**Independent Analysis Mandate:**
- Every invoice must be analyzed fresh
- AR898 reference is for structure only, never copy data
- Backend must perform unique extraction per file
- No template data copying allowed

**Zero Hallucination Guardrails:**
- If field value unclear → Write "REVIEW REQUIRED"
- Never guess or infer missing data
- Flag for human review instead of auto-filling
- Confidence threshold enforced at 0.85

**Qty + Free Calculation Display:**
- Show breakdown in UI: "280 (Qty: 250 + Free: 30)"
- Help users understand calculation source
- Display per line-item if multiple products

**State-Check Logic Visibility:**
- Show clear indicator: "Intra-state" or "Inter-state"
- Explain why CGST/SGST vs IGST was chosen
- Flag mismatches with warning icon

**TallyPrime Export Accuracy:**
- Exact column names (no variations)
- Strict column order (1-13)
- Date format: DD-MM-YYYY
- HSN codes: Comma-separated, no spaces
- Include flagged fields with "REVIEW REQUIRED" text visible

### User Workflow

1. **Upload Invoice(s)** - Single or batch (up to 50)
2. **Automatic Extraction** - Affinda API processes with Qty + Free calculation
3. **State-Check Validation** - Backend determines CGST/SGST vs IGST
4. **Review Flagged Fields** - User sees "REVIEW REQUIRED" markers
5. **Manual Correction (if needed)** - Use Affinda Review Tool
6. **Sync Corrected Data** - Re-fetch verified results
7. **Export to TallyPrime** - Download CSV with exact format
8. **Import to Tally** - Direct import without manual reformatting

### Key UI Elements

- **Confidence Badges**: Green (≥0.85), Orange (0.6-0.84), Red (<0.6)
- **REVIEW REQUIRED Text**: Displayed in cell when confidence < 0.85
- **State-Check Badge**: "Intra-state" (green) or "Inter-state" (blue)
- **Quantity Breakdown**: "Total (Qty + Free)" format
- **Export Preview**: Shows exact TallyPrime headers before download
- **Needs Review Counter**: Shows count of flagged fields per invoice

## Technical Specifications

### Backend (Motoko)

**New Functions:**
- `calculateQuantity(lineItems: [LineItem]) -> Text`
- `performStateCheck(sellerGSTIN: Text, buyerGSTIN: Text) -> StateCheckResult`
- `flagLowConfidenceFields(fieldScores: [(Text, Float)]) -> [(Text, Bool)]`
- `exportToTallyPrime(invoices: [Invoice]) -> Blob`

**Updated Functions:**
- `submitToAffinda()` - Extract 13 TallyPrime fields with confidence scores
- `processInvoice()` - Add Qty + Free calculation and State-Check logic

**Data Structures:**
- `TallyPrimeFields` - 13-field structure
- `StateCheckResult` - Enum for tax type
- `fieldConfidence: [(Text, Float)]` - Per-field confidence scores

### Frontend (React + TypeScript)

**Updated Components:**
- `MappingWorkspace.tsx` - 13-column TallyPrime display
- `BatchSummaryTable.tsx` - Add Needs Review, Tax Type columns
- `HistoryPage.tsx` - Show TallyPrime fields

**New Components:**
- `TallyExportPreview.tsx` - Export preview modal
- `StateCheckBadge.tsx` - Intra-state/Inter-state indicator
- `QuantityBreakdown.tsx` - Display Qty + Free calculation

**Updated Services:**
- `export.ts` - TallyPrime CSV generation with exact headers

### Export Format Specification

**CSV Structure:**
```csv
Voucher Date,Voucher Number,Party Ledger Name,GSTIN/UIN Party,Place of Supply,HSN/SAC Of Supply,Quantity,Rate,Total Taxable Value,CGST Amount,SGST Amount,IGST Amount,Total Invoice Value
01-09-25,AR898/25-26,PALANI MEDICAL AGENCIES,33AALFP9155G1ZZ,Tamil Nadu,"30049091,30049039",280,12.00,17839.00,1070.34,1070.34,0.00,19980.00
```

**Rules:**
- Column order: Strictly 1-13 as shown
- Date format: DD-MM-YYYY (no other format accepted)
- HSN codes: Comma-separated, no spaces after comma
- Numbers: No currency symbols, decimals with period
- Flagged fields: Show "REVIEW REQUIRED" text in cell

## Success Criteria

✅ **TallyPrime 4.0 13-column layout** - Exact field names and order  
✅ **(Qty + Free) math logic** - Automatic calculation from line items  
✅ **REVIEW REQUIRED flag** - Displayed for confidence < 0.85  
✅ **State-Check logic** - Automatic CGST/SGST vs IGST validation  
✅ **Independent analysis** - No template data copying (AR898 is reference only)  
✅ **Zero hallucination** - Flag unclear fields, never guess  
✅ **Tally-compatible export** - CSV with exact headers, ready for import  
✅ **Per-field confidence** - Visual indicators (badges + text)  
✅ **Batch processing** - All features work for single and batch uploads  
✅ **UI validation** - TypeScript 0 errors, build successful  

## Deployment Checklist

- [ ] Backend: TallyPrimeFields data model updated
- [ ] Backend: Qty + Free calculation engine implemented
- [ ] Backend: State-Check logic functional
- [ ] Backend: REVIEW REQUIRED flagging active
- [ ] Backend: TallyPrime export service ready
- [ ] Frontend: 13-column display updated
- [ ] Frontend: Confidence badges showing correctly
- [ ] Frontend: REVIEW REQUIRED text visible
- [ ] Frontend: State-Check indicator present
- [ ] Frontend: Quantity breakdown displayed
- [ ] Frontend: Export preview modal functional
- [ ] Validation: TypeScript compilation successful
- [ ] Validation: ESLint checks passed
- [ ] Deployment: Build successful
- [ ] Deployment: App accessible and functional
