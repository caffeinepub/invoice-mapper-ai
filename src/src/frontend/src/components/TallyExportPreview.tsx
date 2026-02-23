import { useState } from "react";
import { Download, AlertCircle, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TALLY_FIELD_CONFIG } from "../lib/gst-fields";
import type { ExtendedTallyFields } from "../lib/gst-fields";

interface TallyExportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Array<{
    id: string;
    vendorName: string;
    tallyFields: ExtendedTallyFields;
    needsReview: boolean;
  }>;
  onExport: (includeNeedsReview: boolean) => void;
}

export function TallyExportPreview({
  open,
  onOpenChange,
  invoices,
  onExport,
}: TallyExportPreviewProps) {
  const [includeNeedsReview, setIncludeNeedsReview] = useState(true);

  // Filter invoices based on checkbox
  const filteredInvoices = includeNeedsReview
    ? invoices
    : invoices.filter((inv) => !inv.needsReview);

  // Count invoices needing review
  const needsReviewCount = invoices.filter((inv) => inv.needsReview).length;

  // Handle export
  const handleExport = () => {
    onExport(includeNeedsReview);
    onOpenChange(false);
  };

  // Check if a field value is "REVIEW REQUIRED"
  const isReviewRequired = (value: string) => {
    return value === "REVIEW REQUIRED" || value.includes("REVIEW REQUIRED");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            TallyPrime Export Preview
          </DialogTitle>
          <DialogDescription>
            Review your data before exporting to TallyPrime 4.0 compatible CSV format
          </DialogDescription>
        </DialogHeader>

        {/* Warning for fields needing review */}
        {needsReviewCount > 0 && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-400">
              <strong>{needsReviewCount}</strong> invoice{needsReviewCount !== 1 ? "s" : ""} contain
              fields marked "REVIEW REQUIRED" (confidence &lt; 0.85). Please verify these fields
              before import to Tally.
            </AlertDescription>
          </Alert>
        )}

        {/* Options */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-needs-review"
            checked={includeNeedsReview}
            onCheckedChange={(checked) => setIncludeNeedsReview(checked === true)}
          />
          <Label
            htmlFor="include-needs-review"
            className="text-sm font-normal cursor-pointer"
          >
            Include invoices needing review
          </Label>
        </div>

        {/* Preview Table */}
        <div className="flex-1 border rounded-lg overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 bg-muted">#</TableHead>
                  {TALLY_FIELD_CONFIG.map((field) => (
                    <TableHead
                      key={field.key}
                      className={cn(
                        "bg-muted font-semibold whitespace-nowrap",
                        field.isCritical && "text-primary"
                      )}
                    >
                      {field.label}
                      {field.isCritical && (
                        <Badge variant="outline" className="ml-1 h-4 text-[9px] px-1">
                          Critical
                        </Badge>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={TALLY_FIELD_CONFIG.length + 1}
                      className="text-center text-muted-foreground py-8"
                    >
                      No invoices to export
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, index) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      {TALLY_FIELD_CONFIG.map((field) => {
                        const fieldData = invoice.tallyFields[field.key];
                        const needsReview = fieldData.needsReview || isReviewRequired(fieldData.value);

                        return (
                          <TableCell
                            key={field.key}
                            className={cn(
                              "font-mono text-xs",
                              needsReview && "bg-red-50 dark:bg-red-950/10"
                            )}
                          >
                            {needsReview && isReviewRequired(fieldData.value) ? (
                              <span className="font-bold text-red-600 dark:text-red-400">
                                REVIEW REQUIRED
                              </span>
                            ) : (
                              <span className={cn(needsReview && "text-orange-600")}>
                                {fieldData.value || (
                                  <span className="text-muted-foreground italic">Empty</span>
                                )}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Export Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-4">
            <span>
              <strong className="text-foreground">{filteredInvoices.length}</strong> invoice
              {filteredInvoices.length !== 1 ? "s" : ""} to export
            </span>
            <span>•</span>
            <span>
              <strong className="text-foreground">{TALLY_FIELD_CONFIG.length}</strong> columns
            </span>
          </div>
          <span className="text-xs">TallyPrime 4.0 compatible format</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2" disabled={filteredInvoices.length === 0}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
