import { useState, useCallback } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, X, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedFields } from "../backend";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ValidationButtons } from "./ValidationButtons";
import { StateCheckBadge } from "./StateCheckBadge";
import { QuantityBreakdown } from "./QuantityBreakdown";
import {
  TALLY_FIELD_CONFIG,
  convertToTallyFields,
  determineStateCheckStatus,
  calculateQuantityBreakdown,
  type ExtendedTallyFields,
} from "../lib/gst-fields";

interface FieldMapping {
  columnName: string;
  fieldName: string;
  fieldValue: string;
}

interface MappingWorkspaceProps {
  columnHeaders: string[];
  extractedFields: ExtractedFields | null;
  invoicePreviewUrl: string | null;
  mappings: FieldMapping[];
  onMappingCreate: (columnName: string, fieldName: string) => void;
  onMappingRemove: (columnName: string) => void;
  onAutoMap: () => void;
  hasVendorTemplate: boolean;
}

export function MappingWorkspace({
  columnHeaders,
  extractedFields,
  invoicePreviewUrl,
  mappings,
  onMappingCreate,
  onMappingRemove,
  onAutoMap,
  hasVendorTemplate,
}: MappingWorkspaceProps) {
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Get mapping for a column
  const getMappingForColumn = (columnName: string) => {
    return mappings.find((m) => m.columnName === columnName);
  };

  // Handle column selection
  const handleColumnClick = useCallback((columnName: string) => {
    setSelectedColumn(columnName);
    setSelectedField(null);
  }, []);

  // Handle field selection
  const handleFieldClick = useCallback(
    (fieldName: string) => {
      if (!selectedColumn) {
        setSelectedField(fieldName);
        return;
      }

      // Create mapping
      onMappingCreate(selectedColumn, fieldName);
      setSelectedColumn(null);
      setSelectedField(null);
    },
    [selectedColumn, onMappingCreate],
  );

  // Convert extracted fields to TallyPrime format with confidence scores
  const tallyFields: ExtendedTallyFields | null = extractedFields
    ? convertToTallyFields(extractedFields)
    : null;

  // Calculate overall confidence
  const overallConfidence = tallyFields
    ? Object.values(tallyFields).reduce((sum, field) => sum + field.confidence, 0) /
      Object.keys(tallyFields).length
    : 0;

  // Check if any critical field has low confidence (< 0.85)
  const hasCriticalLowConfidence = tallyFields
    ? TALLY_FIELD_CONFIG.filter((config) => config.isCritical).some(
        (config) => tallyFields[config.key].confidence < 0.85
      )
    : false;

  // Determine state check status
  const stateCheckStatus = tallyFields
    ? determineStateCheckStatus(
        tallyFields.cgstAmount.value,
        tallyFields.sgstAmount.value,
        tallyFields.igstAmount.value
      )
    : null;

  // Calculate quantity breakdown
  const quantityBreakdown = tallyFields
    ? calculateQuantityBreakdown(tallyFields.quantity.value)
    : null;

  // Convert TallyPrime fields to display array
  const fieldsArray = tallyFields
    ? TALLY_FIELD_CONFIG.map((config) => ({
        name: config.key,
        label: config.label,
        value: tallyFields[config.key].value,
        confidence: tallyFields[config.key].confidence,
        needsReview: tallyFields[config.key].needsReview || false,
        isCritical: config.isCritical,
        description: config.description,
      }))
    : [];

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
      {/* LEFT PANEL - Excel Columns */}
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="flex flex-col h-full">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Excel Columns</h3>
                <p className="text-xs text-muted-foreground">
                  {mappings.length} of {columnHeaders.length} mapped
                </p>
              </div>
              {hasVendorTemplate && extractedFields && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAutoMap}
                  className="gap-2"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-map
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {columnHeaders.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Upload an Excel template to see columns
                  </p>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column Name</TableHead>
                      <TableHead>Mapped Field</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columnHeaders.map((column) => {
                      const mapping = getMappingForColumn(column);
                      const isSelected = selectedColumn === column;

                      return (
                        <TableRow
                          key={column}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected && "bg-primary/10 border-primary",
                            !isSelected && !mapping && "hover:bg-muted/50",
                          )}
                          onClick={() => handleColumnClick(column)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              )}
                              {column}
                            </div>
                          </TableCell>
                          <TableCell>
                            {mapping ? (
                              <Badge
                                variant="secondary"
                                className="gap-1 font-normal"
                              >
                                <CheckCircle2 className="h-3 w-3 text-success" />
                                {mapping.fieldName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Not mapped
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mapping && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMappingRemove(column);
                                }}
                                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* RIGHT PANEL - Invoice Fields */}
      <ResizablePanel defaultSize={60} minSize={40}>
        <div className="flex flex-col h-full">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Invoice Fields (TallyPrime 4.0 Format)</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedColumn
                    ? `Click a field to map to "${selectedColumn}"`
                    : "Select a column to start mapping"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {extractedFields && (
                  <ConfidenceBadge confidence={overallConfidence} size="sm" />
                )}
                {stateCheckStatus && (
                  <StateCheckBadge status={stateCheckStatus} size="sm" />
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {!extractedFields ? (
                <Card className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Upload an invoice to see extracted fields
                  </p>
                </Card>
              ) : (
                <>
                  {/* Low Confidence Warning */}
                  {hasCriticalLowConfidence && (
                    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-700 dark:text-orange-400">
                        Some critical fields have low confidence. Please review and
                        use validation tools below to improve accuracy.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation Buttons */}
                  <ValidationButtons
                    reviewUrl={null} // TODO: Will come from backend
                    invoiceId={BigInt(0)} // TODO: Will come from backend
                    onSync={undefined} // TODO: Implement sync handler
                  />

                  {/* Invoice Preview (if available) */}
                  {invoicePreviewUrl && (
                    <Card className="overflow-hidden">
                      <div className="aspect-[8.5/11] bg-muted">
                        <iframe
                          src={invoicePreviewUrl}
                          className="w-full h-full"
                          title="Invoice Preview"
                        />
                      </div>
                    </Card>
                  )}

                  {/* Extracted TallyPrime Fields */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        13 TallyPrime 4.0 Fields
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {fieldsArray.filter((f) => f.value).length} of {fieldsArray.length} extracted
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {fieldsArray.map((field) => {
                        const isSelected = selectedField === field.name;
                        const isMapped = mappings.some(
                          (m) => m.fieldName === field.name,
                        );
                        const isLowConfidence =
                          field.isCritical && field.confidence < 0.85;
                        const showReviewRequired = field.needsReview && (!field.value || field.value === "REVIEW REQUIRED");

                        return (
                          <Card
                            key={field.name}
                            className={cn(
                              "p-4 cursor-pointer transition-all border-2",
                              isSelected && "border-primary bg-primary/5",
                              isMapped && "border-success/50 bg-success/5",
                              isLowConfidence &&
                                !isSelected &&
                                "bg-orange-50/50 dark:bg-orange-950/10",
                              !isSelected &&
                                !isMapped &&
                                !isLowConfidence &&
                                "hover:border-primary/50 hover:shadow-sm"
                            )}
                            onClick={() => handleFieldClick(field.name)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {field.label}
                                  </p>
                                  {field.isCritical && (
                                    <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                                      Critical
                                    </Badge>
                                  )}
                                  {isMapped && (
                                    <Badge
                                      variant="outline"
                                      className="gap-1 text-success border-success/50 h-5 text-[10px] px-1.5"
                                    >
                                      <Link2 className="h-2.5 w-2.5" />
                                      Mapped
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 justify-between">
                                  {showReviewRequired ? (
                                    <p className="text-sm font-bold text-red-600 dark:text-red-400 flex-1">
                                      REVIEW REQUIRED
                                    </p>
                                  ) : field.name === "quantity" && quantityBreakdown ? (
                                    <div className="flex-1">
                                      <QuantityBreakdown breakdown={quantityBreakdown} />
                                    </div>
                                  ) : (
                                    <p className="text-sm font-mono flex-1 break-all">
                                      {field.value || (
                                        <span className="text-muted-foreground italic text-xs">
                                          Not detected
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  <ConfidenceBadge
                                    confidence={field.confidence}
                                    showLabel={false}
                                    size="sm"
                                  />
                                </div>

                                <p className="text-[11px] text-muted-foreground">
                                  {field.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
