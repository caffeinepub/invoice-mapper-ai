# TallyPrime 4.0 Components - Visual Guide

Quick reference for using the new TallyPrime-specific React components.

---

## 🎨 New Components

### 1. StateCheckBadge

Shows the GST tax type validation status (IntraState/InterState/Mismatch).

**Import:**
```typescript
import { StateCheckBadge } from "@/components/StateCheckBadge";
import type { StateCheckStatus } from "@/lib/gst-fields";
```

**Usage:**
```tsx
// Basic usage
<StateCheckBadge status="IntraState" />

// With size options
<StateCheckBadge status="InterState" size="sm" />
<StateCheckBadge status="Mismatch" size="lg" />

// With full label
<StateCheckBadge status="IntraState" showDescription={true} />
```

**Props:**
- `status` (required): `'IntraState' | 'InterState' | 'Mismatch'`
- `size` (optional): `'sm' | 'md' | 'lg'` (default: `'md'`)
- `showDescription` (optional): `boolean` (default: `false`)
- `className` (optional): `string`

**Visual Output:**
- 🟢 IntraState: Green badge with checkmark
- 🔵 InterState: Blue badge with info icon
- 🔴 Mismatch: Red badge with alert icon

**Tooltip:** Hover shows explanation of tax rule

---

### 2. QuantityBreakdown

Displays quantity with Qty + Free breakdown in a tooltip.

**Import:**
```typescript
import { QuantityBreakdown, QuantityBreakdownText } from "@/components/QuantityBreakdown";
import type { QuantityBreakdown as QuantityBreakdownType } from "@/lib/gst-fields";
```

**Usage:**
```tsx
// With calculator icon and tooltip
<QuantityBreakdown 
  breakdown={{ qty: 250, free: 30, total: 280 }} 
/>

// Without icon
<QuantityBreakdown 
  breakdown={{ qty: 250, free: 30, total: 280 }}
  showIcon={false}
/>

// Text-only version (for table cells)
<QuantityBreakdownText 
  breakdown={{ qty: 250, free: 30, total: 280 }}
/>
```

**Props:**
- `breakdown` (required): `{ qty: number; free: number; total: number }`
- `showIcon` (optional): `boolean` (default: `true`)
- `className` (optional): `string`

**Visual Output:**
- Main: "280 units" with calculator icon
- Tooltip: "Qty: 250 + Free: 30 = Total: 280"

---

### 3. TallyExportPreview

Modal dialog showing CSV preview before export with TallyPrime 4.0 column structure.

**Import:**
```typescript
import { TallyExportPreview } from "@/components/TallyExportPreview";
import type { ExtendedTallyFields } from "@/lib/gst-fields";
```

**Usage:**
```tsx
const [showPreview, setShowPreview] = useState(false);

// Prepare invoice data
const invoices = myInvoices.map(inv => ({
  id: inv.id,
  vendorName: inv.vendorName,
  tallyFields: convertToTallyFields(inv.extractedFields),
  needsReview: inv.needsReview,
}));

// Handle export
const handleExport = (includeNeedsReview: boolean) => {
  const filtered = includeNeedsReview 
    ? invoices 
    : invoices.filter(inv => !inv.needsReview);
    
  const blob = createTallyPrimeExport(filtered);
  downloadBlob(blob, "tallyprime-export.csv");
};

// Render
<Button onClick={() => setShowPreview(true)}>
  Export to TallyPrime
</Button>

<TallyExportPreview
  open={showPreview}
  onOpenChange={setShowPreview}
  invoices={invoices}
  onExport={handleExport}
/>
```

**Props:**
- `open` (required): `boolean` - Controls modal visibility
- `onOpenChange` (required): `(open: boolean) => void` - Callback when modal closes
- `invoices` (required): Array of invoice objects with:
  - `id`: `string`
  - `vendorName`: `string`
  - `tallyFields`: `ExtendedTallyFields`
  - `needsReview`: `boolean`
