import { ArrowDownRight, ArrowUpRight, CalendarCheck, FileText, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardMetricReadModel } from "./dashboard-read-model";

const ICONS = {
  leads: Users,
  visits: CalendarCheck,
  proposals: FileText,
  sales: Trophy,
};

const TONES = {
  info: "from-sky-500/18 text-sky-700 dark:text-sky-300",
  success: "from-emerald-500/18 text-emerald-700 dark:text-emerald-300",
  warning: "from-amber-500/18 text-amber-700 dark:text-amber-300",
  brand: "from-primary/18 text-primary",
};

export function DashboardMetricGrid({ metrics }: { metrics: DashboardMetricReadModel[] }) {
  return (
    <section aria-labelledby="dashboard-summary-heading">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Pulso comercial
          </p>
          <h2 id="dashboard-summary-heading" className="mt-1 text-lg font-semibold text-foreground">
            Resumo executivo
          </h2>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Read model server-owned
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = ICONS[metric.key as keyof typeof ICONS] ?? Users;
          const isDelta = metric.key === "leads";
          const deltaUp = isDelta && !metric.detail.startsWith("-");
          const DeltaIcon = deltaUp ? ArrowUpRight : ArrowDownRight;
          return (
            <article
              key={metric.key}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-2xl border border-border bg-gradient-to-br via-workspace-elevated to-workspace-elevated p-4 shadow-soft sm:p-5",
                TONES[metric.tone],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/75 ring-1 ring-border">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                {isDelta ? (
                  <DeltaIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                ) : null}
              </div>
              <p className="mt-5 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {metric.formattedValue}
              </p>
              <h3 className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">
                {metric.label}
              </h3>
              <p className="mt-2 min-h-8 text-xs leading-4 text-muted-foreground">
                {metric.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
