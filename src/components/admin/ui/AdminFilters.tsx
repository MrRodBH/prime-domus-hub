import { ReactNode } from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminFiltersProps {
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function AdminFilters({ children, className, showIcon = true }: AdminFiltersProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2", className)}>
      {showIcon ? <Filter className="size-3.5 text-muted-foreground" strokeWidth={1.5} /> : null}
      {children}
    </div>
  );
}
