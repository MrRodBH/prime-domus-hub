import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminStatItem {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}

interface AdminStatsProps {
  items: AdminStatItem[];
  className?: string;
  columns?: 2 | 3 | 4;
}

const toneMap: Record<NonNullable<AdminStatItem["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

export function AdminStats({ items, className, columns = 4 }: AdminStatsProps) {
  const grid =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid grid-cols-1 gap-3", grid, className)}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div key={i} className="rounded-lg border border-border/60 bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</span>
              {Icon ? <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} /> : null}
            </div>
            <div className={cn("mt-1.5 font-display text-2xl leading-tight", toneMap[it.tone ?? "default"])}>{it.value}</div>
            {it.hint ? <div className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
