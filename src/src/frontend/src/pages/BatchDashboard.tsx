import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Archive,
  Download,
  FolderOpen,
  Calendar,
  FileText,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetBatches,
  useCreateBatch,
  useArchiveBatch,
  useGetBatchDetails,
} from "../hooks/useQueries";
import { formatTime } from "../lib/excel-utils";
import { BatchStatus } from "../backend";
import type { Batch } from "../backend";

interface BatchCardProps {
  batch: Batch;
  onOpen: (batchId: bigint) => void;
  onArchive?: (batchId: bigint) => void;
  onExport?: (batchId: bigint) => void;
}

function BatchCard({ batch, onOpen, onArchive, onExport }: BatchCardProps) {
  const { data: batchDetails } = useGetBatchDetails(batch.batchId);
  
  // Calculate vendor breakdown
  const vendorBreakdown = new Map<string, number>();
  if (batchDetails?.invoices) {
    batchDetails.invoices.forEach((invoice) => {
      const count = vendorBreakdown.get(invoice.vendorName) || 0;
      vendorBreakdown.set(invoice.vendorName, count + 1);
    });
  }

  const vendorList = Array.from(vendorBreakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([vendor, count]) => `${vendor} (${count})`)
    .join(", ");

  const isActive = batch.status === BatchStatus.active;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Batch #{batch.batchId.toString()}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatTime(batch.createdAt)}
            </div>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Archived"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {batch.invoiceCount.toString()}/50 invoices
            </span>
          </div>
          
          {vendorList && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Vendors:</span> {vendorList}
              {vendorBreakdown.size > 3 && ` + ${vendorBreakdown.size - 3} more`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen(batch.batchId)}
            className="flex-1 gap-2"
          >
            <FolderOpen className="h-3 w-3" />
            Open
          </Button>

          {isActive && onArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onArchive(batch.batchId)}
              className="gap-2"
            >
              <Archive className="h-3 w-3" />
              Archive
            </Button>
          )}

          {isActive && onExport && (
            <Button
              size="sm"
              onClick={() => onExport(batch.batchId)}
              className="gap-2"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">{icon}</div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

export function BatchDashboard() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Queries
  const { data: activeBatches = [], isLoading: loadingActive } = useGetBatches(
    BatchStatus.active,
  );
  const { data: archivedBatches = [], isLoading: loadingArchived } = useGetBatches(
    BatchStatus.archived,
  );

  // Mutations
  const createBatchMutation = useCreateBatch();
  const archiveBatchMutation = useArchiveBatch();

  // Handlers
  const handleCreateBatch = async () => {
    try {
      const batchId = await createBatchMutation.mutateAsync();
      toast.success("New batch created");
      
      // Navigate to mapper page with batch mode
      // Store batchId in sessionStorage for MapperPage to pick up
      sessionStorage.setItem("currentBatchId", batchId.toString());
      window.location.hash = "#mapper";
    } catch (error) {
      console.error("Create batch error:", error);
      toast.error("Failed to create batch");
    }
  };

  const handleOpenBatch = (batchId: bigint) => {
    sessionStorage.setItem("currentBatchId", batchId.toString());
    window.location.hash = "#mapper";
  };

  const handleArchiveBatch = async (batchId: bigint) => {
    try {
      await archiveBatchMutation.mutateAsync(batchId);
      toast.success("Batch archived");
    } catch (error) {
      console.error("Archive batch error:", error);
      toast.error("Failed to archive batch");
    }
  };

  const handleExportBatch = (batchId: bigint) => {
    sessionStorage.setItem("currentBatchId", batchId.toString());
    sessionStorage.setItem("batchExportMode", "true");
    window.location.hash = "#mapper";
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Batch Processing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process multiple invoices at once with smart vendor mapping
          </p>
        </div>
        <Button onClick={handleCreateBatch} className="gap-2">
          <Plus className="h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Layers className="h-4 w-4" />
            Active ({activeBatches.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archived ({archivedBatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {loadingActive ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading batches...
            </div>
          ) : activeBatches.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8 text-muted-foreground" />}
              title="No active batches"
              description="Create a new batch to start processing multiple invoices at once"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeBatches.map((batch) => (
                <BatchCard
                  key={batch.batchId.toString()}
                  batch={batch}
                  onOpen={handleOpenBatch}
                  onArchive={handleArchiveBatch}
                  onExport={handleExportBatch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {loadingArchived ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading archived batches...
            </div>
          ) : archivedBatches.length === 0 ? (
            <EmptyState
              icon={<Archive className="h-8 w-8 text-muted-foreground" />}
              title="No archived batches"
              description="Batches that have been exported will appear here"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedBatches.map((batch) => (
                <BatchCard
                  key={batch.batchId.toString()}
                  batch={batch}
                  onOpen={handleOpenBatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
