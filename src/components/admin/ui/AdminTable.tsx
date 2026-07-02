import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminEmptyState } from "./AdminEmptyState";
import { cn } from "@/lib/utils";

export interface AdminTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function AdminTable<T>({
  columns, rows, rowKey, onRowClick,
  emptyTitle = "Nenhum registro",
  emptyDescription,
  emptyAction,
  className,
  loading,
}: AdminTableProps<T>) {
  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!rows.length) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }
  return (
    <div className={cn("rounded-lg border border-border/60 bg-card overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>{c.cell(r)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
