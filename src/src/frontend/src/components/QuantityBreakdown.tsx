import { Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { QuantityBreakdown as QuantityBreakdownType } from "../lib/gst-fields";

interface QuantityBreakdownProps {
  breakdown: QuantityBreakdownType;
  className?: string;
  showIcon?: boolean;
}

export function QuantityBreakdown({
  breakdown,
  className,
  showIcon = true,
}: QuantityBreakdownProps) {
  const { qty, free, total } = breakdown;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-1.5 cursor-help", className)}>
            {showIcon && <Calculator className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium">{total}</span>
            <span className="text-xs text-muted-foreground">units</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-semibold">Quantity Breakdown:</p>
            <div className="font-mono space-y-0.5">
              <p>Qty: {qty}</p>
              <p>Free: {free}</p>
              <p className="border-t pt-0.5">Total: {total}</p>
            </div>
            <p className="text-muted-foreground italic text-[10px] pt-1">
              (Qty + Free calculation)
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Simplified text-only version for table cells
export function QuantityBreakdownText({
  breakdown,
  className,
}: {
  breakdown: QuantityBreakdownType;
  className?: string;
}) {
  const { qty, free, total } = breakdown;

  return (
    <div className={cn("font-mono text-sm", className)}>
      <span className="font-semibold">{total}</span>
      <span className="text-xs text-muted-foreground ml-2">
        (Qty: {qty} + Free: {free})
      </span>
    </div>
  );
}
