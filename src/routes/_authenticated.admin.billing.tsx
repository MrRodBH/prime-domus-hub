import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: TenantBillingPage,
});

function TenantBillingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-semibold">Plano e billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Superfície BCR-01 em modo de teste. Autoridade comercial permanece no servidor.
        </p>
        <div className="mt-3 flex gap-2">
          <Badge variant="outline">test mode</Badge>
          <Badge variant="outline">sem cobrança real</Badge>
        </div>
      </header>
    </div>
  );
}
