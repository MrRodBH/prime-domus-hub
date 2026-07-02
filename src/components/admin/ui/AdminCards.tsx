import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminCardsProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function AdminCards({ children, className, columns = 3 }: AdminCardsProps) {
  const grid =
    columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return <div className={cn("grid grid-cols-1 gap-3", grid, className)}>{children}</div>;
}

interface AdminCardProps {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AdminCard({ title, description, footer, children, className, onClick }: AdminCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border/60 bg-card p-4 text-left flex flex-col gap-2",
        onClick && "hover:border-border transition-colors cursor-pointer",
        className,
      )}
    >
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
      {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
    </Tag>
  );
}