- `onExport` (required): `(includeNeedsReview: boolean) => void` - Export callback

**Features:**
- Shows exact 13 TallyPrime column headers
- Displays preview of all invoice rows
- Highlights "REVIEW REQUIRED" fields in red
- Checkbox to include/exclude invoices needing review
- Shows counts and statistics
- Download CSV button

---

## 🔄 Updated Components

### 4. ConfidenceBadge

**Changes:**
- Threshold updated: High confidence now starts at **0.85** (was 0.9)
- New labels with percentages in tooltip

**Usage (unchanged):**
```tsx
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

// Basic
<ConfidenceBadge confidence={0.92} />

// Without label text
<ConfidenceBadge confidence={0.75} showLabel={false} />

// Different sizes
<ConfidenceBadge confidence={0.88} size="sm" />
<ConfidenceBadge confidence={0.65} size="lg" />
```

**Color Mapping:**
- 🟢 **Green**: confidence ≥ 0.85 (High)
- 🟠 **Orange**: confidence 0.6 - 0.84 (Medium - verify recommended)
- 🔴 **Red**: confidence < 0.6 (Low - review required)

---

## 🛠️ Utility Functions

### determineStateCheckStatus()

Calculates GST tax type from tax amounts.

```typescript
import { determineStateCheckStatus } from "@/lib/gst-fields";

const status = determineStateCheckStatus(
  "1070.34",  // cgstAmount
  "1070.34",  // sgstAmount
  "0.00"      // igstAmount
);
// Returns: 'IntraState'
```

**Logic:**
- CGST > 0 AND SGST > 0 AND IGST = 0 → `'IntraState'`
- IGST > 0 AND CGST = 0 AND SGST = 0 → `'InterState'`
- Any other combination → `'Mismatch'`

---

### calculateQuantityBreakdown()

Extracts Qty + Free breakdown from total.

```typescript
import { calculateQuantityBreakdown } from "@/lib/gst-fields";

const breakdown = calculateQuantityBreakdown("280");
// Returns: { qty: 252, free: 28, total: 280 }
// (currently uses mock 90/10 split - to be replaced with real parsing)
```

---

### convertToTallyFields()

Converts legacy ExtractedFields to TallyPrime format with confidence.

```typescript
import { convertToTallyFields } from "@/lib/gst-fields";

const tallyFields = convertToTallyFields({
  vendorName: "PALANI MEDICAL AGENCIES",
  invoiceNumber: "AR898/25-26",
  invoiceDate: "2025-09-01",
  gstTaxId: "33AALFP9155G1ZZ",
  subtotalAmount: "17839.00",
  totalAmount: "19980.00",
});

// Returns ExtendedTallyFields with all 13 fields:
// {
//   voucherDate: { value: "01-09-25", confidence: 0.95, needsReview: false },
//   voucherNumber: { value: "AR898/25-26", confidence: 0.98, needsReview: false },
//   partyLedgerName: { value: "PALANI MEDICAL AGENCIES", confidence: 0.89, needsReview: false },
//   gstinUinParty: { value: "33AALFP9155G1ZZ", confidence: 0.78, needsReview: true },
//   // ... 9 more fields
// }
```

---

### createTallyPrimeExport()

Generates TallyPrime 4.0 compatible CSV file.

```typescript
import { createTallyPrimeExport, downloadBlob } from "@/lib/excel-utils";

const invoices = [
  {
    id: "inv_001",
    vendorName: "PALANI MEDICAL AGENCIES",
    tallyFields: convertToTallyFields(extractedFields),
    needsReview: false,
  },
  // ... more invoices
];

const blob = createTallyPrimeExport(invoices);
downloadBlob(blob, "tallyprime-export-2026-02-23.csv");
```

