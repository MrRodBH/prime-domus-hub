import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Barra de ações contextual (filtros + botões primários).
 */
export function AdminToolbar({ left, right, children, className }: AdminToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-2">{left ?? children}</div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}
