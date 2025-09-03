import { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        {children}
      </div>
      
      {/* Mobile view - will be replaced by card-based layout in parent components */}
      <div className="md:hidden">
        {children}
      </div>
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  className?: string;
}

export function MobileCard({ children, className }: MobileCardProps) {
  return (
    <Card className={cn(
      "p-4 mb-3 space-y-2",
      className
    )}>
      {children}
    </Card>
  );
}

interface MobileFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function MobileField({ label, value, className }: MobileFieldProps) {
  return (
    <div className={cn("flex justify-between items-start gap-2", className)}>
      <span className="text-xs text-muted-foreground font-medium min-w-[80px]">
        {label}:
      </span>
      <span className="text-sm font-medium text-right flex-1">
        {value}
      </span>
    </div>
  );
}

export function MobileActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
      {children}
    </div>
  );
}