**CSV Structure:**
```csv
Voucher Date,Voucher Number,Party Ledger Name,GSTIN/UIN Party,Place of Supply,HSN/SAC Of Supply,Quantity,Rate,Total Taxable Value,CGST Amount,SGST Amount,IGST Amount,Total Invoice Value
01-09-25,AR898/25-26,PALANI MEDICAL AGENCIES,33AALFP9155G1ZZ,Tamil Nadu (33),"30049091, 30049039",280,12.00,17839.00,1070.34,1070.34,0.00,19980.00
```

---

## 📐 Layout Patterns

### Pattern 1: Invoice Card with All Badges

```tsx
<Card>
  <div className="flex items-center gap-2">
    <h3>{invoice.vendorName}</h3>
    <ConfidenceBadge confidence={invoice.overallConfidence} size="sm" />
    <StateCheckBadge status={invoice.stateCheckStatus} size="sm" />
    {invoice.needsReviewCount > 0 && (
      <Badge variant="outline" className="text-orange-600">
        {invoice.needsReviewCount} needs review
      </Badge>
    )}
  </div>
</Card>
```

### Pattern 2: Table Row with All Indicators

```tsx
<TableRow>
  <TableCell>{invoice.vendorName}</TableCell>
  <TableCell>
    <ConfidenceBadge confidence={invoice.confidence} size="sm" />
  </TableCell>
  <TableCell>
    <StateCheckBadge status={invoice.stateCheck} size="sm" />
  </TableCell>
  <TableCell>
    <QuantityBreakdown breakdown={invoice.quantityBreakdown} showIcon={false} />
  </TableCell>
  <TableCell>
    {invoice.needsReviewCount > 0 ? (
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <Badge variant="outline" className="text-orange-600">
          {invoice.needsReviewCount} fields
        </Badge>
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">None</span>
    )}
  </TableCell>
</TableRow>
```

### Pattern 3: Field Display with Review Flag

```tsx
{tallyFields.gstinUinParty.value === "REVIEW REQUIRED" ? (
  <span className="font-bold text-red-600 dark:text-red-400">
    REVIEW REQUIRED
  </span>
) : (
  <span className={cn(
    "font-mono text-xs",
    tallyFields.gstinUinParty.needsReview && "text-orange-600"
  )}>
    {tallyFields.gstinUinParty.value}
  </span>
)}
```

---

## 🎨 Styling Guidelines

### Confidence Colors
```css
/* High Confidence (≥0.85) */
.confidence-high {
  @apply text-green-600 dark:text-green-400 
         border-green-200 dark:border-green-800 
         bg-green-50 dark:bg-green-950/20;
}

/* Medium Confidence (0.6-0.84) */
.confidence-medium {
  @apply text-orange-600 dark:text-orange-400 
         border-orange-200 dark:border-orange-800 
         bg-orange-50 dark:bg-orange-950/20;
}

/* Low Confidence (<0.6) */
.confidence-low {
  @apply text-red-600 dark:text-red-400 
         border-red-200 dark:border-red-800 
         bg-red-50 dark:bg-red-950/20;
}
```

### State Check Colors
```css
/* IntraState */
.state-intra {
  @apply text-green-600 dark:text-green-400 
         border-green-200 dark:border-green-800 
         bg-green-50 dark:bg-green-950/20;
}

/* InterState */
.state-inter {
  @apply text-blue-600 dark:text-blue-400 
         border-blue-200 dark:border-blue-800 
         bg-blue-50 dark:bg-blue-950/20;
}

/* Mismatch */
.state-mismatch {
  @apply text-red-600 dark:text-red-400 
         border-red-200 dark:border-red-800 
         bg-red-50 dark:bg-red-950/20;
}
```

### Review Required
```css
.review-required {
  @apply font-bold text-red-600 dark:text-red-400;
}

.needs-review-highlight {
  @apply bg-red-50 dark:bg-red-950/10;
}

.needs-review-warning {
  @apply text-orange-600 dark:text-orange-400;
}
```

