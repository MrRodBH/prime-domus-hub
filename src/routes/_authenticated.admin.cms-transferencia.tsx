import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  exportarCms,
  importarCms,
  listarSnapshots,
  restaurarSnapshot,
} from "@/lib/api/cms-transfer.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Archive, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/cms-transferencia")({
  component: TransferPage,
});

const ENTITIES = [
  { key: "pages", label: "Páginas" },
  { key: "forms", label: "Formulários (+ campos)" },
  { key: "campaigns", label: "Banners & Popups" },
  { key: "menu", label: "Menu do site" },
  { key: "settings", label: "Site & Branding" },
  { key: "media", label: "Mídias (metadados)" },
] as const;

type EntityKey = typeof ENTITIES[number]["key"];

function TransferPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<EntityKey, boolean>>(
    () => Object.fromEntries(ENTITIES.map((e) => [e.key, true])) as Record<EntityKey, boolean>,
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; motivo: string } | null>(null);

  const snapshots = useQuery({ queryKey: ["cms-snapshots"], queryFn: () => listarSnapshots() });

  const activeEntities = () => ENTITIES.filter((e) => selected[e.key]).map((e) => e.key);

  const doExport = useMutation({
    mutationFn: async () => {
      const entities = activeEntities();
      if (!entities.length) throw new Error("Selecione ao menos uma entidade.");
      return exportarCms({ data: { entities } });
    },
    onSuccess: (bundle) => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `cms-bundle-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Exportação concluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doImport = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Selecione um arquivo .json.");
      const text = await importFile.text();
      let bundle: unknown;
      try { bundle = JSON.parse(text); } catch { throw new Error("Arquivo JSON inválido."); }
      const entities = activeEntities();
      return importarCms({
        data: {
          bundle: bundle as Record<string, unknown>,
          mode: importMode,
          entities: entities.length ? entities : undefined,
        },
      });
    },
    onSuccess: (r) => {
      const counts = r.counts ?? {};
      const summary = Object.entries(counts).map(([k, v]) => {
        const c = v as { inserted: number; updated: number; deleted: number };
        return `${k}: +${c.inserted} ~${c.updated} -${c.deleted}`;
      }).join(" • ");
      toast.success(`Importação concluída. ${summary || ""}`, { duration: 8000 });
      qc.invalidateQueries({ queryKey: ["cms-snapshots"] });
      setImportFile(null); setConfirmReplace(false);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doRestore = useMutation({
    mutationFn: (id: string) => restaurarSnapshot({ data: { id } }),
    onSuccess: () => {
      toast.success("Snapshot restaurado.");
      qc.invalidateQueries({ queryKey: ["cms-snapshots"] });
      setRestoreTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <AdminPageHeader
          eyebrow="CMS"
          title="Transferência de Conteúdo CMS"
        />
<p className="text-sm text-muted-foreground mt-1">
          Exporte todo o conteúdo do site em um único pacote JSON, importe em outro ambiente
          e — se necessário — reverta uma importação usando o snapshot automático.
        </p>
      </div>

      {/* SELEÇÃO DE ESCOPO */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Escopo</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ENTITIES.map((e) => (
            <label key={e.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected[e.key]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [e.key]: Boolean(v) }))}
              />
              {e.label}
            </label>
          ))}
        </div>
      </section>

      {/* EXPORTAR */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Download className="size-4" /> Exportar</h2>
        <p className="text-xs text-muted-foreground">
          Gera um arquivo <code>.json</code> com o conteúdo do tenant atual (somente metadados
          para Mídias — os arquivos binários não são copiados).
        </p>
        <Button onClick={() => doExport.mutate()} disabled={doExport.isPending}>
          <Download className="size-4 mr-2" /> {doExport.isPending ? "Exportando…" : "Baixar bundle"}
        </Button>
      </section>

      {/* IMPORTAR */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Upload className="size-4" /> Importar</h2>
        <div className="space-y-2">
          <Label className="text-xs">Arquivo bundle (.json)</Label>
          <input
            ref={fileRef}
            type="file" accept="application/json"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Modo</Label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-md border border-foreground/10 has-[:checked]:border-petroleum has-[:checked]:bg-petroleum/5">
              <input type="radio" checked={importMode === "merge"} onChange={() => setImportMode("merge")} className="mt-1" />
              <div>
                <div className="font-medium">Mesclar (recomendado)</div>
                <div className="text-xs text-muted-foreground">
                  Insere novos registros e atualiza os existentes pela chave natural
                  (slug para páginas/formulários, key para configurações). Nunca apaga.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-md border border-foreground/10 has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
              <input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} className="mt-1" />
              <div>
                <div className="font-medium flex items-center gap-1">
                  <AlertTriangle className="size-3 text-destructive" /> Substituir tudo
                </div>
                <div className="text-xs text-muted-foreground">
                  Apaga todo o conteúdo das entidades selecionadas e reinsere a partir do bundle.
                  Gera automaticamente um snapshot para rollback.
                </div>
              </div>
            </label>
          </div>
        </div>

        {importMode === "replace" && (
          <label className="flex items-center gap-2 text-xs text-destructive">
            <Checkbox checked={confirmReplace} onCheckedChange={(v) => setConfirmReplace(Boolean(v))} />
            Confirmo que quero <b>apagar e substituir</b> o conteúdo das entidades selecionadas.
          </label>
        )}

        <Button
          onClick={() => doImport.mutate()}
          disabled={
            doImport.isPending ||
            !importFile ||
            (importMode === "replace" && !confirmReplace)
          }
          variant={importMode === "replace" ? "destructive" : "default"}
        >
          <Upload className="size-4 mr-2" />
          {doImport.isPending ? "Importando…" : importMode === "replace" ? "Substituir agora" : "Mesclar agora"}
        </Button>
      </section>

      {/* SNAPSHOTS */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><RotateCcw className="size-4" /> Snapshots / Rollback</h2>
        <p className="text-xs text-muted-foreground">
          Cada importação em modo "Substituir" salva o estado anterior aqui. Você pode
          restaurar a qualquer momento — a restauração também gera um novo snapshot.
        </p>
        <div className="rounded-md border border-foreground/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criado em</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Contagem</TableHead>
                <TableHead>Restaurado</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(snapshots.data ?? []).map((s: { id: string; motivo: string; escopo: unknown; contagem: unknown; created_at: string; restored_at: string | null }) => {
                const escopo = Array.isArray(s.escopo) ? (s.escopo as string[]) : [];
                const contagem = (s.contagem ?? {}) as Record<string, number>;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{s.motivo}</TableCell>
                    <TableCell className="text-xs">
                      {escopo.map((e) => <Badge key={e} variant="outline" className="mr-1 mb-1">{e}</Badge>)}
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {Object.entries(contagem).map(([k, n]) => `${k}:${n}`).join(" ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.restored_at
                        ? <Badge variant="secondary">{new Date(s.restored_at).toLocaleString("pt-BR")}</Badge>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline"
                        onClick={() => setRestoreTarget({ id: s.id, motivo: s.motivo })}>
                        <RotateCcw className="size-3 mr-1" /> Restaurar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!snapshots.data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum snapshot ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Restaurar snapshot?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isto irá <b>substituir</b> o conteúdo atual das entidades do snapshot pela versão
            armazenada. Um novo snapshot do estado atual será criado antes da substituição,
            permitindo desfazer novamente.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={doRestore.isPending}
              onClick={() => restoreTarget && doRestore.mutate(restoreTarget.id)}
            >
              {doRestore.isPending ? "Restaurando…" : "Restaurar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
