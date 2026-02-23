import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 to 1.0
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  showLabel = true,
  size = "md",
  className,
}: ConfidenceBadgeProps) {
  const getConfidenceLevel = () => {
    if (confidence >= 0.85) return "high"; // Changed from 0.9 to match 0.85 threshold
    if (confidence >= 0.6) return "medium";
    return "low";
  };

  const level = getConfidenceLevel();

  const config = {
    high: {
      label: "High confidence (≥85%)",
      shortLabel: "High",
      icon: CheckCircle2,
      colors: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20",
      dotColor: "bg-green-500",
    },
    medium: {
      label: "Medium confidence (60-84%) - verify recommended",
      shortLabel: "Medium",
      icon: AlertTriangle,
      colors: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20",
      dotColor: "bg-orange-500",
    },
    low: {
      label: "Low confidence (<60%) - review required",
      shortLabel: "Low",
      icon: AlertCircle,
      colors: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20",
      dotColor: "bg-red-500",
    },
  };

  const { label, shortLabel, icon: Icon, colors, dotColor } = config[level];

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
      title={`${(confidence * 100).toFixed(0)}% confidence - ${label}`}
    >
      <span className={cn("rounded-full", dotColor, dotSize[size])} />
      <Icon className={iconSize[size]} />
      {showLabel && <span>{shortLabel}</span>}
      {!showLabel && (
        <span className="sr-only">{label}</span>
      )}
    </Badge>
  );
}

// Utility component for field-level confidence display
export function FieldConfidenceBadge({
  fieldName,
  confidence,
  className,
}: {
  fieldName: string;
  confidence: number;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <ConfidenceBadge confidence={confidence} showLabel={false} size="sm" />
      <span className="text-xs text-muted-foreground">
        {(confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
}
