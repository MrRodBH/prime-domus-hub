import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Bloco de conteúdo dentro de uma página Admin (card semântico).
 */
export function AdminSection({ title, description, actions, children, className, contentClassName }: AdminSectionProps) {
  return (
    <section className={cn("rounded-lg border border-border/60 bg-card", className)}>
      {(title || actions) ? (
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border/60">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}
