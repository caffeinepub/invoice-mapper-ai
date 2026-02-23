import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StateCheckStatus } from "../lib/gst-fields";

interface StateCheckBadgeProps {
  status: StateCheckStatus;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
  className?: string;
}

export function StateCheckBadge({
  status,
  size = "md",
  showDescription = false,
  className,
}: StateCheckBadgeProps) {
  const config = {
    IntraState: {
      label: "Intra-state",
      fullLabel: "Intra-state (CGST/SGST)",
      description: "Seller and buyer in same state - CGST/SGST apply",
      icon: CheckCircle2,
      colors: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20",
      dotColor: "bg-green-500",
    },
    InterState: {
      label: "Inter-state",
      fullLabel: "Inter-state (IGST)",
      description: "Seller and buyer in different states - IGST applies",
      icon: Info,
      colors: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20",
      dotColor: "bg-blue-500",
    },
    Mismatch: {
      label: "Mismatch",
      fullLabel: "Mismatch - Review Required",
      description: "State codes don't match tax distribution - verify manually",
      icon: AlertCircle,
      colors: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20",
      dotColor: "bg-red-500",
    },
  };

  const { label, fullLabel, description, icon: Icon, colors, dotColor } = config[status];

  const sizeClasses = {
    sm: "h-5 gap-1 text-xs px-1.5",
    md: "h-6 gap-1.5 text-xs px-2",
    lg: "h-7 gap-2 text-sm px-3",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const dotSize = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal inline-flex items-center",
        colors,
        sizeClasses[size],
        className
      )}
      title={description}
    >
      <span className={cn("rounded-full", dotColor, dotSize[size])} />
      <Icon className={iconSize[size]} />
      <span>{showDescription ? fullLabel : label}</span>
    </Badge>
  );
}
