import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  adminListarUnidades,
  adminSalvarUnidade,
  adminExcluirUnidade,
  adminAlternarUnidadeAtiva,
} from "@/lib/api/lancamentos.functions";
import { ImportarUnidadesDialog } from "@/components/admin/ImportarUnidadesDialog";

type UnitTipo = "1_quarto" | "2_quartos" | "3_quartos" | "4_quartos_mais" | "cobertura" | "garden";
type UnitStatus = "disponivel" | "reservada" | "vendida" | "indisponivel";

type Unit = {
  id: string;
  project_id: string;
  unidade: number;
  bloco: string | null;
  area: number | null;
  tipo: UnitTipo | null;
  vagas: number | null;
  valor: number | null;
  status: UnitStatus;
  ativa: boolean;
};

const TIPOS: { value: UnitTipo; label: string }[] = [
  { value: "1_quarto", label: "1 Quarto" },
  { value: "2_quartos", label: "2 Quartos" },
  { value: "3_quartos", label: "3 Quartos" },
  { value: "4_quartos_mais", label: "4 Quartos +" },
  { value: "cobertura", label: "Cobertura" },
  { value: "garden", label: "Garden" },
];
const STATUS: { value: UnitStatus; label: string; cls: string }[] = [
  { value: "disponivel", label: "Disponível", cls: "bg-green-100 text-green-700" },
  { value: "reservada", label: "Reservada", cls: "bg-amber-100 text-amber-700" },
  { value: "vendida", label: "Vendida", cls: "bg-red-100 text-red-700" },
  { value: "indisponivel", label: "Indisponível", cls: "bg-secondary" },
];

const tipoLabel = (t: UnitTipo | null) => TIPOS.find((x) => x.value === t)?.label ?? "—";
const statusInfo = (s: UnitStatus) => STATUS.find((x) => x.value === s) ?? STATUS[0];

function fmtBRL(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function UnidadesLancamento({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Unit> | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["admin", "lancamento", projectId, "units"],
    queryFn: () => adminListarUnidades({ data: { project_id: projectId } }),
  });

  const salvar = useMutation({
    mutationFn: (u: Partial<Unit>) =>
      adminSalvarUnidade({
        data: {
          id: u.id,
          project_id: projectId,
          unidade: Number(u.unidade ?? 0),
          bloco: u.bloco || null,
          area: u.area ?? null,
          tipo: u.tipo ?? null,
          vagas: u.vagas ?? null,
          valor: u.valor ?? null,
          status: (u.status ?? "disponivel") as UnitStatus,
          ativa: u.ativa ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Unidade salva");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "units"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => adminExcluirUnidade({ data: { id } }),
    onSuccess: () => {
      toast.success("Unidade excluída");
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "units"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: (u: Unit) => adminAlternarUnidadeAtiva({ data: { id: u.id, ativa: !u.ativa } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "units"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-medium">Unidades</h2>
          <p className="text-xs text-muted-foreground">{units.length} cadastrada(s)</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setImporting(true)}>
            Importar XLSX/CSV
          </Button>
          <Button type="button" size="sm" onClick={() => setEditing({ status: "disponivel", ativa: true })}>
            <Plus className="size-4 mr-1" /> Nova unidade
          </Button>
        </div>
      </div>

      <div className="border border-foreground/5 rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unid.</TableHead>
              <TableHead>Bloco</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Área (m²)</TableHead>
              <TableHead>Vagas</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && units.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Nenhuma unidade ainda.</TableCell></TableRow>
            )}
            {units.map((u) => {
              const si = statusInfo(u.status);
              return (
                <TableRow key={u.id} className={u.ativa ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{u.unidade}</TableCell>
                  <TableCell>{u.bloco ?? "—"}</TableCell>
                  <TableCell>{tipoLabel(u.tipo)}</TableCell>
                  <TableCell>{u.area ? Number(u.area).toFixed(2).replace(".", ",") : "—"}</TableCell>
                  <TableCell>{u.vagas ?? "—"}</TableCell>
                  <TableCell>{fmtBRL(u.valor)}</TableCell>
                  <TableCell><span className={`text-[10px] px-2 py-0.5 rounded ${si.cls}`}>{si.label}</span></TableCell>
                  <TableCell>{u.ativa ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title={u.ativa ? "Desativar" : "Ativar"} onClick={() => alternar.mutate(u)}>
                        <Power className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(u)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => { if (confirm(`Excluir unidade ${u.unidade}?`)) remover.mutate(u.id); }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog editar/criar */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar unidade" : "Nova unidade"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => { e.preventDefault(); salvar.mutate(editing); }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-1.5">
                <Label>Unidade (nº) *</Label>
                <Input type="number" required value={editing.unidade ?? ""} onChange={(e) => setEditing({ ...editing, unidade: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bloco (letra/nome/nº)</Label>
                <Input value={editing.bloco ?? ""} onChange={(e) => {
                  const v = e.target.value;
                  // Se for inteiro puro, mantém. Se for texto, MAIÚSCULAS.
                  const next = /^\d+$/.test(v.trim()) ? v.trim() : v.toUpperCase();
                  setEditing({ ...editing, bloco: next });
                }} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.tipo ?? ""} onChange={(e) => setEditing({ ...editing, tipo: (e.target.value || null) as UnitTipo | null })}>
                  <option value="">—</option>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Área (m²)</Label>
                <Input type="number" step="0.01" value={editing.area ?? ""} onChange={(e) => setEditing({ ...editing, area: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Vagas</Label>
                <Input type="number" value={editing.vagas ?? ""} onChange={(e) => setEditing({ ...editing, vagas: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={editing.valor ?? ""} onChange={(e) => setEditing({ ...editing, valor: e.target.value === "" ? null : Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.status ?? "disponivel"} onChange={(e) => setEditing({ ...editing, status: e.target.value as UnitStatus })}>
                  {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 flex items-end">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.ativa ?? true} onChange={(e) => setEditing({ ...editing, ativa: e.target.checked })} />
                  Unidade ativa
                </label>
              </div>

              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ImportarUnidadesDialog open={importing} onOpenChange={setImporting} projectId={projectId} />
    </section>
  );
}
