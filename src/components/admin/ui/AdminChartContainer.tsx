import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminChartContainerProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}

export function AdminChartContainer({ title, description, actions, children, className, height = 280 }: AdminChartContainerProps) {
  return (
    <section className={cn("rounded-lg border border-border/60 bg-card", className)}>
      {(title || actions) ? (
        <header className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div>
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-5" style={{ height }}>{children}</div>
    </section>
  );
}
