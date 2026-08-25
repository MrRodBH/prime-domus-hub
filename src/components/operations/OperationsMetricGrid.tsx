import {
  Activity,
  BellRing,
  CalendarDays,
  ContactRound,
  Gauge,
  ShieldCheck,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationsMetric } from "./operations-read-model";

const ICONS: Record<string, LucideIcon> = {
  contacts: ContactRound,
  calendar: CalendarDays,
  visits: Activity,
  proposals: Sparkles,
  automation: Workflow,
  sla: Gauge,
  alerts: BellRing,
  capabilities: ShieldCheck,
};

const TONES: Record<OperationsMetric["tone"], string> = {
  brand: "bg-primary/10 text-primary ring-primary/15",
  info: "bg-state-info/10 text-state-info ring-state-info/15",
  success: "bg-state-success/10 text-state-success ring-state-success/15",
  warning: "bg-state-warning/10 text-state-warning ring-state-warning/15",
};

export function OperationsMetricGrid({ metrics }: { metrics: readonly OperationsMetric[] }) {
  return (
    <section
      className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8"
      aria-label="Resumo operacional"
    >
      {metrics.map((metric) => {
        const Icon = ICONS[metric.key] ?? Activity;
        return (
          <article
            key={metric.key}
            className="min-w-0 rounded-2xl border border-border bg-workspace-elevated p-3.5 shadow-soft transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <div
              className={cn(
                "mb-3 flex size-8 items-center justify-center rounded-lg ring-1",
                TONES[metric.tone],
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" strokeWidth={1.8} />
            </div>
            <p className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <h2 className="mt-0.5 truncate text-xs font-semibold text-foreground">
              {metric.label}
            </h2>
            <p className="mt-1 truncate text-[10px] text-muted-foreground" title={metric.detail}>
              {metric.detail}
            </p>
          </article>
        );
      })}
    </section>
  );
}
