import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminFormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Agrupador semântico de campos de formulário Admin.
 */
export function AdminFormSection({ title, description, children, className }: AdminFormSectionProps) {
  return (
    <section className={cn("grid gap-4 sm:grid-cols-[220px_1fr] py-6 border-b border-border/60 last:border-0", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