---

## 📱 Responsive Behavior

All components are mobile-friendly:

- **StateCheckBadge**: Wraps text on small screens
- **QuantityBreakdown**: Tooltip adapts to viewport
- **TallyExportPreview**: Modal scales to 85vh on mobile
- **Table columns**: Use horizontal scroll on mobile

---

## ♿ Accessibility

All components include:

- **ARIA labels** for screen readers
- **Keyboard navigation** (Tab, Enter, Escape)
- **Focus indicators** for interactive elements
- **Color + icon** (not color alone) for status indication
- **Tooltips** with explanatory text
- **High contrast** in dark mode

---

## 🧪 Testing Components

### Visual Regression Testing

```tsx
// Test all confidence levels
<ConfidenceBadge confidence={0.95} /> // Green
<ConfidenceBadge confidence={0.75} /> // Orange
<ConfidenceBadge confidence={0.45} /> // Red

// Test all state check statuses
<StateCheckBadge status="IntraState" />
<StateCheckBadge status="InterState" />
<StateCheckBadge status="Mismatch" />

// Test quantity breakdown
<QuantityBreakdown breakdown={{ qty: 250, free: 30, total: 280 }} />
<QuantityBreakdown breakdown={{ qty: 100, free: 0, total: 100 }} />
```

### Interaction Testing

```tsx
// Test export preview with various scenarios
<TallyExportPreview
  invoices={[
    // Scenario 1: All fields perfect
    { id: "1", needsReview: false, /* ... */ },
    
    // Scenario 2: Some fields need review
    { id: "2", needsReview: true, /* ... */ },
    
    // Scenario 3: Critical field is "REVIEW REQUIRED"
    { 
      id: "3", 
      needsReview: true,
      tallyFields: { 
        gstinUinParty: { value: "REVIEW REQUIRED", confidence: 0.3, needsReview: true },
        // ...
      }
    },
  ]}
/>
```

---

## 🔧 Troubleshooting

### Badge not showing correct color

**Check:** Confidence value is between 0.0 and 1.0 (not 0-100)

```tsx
// ❌ Wrong
<ConfidenceBadge confidence={85} />

// ✅ Correct
<ConfidenceBadge confidence={0.85} />
```

### State check always shows "Mismatch"

**Check:** Tax amounts are strings, not numbers

```tsx
// ❌ Wrong
determineStateCheckStatus(1070.34, 1070.34, 0)

// ✅ Correct
determineStateCheckStatus("1070.34", "1070.34", "0.00")
```

### Quantity breakdown not showing

**Check:** Breakdown object has all required fields

```tsx
// ❌ Wrong
<QuantityBreakdown breakdown={{ total: 280 }} />

// ✅ Correct
<QuantityBreakdown breakdown={{ qty: 250, free: 30, total: 280 }} />
```

### Export modal not opening

**Check:** State management and open prop

```tsx
const [open, setOpen] = useState(false);

// ❌ Wrong - forgot to pass open prop
<TallyExportPreview onOpenChange={setOpen} invoices={[]} onExport={() => {}} />

// ✅ Correct
<TallyExportPreview 
  open={open} 
  onOpenChange={setOpen} 
  invoices={[]} 
  onExport={() => {}} 
/>
```

---

## 📚 Related Files

- Type definitions: `src/frontend/src/lib/gst-fields.ts`
- Export utilities: `src/frontend/src/lib/excel-utils.ts`
- Component implementations:
  - `src/frontend/src/components/StateCheckBadge.tsx`
  - `src/frontend/src/components/QuantityBreakdown.tsx`
  - `src/frontend/src/components/TallyExportPreview.tsx`
  - `src/frontend/src/components/ConfidenceBadge.tsx`

---

**Last updated:** February 23, 2026  
**Compatible with:** TallyPrime 4.0, React 19, TypeScript 5.9
