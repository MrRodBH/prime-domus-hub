import { ReactNode } from "react";
import { Inbox, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function AdminEmptyState({ icon: Icon = Inbox, title, description, action, className }: AdminEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      <div className="size-12 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
