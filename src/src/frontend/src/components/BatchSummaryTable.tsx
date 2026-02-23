import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  Edit,
  Trash2,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MappingWorkspace } from "./MappingWorkspace";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { StateCheckBadge } from "./StateCheckBadge";
import { QuantityBreakdown } from "./QuantityBreakdown";
import { useAutoApplyVendorTemplate } from "../hooks/useQueries";
import type { BatchInvoice, ExtractedFields } from "../backend";
import {
  convertToTallyFields,
  determineStateCheckStatus,
  calculateQuantityBreakdown,
  TALLY_FIELD_CONFIG,
} from "../lib/gst-fields";

interface BatchSummaryTableProps {
  batchId: bigint;
  invoices: BatchInvoice[];
  columnHeaders: string[];
  onUpdateMapping: (invoiceId: bigint, fieldMappings: ExtractedFields) => Promise<void>;
  onRefresh: () => void;
}

interface FieldMapping {
  columnName: string;
  fieldName: string;
  fieldValue: string;
}

export function BatchSummaryTable({
  batchId,
  invoices,
  columnHeaders,
  onUpdateMapping,
  onRefresh,
}: BatchSummaryTableProps) {
  const [editingInvoice, setEditingInvoice] = useState<BatchInvoice | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  const autoApplyMutation = useAutoApplyVendorTemplate();

  // Calculate summary stats
  const mapped = invoices.filter(
    (inv) => inv.isAutoMapped || inv.extractedFields,
  ).length;
  const unmapped = invoices.length - mapped;
  const duplicates = invoices.filter((inv) => inv.isDuplicate).length;

  // Get unique vendors
  const vendors = Array.from(new Set(invoices.map((inv) => inv.vendorName))).filter(
    (v) => v,
  );

  // Handle auto-apply for vendor
  const handleAutoApplyVendor = async (vendorName: string) => {
    try {
      const count = await autoApplyMutation.mutateAsync({ batchId, vendorName });
      toast.success(`Auto-mapped ${count.toString()} invoices from ${vendorName}`);
      onRefresh();
    } catch (error) {
      console.error("Auto-apply error:", error);
      toast.error("Failed to auto-apply vendor template");
    }
  };

  // Handle edit mapping
  const handleEditMapping = (invoice: BatchInvoice) => {
    setEditingInvoice(invoice);
    
    // Initialize mappings from extracted fields if available
    if (invoice.extractedFields) {
      const initialMappings: FieldMapping[] = [];
      const fields = invoice.extractedFields;
      
      // Try to auto-match field names to column names
      Object.entries(fields).forEach(([fieldName, fieldValue]) => {
        const matchingColumn = columnHeaders.find(
          (col) =>
            col.toLowerCase().includes(fieldName.toLowerCase()) ||
            fieldName.toLowerCase().includes(col.toLowerCase()),
        );
        if (matchingColumn && typeof fieldValue === "string") {
          initialMappings.push({
            columnName: matchingColumn,
            fieldName,
            fieldValue,
          });
        }
      });
      
      setMappings(initialMappings);
    } else {
      setMappings([]);
    }
  };

  // Handle save mapping
  const handleSaveMapping = async () => {
    if (!editingInvoice) return;

    try {
      const fieldMappings: ExtractedFields = {
        vendorName: "",
        invoiceNumber: "",
        invoiceDate: "",
        gstTaxId: "",
        subtotalAmount: "",
        totalAmount: "",
      };

      mappings.forEach((mapping) => {
        const key = mapping.fieldName as keyof ExtractedFields;
        if (key in fieldMappings) {
          (fieldMappings as any)[key] = mapping.fieldValue;
        }
      });

      await onUpdateMapping(editingInvoice.invoiceId, fieldMappings);
      setEditingInvoice(null);
      setMappings([]);
      toast.success("Mapping updated");
      onRefresh();
    } catch (error) {
      console.error("Save mapping error:", error);
      toast.error("Failed to save mapping");
    }
  };

  // Handle mapping create
  const handleMappingCreate = (columnName: string, fieldName: string) => {
    if (!editingInvoice?.extractedFields) return;

    const fieldValue = (editingInvoice.extractedFields as any)[fieldName] || "";

    setMappings((prev) => {
      const filtered = prev.filter((m) => m.columnName !== columnName);
      return [...filtered, { columnName, fieldName, fieldValue }];
    });
  };

  // Handle mapping remove
  const handleMappingRemove = (columnName: string) => {
    setMappings((prev) => prev.filter((m) => m.columnName !== columnName));
  };

  // Get status for invoice
  const getInvoiceStatus = (invoice: BatchInvoice) => {
    if (invoice.isDuplicate) return "duplicate";
    if (invoice.isAutoMapped || invoice.extractedFields) return "mapped";
    return "unmapped";
  };

  // Calculate confidence for invoice
  const getInvoiceConfidence = (invoice: BatchInvoice): number | null => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    const confidenceValues = Object.values(tallyFields).map((f) => f.confidence);
    return confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length;
  };

  // Get state check status for invoice
  const getStateCheckStatus = (invoice: BatchInvoice) => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return determineStateCheckStatus(
      tallyFields.cgstAmount.value,
      tallyFields.sgstAmount.value,
      tallyFields.igstAmount.value
    );
  };

  // Get quantity breakdown for invoice
  const getQuantityBreakdown = (invoice: BatchInvoice) => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return calculateQuantityBreakdown(tallyFields.quantity.value);
  };

  // Count fields needing review
  const getNeedsReviewCount = (invoice: BatchInvoice): number => {
    if (!invoice.extractedFields) return 0;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return Object.values(tallyFields).filter((f) => f.needsReview).length;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">{mapped} Mapped</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{unmapped} Unmapped</span>
            </div>
            {duplicates > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">{duplicates} Duplicates</span>
              </div>
            )}
          </div>

          {vendors.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Quick Apply:</span>
              {vendors.slice(0, 3).map((vendor) => (
                <Button
                  key={vendor}
                  size="sm"
                  variant="outline"
                  onClick={() => handleAutoApplyVendor(vendor)}
                  className="gap-2 h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {vendor}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Invoice Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Needs Review</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No invoices in this batch
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice, index) => {
                  const status = getInvoiceStatus(invoice);
                  const confidence = getInvoiceConfidence(invoice);
                  const stateCheck = getStateCheckStatus(invoice);
                  const quantityBreakdown = getQuantityBreakdown(invoice);
                  const needsReviewCount = getNeedsReviewCount(invoice);
                  
                  return (
                    <TableRow key={invoice.invoiceId.toString()}>
                      <TableCell className="font-mono text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.vendorName || (
                          <span className="text-muted-foreground italic">
                            Unknown
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoiceNumber || (
                          <span className="text-muted-foreground italic">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status === "duplicate" && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-warning border-warning"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Duplicate
                          </Badge>
                        )}
                        {status === "mapped" && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-success border-success"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {invoice.isAutoMapped ? "Auto" : "Mapped"}
                          </Badge>
                        )}
                        {status === "unmapped" && (
                          <Badge variant="secondary">Unmapped</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {confidence !== null ? (
                          <ConfidenceBadge confidence={confidence} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stateCheck ? (
                          <StateCheckBadge status={stateCheck} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {quantityBreakdown ? (
                          <QuantityBreakdown breakdown={quantityBreakdown} showIcon={false} />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {needsReviewCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              {needsReviewCount} field{needsReviewCount !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMapping(invoice)}
                          className="gap-2"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Invoice Mapping</DialogTitle>
            <DialogDescription>
              Map fields from invoice #{editingInvoice?.invoiceId.toString()} to your
              Excel columns
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {editingInvoice && (
              <MappingWorkspace
                columnHeaders={columnHeaders}
                extractedFields={editingInvoice.extractedFields || null}
                invoicePreviewUrl={null}
                mappings={mappings}
                onMappingCreate={handleMappingCreate}
                onMappingRemove={handleMappingRemove}
                onAutoMap={() => {}}
                hasVendorTemplate={false}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMapping}>Save Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
