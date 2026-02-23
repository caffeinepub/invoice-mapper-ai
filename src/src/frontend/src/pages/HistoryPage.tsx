import { useState } from "react";
import { FileText, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetInvoices } from "../hooks/useQueries";
import { formatTime } from "../lib/excel-utils";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { StateCheckBadge } from "../components/StateCheckBadge";
import { QuantityBreakdown } from "../components/QuantityBreakdown";
import {
  convertToTallyFields,
  determineStateCheckStatus,
  calculateQuantityBreakdown,
  TALLY_FIELD_CONFIG,
} from "../lib/gst-fields";
import type { InvoiceProcessingResult } from "../backend";

export function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: invoices = [], isLoading } = useGetInvoices();

  // Filter invoices by search query
  const filteredInvoices = invoices.filter((invoice) => {
    const query = searchQuery.toLowerCase();
    return (
      invoice.vendorName.toLowerCase().includes(query) ||
      invoice.extractedFields?.invoiceNumber?.toLowerCase().includes(query)
    );
  });

  // Sort by invoice ID (most recent first)
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    return Number(b.invoiceId - a.invoiceId);
  });

  // Calculate confidence for invoice
  const getInvoiceConfidence = (invoice: InvoiceProcessingResult): number | null => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    const confidenceValues = Object.values(tallyFields).map((f) => f.confidence);
    return confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length;
  };

  // Get state check status
  const getStateCheckStatus = (invoice: InvoiceProcessingResult) => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return determineStateCheckStatus(
      tallyFields.cgstAmount.value,
      tallyFields.sgstAmount.value,
      tallyFields.igstAmount.value
    );
  };

  // Get quantity breakdown
  const getQuantityBreakdown = (invoice: InvoiceProcessingResult) => {
    if (!invoice.extractedFields) return null;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return calculateQuantityBreakdown(tallyFields.quantity.value);
  };

  // Count fields needing review
  const getNeedsReviewCount = (invoice: InvoiceProcessingResult): number => {
    if (!invoice.extractedFields) return 0;
    
    const tallyFields = convertToTallyFields(invoice.extractedFields);
    return Object.values(tallyFields).filter((f) => f.needsReview).length;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice History</h1>
          <p className="text-muted-foreground mt-1">
            View all processed invoices and their extraction status
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by vendor name or invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Badge variant="secondary">
            {sortedInvoices.length} invoice{sortedInvoices.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Invoice List */}
        {sortedInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-muted p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {searchQuery ? "No invoices found" : "No invoices yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Upload and process your first invoice in the Mapper"}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedInvoices.map((invoice) => {
              const isSuccess = invoice.status.__kind__ === "success";
              const fields = invoice.extractedFields;
              const confidence = getInvoiceConfidence(invoice);
              const stateCheck = getStateCheckStatus(invoice);
              const quantityBreakdown = getQuantityBreakdown(invoice);
              const needsReviewCount = getNeedsReviewCount(invoice);
              const tallyFields = fields ? convertToTallyFields(fields) : null;

              return (
                <Card
                  key={invoice.invoiceId.toString()}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`rounded-lg p-3 ${
                          isSuccess
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {invoice.vendorName || "Unknown Vendor"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge
                                variant={isSuccess ? "default" : "destructive"}
                              >
                                {isSuccess ? "Success" : "Failed"}
                              </Badge>
                              {fields?.invoiceNumber && (
                                <span className="text-sm text-muted-foreground">
                                  #{fields.invoiceNumber}
                                </span>
                              )}
                              {confidence !== null && (
                                <ConfidenceBadge confidence={confidence} size="sm" />
                              )}
                              {stateCheck && (
                                <StateCheckBadge status={stateCheck} size="sm" />
                              )}
                              {needsReviewCount > 0 && (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  {needsReviewCount} needs review
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Extracted TallyPrime Fields */}
                        {isSuccess && tallyFields && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                              {/* Voucher Date */}
                              {tallyFields.voucherDate.value && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    Voucher Date
                                  </p>
                                  <p className={cn(
                                    "font-medium",
                                    tallyFields.voucherDate.needsReview && "text-orange-600"
                                  )}>
                                    {tallyFields.voucherDate.value}
                                  </p>
                                </div>
                              )}
                              
                              {/* GSTIN/UIN Party */}
                              {tallyFields.gstinUinParty.value && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    GSTIN/UIN Party
                                  </p>
                                  <p className={cn(
                                    "font-mono text-xs",
                                    tallyFields.gstinUinParty.needsReview && "text-orange-600 font-bold"
                                  )}>
                                    {tallyFields.gstinUinParty.value === "REVIEW REQUIRED" ? (
                                      <span className="text-red-600 font-bold">REVIEW REQUIRED</span>
                                    ) : (
                                      tallyFields.gstinUinParty.value
                                    )}
                                  </p>
                                </div>
                              )}
                              
                              {/* Quantity with breakdown */}
                              {quantityBreakdown && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    Quantity
                                  </p>
                                  <QuantityBreakdown breakdown={quantityBreakdown} showIcon={false} />
                                </div>
                              )}
                              
                              {/* Total Taxable Value */}
                              {tallyFields.totalTaxableValue.value && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    Total Taxable Value
                                  </p>
                                  <p className={cn(
                                    "font-medium",
                                    tallyFields.totalTaxableValue.needsReview && "text-orange-600"
                                  )}>
                                    ₹{tallyFields.totalTaxableValue.value}
                                  </p>
                                </div>
                              )}
                              
                              {/* CGST Amount */}
                              {tallyFields.cgstAmount.value !== "0.00" && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    CGST Amount
                                  </p>
                                  <p className={cn(
                                    "font-medium",
                                    tallyFields.cgstAmount.needsReview && "text-orange-600"
                                  )}>
                                    ₹{tallyFields.cgstAmount.value}
                                  </p>
                                </div>
                              )}
                              
                              {/* SGST Amount */}
                              {tallyFields.sgstAmount.value !== "0.00" && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    SGST Amount
                                  </p>
                                  <p className={cn(
                                    "font-medium",
                                    tallyFields.sgstAmount.needsReview && "text-orange-600"
                                  )}>
                                    ₹{tallyFields.sgstAmount.value}
                                  </p>
                                </div>
                              )}
                              
                              {/* IGST Amount */}
                              {tallyFields.igstAmount.value !== "0.00" && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    IGST Amount
                                  </p>
                                  <p className={cn(
                                    "font-medium",
                                    tallyFields.igstAmount.needsReview && "text-orange-600"
                                  )}>
                                    ₹{tallyFields.igstAmount.value}
                                  </p>
                                </div>
                              )}
                              
                              {/* Total Invoice Value */}
                              {tallyFields.totalInvoiceValue.value && (
                                <div>
                                  <p className="text-muted-foreground text-xs">
                                    Total Invoice Value
                                  </p>
                                  <p className="font-semibold text-base">
                                    ₹{tallyFields.totalInvoiceValue.value}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Error message */}
                        {!isSuccess && invoice.status.__kind__ === "fail" && (
                          <p className="text-sm text-destructive">
                            {invoice.status.fail}
                          </p>
                        )}

                        {/* Invoice ID as timestamp proxy */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Invoice ID: {invoice.invoiceId.toString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
