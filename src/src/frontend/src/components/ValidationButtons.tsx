import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface ValidationButtonsProps {
  reviewUrl?: string | null;
  invoiceId: bigint;
  onSync?: (invoiceId: bigint) => Promise<void>;
  className?: string;
}

export function ValidationButtons({
  reviewUrl,
  invoiceId,
  onSync,
  className,
}: ValidationButtonsProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOpenReviewTool = () => {
    if (!reviewUrl) {
      toast.error("No review URL available");
      return;
    }

    // Open Affinda validation interface in new tab
    window.open(reviewUrl, "_blank", "noopener,noreferrer");
    toast.info("Review tool opened in new tab", {
      description: "Make corrections in Affinda, then click 'Sync Corrected Data'",
    });
  };

  const handleSync = async () => {
    if (!onSync) {
      // TODO: Backend function not yet implemented
      toast.info("Sync function coming soon", {
        description: "This feature will re-fetch corrected data from Affinda.",
      });
      return;
    }

    try {
      setIsSyncing(true);
      await onSync(invoiceId);
      toast.success("Invoice data refreshed successfully", {
        description: "Updated with human-verified data from Affinda",
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync corrected data", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {reviewUrl && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenReviewTool}
          className="gap-2 border-primary/50 hover:bg-primary/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Review Tool
        </Button>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={isSyncing}
        className="gap-2"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
        {isSyncing ? "Syncing..." : "Sync Corrected Data"}
      </Button>
    </div>
  );
}
