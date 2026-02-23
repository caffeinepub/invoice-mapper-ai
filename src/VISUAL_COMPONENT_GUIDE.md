# Visual Component Guide

## New Components

### 1. ConfidenceBadge
```tsx
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

// High confidence (>0.9) - Green
<ConfidenceBadge confidence={0.95} size="md" />

// Medium confidence (0.6-0.9) - Orange
<ConfidenceBadge confidence={0.75} size="md" />

// Low confidence (<0.6) - Red
<ConfidenceBadge confidence={0.45} size="md" />

// Compact version (no label, just dot + icon)
<ConfidenceBadge confidence={0.85} showLabel={false} size="sm" />
```

**Visual Output:**
- 🟢 High confidence (with checkmark icon)
- 🟠 Medium confidence - review recommended (with warning icon)
- 🔴 Low confidence - needs review (with alert icon)

### 2. ValidationButtons
```tsx
import { ValidationButtons } from "@/components/ValidationButtons";

<ValidationButtons
  reviewUrl="https://app.affinda.com/validation/doc-123"
  invoiceId={BigInt(456)}
  onSync={async (id) => {
    // Re-fetch corrected data from Affinda
    await syncFromAffinda(id);
  }}
/>
```

**Visual Output:**
- [🔗 Open Review Tool] (primary button)
- [🔄 Sync Corrected Data] (outline button)

---

## Updated Components

### MappingWorkspace - GST Fields View

**Before:**
```
Invoice Fields
├── Vendor Name
├── Invoice Number
├── Invoice Date
├── GST/Tax ID
├── Subtotal
└── Total Amount
```

**After:**
```
Invoice Fields (GST Format)             [🟢 High confidence]

⚠️ Some critical fields have low confidence...

[🔗 Open Review Tool]  [🔄 Sync Corrected Data]

13 GST FIELDS FOR TALLY EXPORT                    (11 of 13 extracted)

┌─ GSTIN/UIN Party ────────────────────────────────────┐
│ [Critical]                                            │
│ 33AALFP9155G1ZZ                         🟢 95%       │
│ Recipient's GST identification number                 │
└───────────────────────────────────────────────────────┘

┌─ Party Name ──────────────────────────────────────────┐
│                                                        │
│ PALANI MEDICAL AGENCIES                   🟢 92%      │
│ Customer or receiver name                             │
└───────────────────────────────────────────────────────┘

┌─ Invoice No ──────────────────────────────────────────┐
│ [Critical]                                            │
│ AR898/25-26                               🟢 98%      │
│ Unique invoice serial number                          │
└───────────────────────────────────────────────────────┘

... (10 more fields) ...

┌─ CGST Amount ─────────────────────────────────────────┐
│ [Critical] [⚠️ Yellow Background]                     │
│ 1,070.34                                  🟠 78%      │
│ Central tax (intra-state)                             │
└───────────────────────────────────────────────────────┘
```

---

### BatchSummaryTable - Confidence Column

**Before:**
```
#  | Vendor Name              | Invoice No    | Status
1  | Palani Medical Agencies  | AR898/25-26   | ✅ Mapped
2  | ABC Corp                 | INV-1001      | 📄 Unmapped
3  | XYZ Ltd                  | B-500         | ⚠️ Duplicate
```

**After:**
```
#  | Vendor Name              | Invoice No    | Status      | Confidence
1  | Palani Medical Agencies  | AR898/25-26   | ✅ Mapped   | 🟢 High
2  | ABC Corp                 | INV-1001      | 📄 Unmapped | N/A
3  | XYZ Ltd                  | B-500         | ⚠️ Duplicate| 🟠 Medium
```

---

### HistoryPage - Confidence Display

**Before:**
```
┌─ Palani Medical Agencies ────────────────────────┐
│ [Success] #AR898/25-26                            │
│                                                   │
│ Date: 01/09/25     GST: 33AALFP9155G1ZZ          │
│ Subtotal: 17,839   Total: 19,980                 │
└───────────────────────────────────────────────────┘
```

**After:**
```
┌─ Palani Medical Agencies ────────────────────────┐
│ [Success] #AR898/25-26  [🟢 High confidence]     │
│                                                   │
│ Date: 01/09/25     GST: 33AALFP9155G1ZZ          │
│ Subtotal: 17,839   Total: 19,980                 │
└───────────────────────────────────────────────────┘
```

---

### MapperPage - Error Handling with Retry

**Before:**
```
(Error toast appears, invoice disappears, user must re-upload)
```

**After:**
```
╔═════════════════════════════════════════════════════════╗
║ ❌ Invoice processing failed                            ║
║                                                          ║
║ Analysis failed. Please check your API key in Settings. ║
║                                                          ║
║ Please check your Affinda API credentials in Settings.  ║
║                                                          ║
║                    [⚙️ Go to Settings]  [🔄 Retry]      ║
╚═════════════════════════════════════════════════════════╝
```

**User Flow:**
1. Invoice upload fails
2. Red alert banner appears with error details
3. User clicks "Go to Settings" → Navigates to settings page
4. User enters API credentials and saves
5. Returns to mapper, clicks "Retry" → Invoice processes without re-upload

---

### SettingsPage - Connection Status

**Before:**
```
Settings

[📄 Placeholder message: Backend function not available]

API Key: [___________________]
Org ID:  [___________________]

[Save Settings]
```

**After:**

