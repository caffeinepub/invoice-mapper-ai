import { useState, useEffect } from "react";
import { useActor } from "@/hooks/useActor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, RotateCcw, AlertTriangle, Trash, Clock } from "lucide-react";
import { toast } from "sonner";

interface TrashedInvoice {
  invoiceId: bigint;
  vendorName: string;
  status: { __kind__: "success" | "fail"; fail?: string };
  extractedFields?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: string;
  };
  invoiceStatus: { __kind__: "active" | "trash" };
  deletedAt?: bigint;
}

const THIRTY_DAYS_NANOS = BigInt(30 * 24 * 60 * 60 * 1_000_000_000);

function calculateDaysRemaining(deletedAt: bigint | undefined): number {
  if (!deletedAt) return 30;
  
  const now = BigInt(Date.now()) * BigInt(1_000_000); // Convert ms to nanoseconds
  const age = now - deletedAt;
  const daysOld = Number(age / BigInt(24 * 60 * 60 * 1_000_000_000));
  const daysRemaining = 30 - daysOld;
  
  return Math.max(0, Math.floor(daysRemaining));
}

export function TrashPage() {
  const { actor, isFetching } = useActor();
  const [trashedInvoices, setTrashedInvoices] = useState<TrashedInvoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<bigint>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  // Load trashed invoices
  useEffect(() => {
    if (!actor || isFetching) return;

    const loadTrashedInvoices = async () => {
      try {
        setIsLoading(true);
        
        // @ts-ignore - Backend function may not exist yet
        if (typeof actor.getTrashedInvoices !== 'function') {
          console.warn("Backend function getTrashedInvoices not available yet");
          setTrashedInvoices([]);
          return;
        }

        // @ts-ignore
        const invoices = await actor.getTrashedInvoices();
        setTrashedInvoices(invoices || []);
      } catch (error) {
        console.error("Failed to load trashed invoices:", error);
        toast.error("Failed to load trash", {
          description: "Please try refreshing the page"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTrashedInvoices();
  }, [actor, isFetching]);

  const handleSelectAll = () => {
    if (selectedIds.size === trashedInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trashedInvoices.map((inv) => inv.invoiceId)));
    }
  };

  const handleSelectOne = (id: bigint) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRestore = async (ids: bigint[]) => {
    if (!actor || ids.length === 0) return;

    try {
      setIsRestoring(true);
      
      // @ts-ignore - Backend function may not exist yet
      if (typeof actor.restoreFromTrash !== 'function') {
        throw new Error("Backend function restoreFromTrash not available yet");
      }

      // @ts-ignore
      await actor.restoreFromTrash(ids.map(id => Number(id)));
      
      toast.success(`Restored ${ids.length} invoice${ids.length > 1 ? 's' : ''}`, {
        description: "Invoice(s) moved back to active status"
      });

      // Refresh list
      setTrashedInvoices((prev) => prev.filter((inv) => !ids.includes(inv.invoiceId)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to restore invoices:", error);
      toast.error("Failed to restore", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!actor) return;

    try {
      setIsEmptying(true);
      
      // @ts-ignore - Backend function may not exist yet
      if (typeof actor.emptyTrash !== 'function') {
        throw new Error("Backend function emptyTrash not available yet");
      }

      // @ts-ignore
      await actor.emptyTrash();
      
      toast.success("Trash emptied", {
        description: "All trashed invoices have been permanently deleted"
      });

      setTrashedInvoices([]);
      setSelectedIds(new Set());
      setShowEmptyDialog(false);
    } catch (error) {
      console.error("Failed to empty trash:", error);
      toast.error("Failed to empty trash", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsEmptying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trash</h1>
              <p className="text-sm text-muted-foreground">
                Deleted invoices are kept for 30 days before permanent removal
              </p>
            </div>
          </div>

          {trashedInvoices.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowEmptyDialog(true)}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Empty Trash
            </Button>
          )}
        </div>

        {/* Auto-cleanup Info */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Items in trash are automatically deleted after 30 days. A cleanup job runs every 24 hours.
          </AlertDescription>
        </Alert>

        {/* Empty State */}
        {trashedInvoices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Trash2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Trash is empty</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Deleted invoices will appear here and can be restored within 30 days.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trashed Invoices Table */}
        {trashedInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trashed Invoices ({trashedInvoices.length})</CardTitle>
              <CardDescription>
                {selectedIds.size > 0 ? (
                  <span>
                    {selectedIds.size} selected
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleRestore(Array.from(selectedIds))}
                      disabled={isRestoring}
                      className="ml-2 h-auto p-0"
                    >
                      {isRestoring ? "Restoring..." : "Restore selected"}
                    </Button>
                  </span>
                ) : (
                  "Select invoices to restore or permanently delete"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === trashedInvoices.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Expires In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trashedInvoices.map((invoice) => {
                      const daysRemaining = calculateDaysRemaining(invoice.deletedAt);
                      const isExpiringSoon = daysRemaining <= 7;
                      
                      return (
                        <TableRow key={invoice.invoiceId.toString()}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(invoice.invoiceId)}
                              onCheckedChange={() => handleSelectOne(invoice.invoiceId)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.vendorName}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {invoice.extractedFields?.invoiceNumber || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.extractedFields?.invoiceDate || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.extractedFields?.totalAmount || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={isExpiringSoon ? "destructive" : "secondary"}
                              className="gap-1"
                            >
                              {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
                              {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore([invoice.invoiceId])}
                              disabled={isRestoring}
                              className="gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Note */}
        {trashedInvoices.length === 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                <strong>Note for developers:</strong> If this page shows "Backend function not available" errors, 
                the backend needs to be updated to include trash system functions. 
                See <code className="px-1 py-0.5 rounded bg-muted">IMPLEMENTATION_STATUS.md</code> for details.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Permanently Delete All Items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {trashedInvoices.length} invoice{trashedInvoices.length > 1 ? 's' : ''} from trash.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEmptying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isEmptying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