#### State 1: Not Configured
```
Settings

╔═══════════════════════════════════════════════════╗
║ ℹ️ No API credentials found.                      ║
║ Please configure your Affinda API key below.      ║
╚═══════════════════════════════════════════════════╝

API Key *: [●●●●●●●●●●●●●●●●●●]
Org ID *:  [___________________]

[💾 Save Settings]
```

#### State 2: Configured
```
Settings

╔═══════════════════════════════════════════════════╗
║ ✅ API credentials are configured.                ║
║ Invoice analysis is enabled.                      ║
╚═══════════════════════════════════════════════════╝

API Key *: [●●●●●●●●●●●●●●●●●●]
Org ID *:  [abc123xyz789______]

[💾 Save Settings]
```

#### State 3: Connection Error
```
Settings

╔═══════════════════════════════════════════════════╗
║ ❌ Connection Error                                ║
║                                                    ║
║ Unable to connect to backend. Please ensure       ║
║ you're logged in.                                  ║
╚═══════════════════════════════════════════════════╝

API Key *: [___________________]
Org ID *:  [___________________]

[💾 Save Settings]
```

---

## Color System

### Confidence Levels
- **High (>0.9)**: `text-green-600` / `bg-green-50` / `border-green-200`
- **Medium (0.6-0.9)**: `text-orange-600` / `bg-orange-50` / `border-orange-200`
- **Low (<0.6)**: `text-red-600` / `bg-red-50` / `border-red-200`

### Status Indicators
- **Success**: `text-success` / `border-success`
- **Warning**: `text-warning` / `border-warning`
- **Error**: `text-destructive` / `border-destructive`

### Critical Field Highlighting
- **Normal**: White/default card background
- **Low Confidence Critical**: `bg-orange-50/50 dark:bg-orange-950/10`

---

## Iconography

### Confidence Icons
- 🟢 `CheckCircle2` - High confidence
- 🟠 `AlertTriangle` - Medium confidence
- 🔴 `AlertCircle` - Low confidence

### Action Icons
- 🔗 `ExternalLink` - Open Review Tool
- 🔄 `RefreshCw` - Sync Corrected Data / Retry
- ⚙️ `Settings` - Go to Settings
- 💾 `Save` - Save Settings
- ❌ `X` - Close / Error
- ✅ `CheckCircle2` - Success
- ℹ️ `AlertCircle` - Info

---

## Responsive Behavior

### Mobile (<640px)
- Badges stack vertically
- Buttons go full-width
- Field cards remain single-column
- Confidence badges show abbreviated labels

### Tablet (640px-1024px)
- Badges wrap in flex layout
- Buttons maintain inline layout
- Field grid remains single-column
- Full confidence labels shown

### Desktop (>1024px)
- Split-view workspace at full width
- Badges inline with full labels
- Batch table shows all columns
- Field cards with generous padding

---

## Accessibility

### Screen Readers
- All badges have `title` attribute with full confidence text
- Icons have `sr-only` text alternatives
- Buttons have descriptive labels
- Field descriptions read after values

### Keyboard Navigation
- All interactive elements focusable
- Retry button accessible via Tab
- Settings link keyboard-navigable
- Validation buttons in logical order

### Color Contrast
- All text meets WCAG AA (4.5:1 minimum)
- Icons supplement color indicators
- Critical badges use both color and text
- Dark mode support with adjusted colors

---

## Usage Examples

### In Single Invoice Mapper
```tsx
<MappingWorkspace
  columnHeaders={["Doc No", "Date", "Vendor", "GSTIN", "Total"]}
  extractedFields={invoice.extractedFields}
  invoicePreviewUrl="/preview.pdf"
  mappings={mappings}
  onMappingCreate={handleMap}
  onMappingRemove={handleRemove}
  onAutoMap={handleAutoMap}
  hasVendorTemplate={true}
/>
```

### In Batch Processing
```tsx
<BatchSummaryTable
  batchId={BigInt(123)}
  invoices={batchInvoices}
  columnHeaders={["GSTIN", "Party Name", "Invoice No", ...]}
  onUpdateMapping={handleUpdate}
  onRefresh={refetchBatch}
/>
```

### In History View
```tsx
{invoices.map(invoice => {
  const confidence = getInvoiceConfidence(invoice);
  return (
    <InvoiceCard>
      <Badge>{invoice.status}</Badge>
      {confidence && <ConfidenceBadge confidence={confidence} />}
    </InvoiceCard>
  );
})}
```

---

## Mock Data Structure

Until backend is connected, mock data is generated as:

```typescript
const gstFields: ExtendedGSTFields = {
  gstinParty: { value: "33AALFP9155G1ZZ", confidence: 0.95 },
  partyName: { value: "PALANI MEDICAL AGENCIES", confidence: 0.92 },
  invoiceNo: { value: "AR898/25-26", confidence: 0.98 },
  date: { value: "01/09/25", confidence: 0.90 },
  totalInvoiceValue: { value: "19,980.00", confidence: 0.88 },
  placeOfSupply: { value: "Tamil Nadu (Chennai)", confidence: 0.85 },
  hsnSac: { value: "30049091", confidence: 0.80 },
  quantity: { value: "110", confidence: 0.87 },
  rate: { value: "12%", confidence: 0.93 },
  totalTaxableValue: { value: "17,839.00", confidence: 0.91 },
  cgstAmount: { value: "1,070.34", confidence: 0.78 }, // Low (Orange)
  sgstAmount: { value: "1,070.34", confidence: 0.76 }, // Low (Orange)
  igstAmount: { value: "0.00", confidence: 1.00 },
};
```

**Note:** Backend will replace this with real Affinda v3 API responses.
