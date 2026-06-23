import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminImportarUnidades } from "@/lib/api/lancamentos.functions";

type UnitTipo = "1_quarto" | "2_quartos" | "3_quartos" | "4_quartos_mais" | "cobertura" | "garden";
type UnitStatus = "disponivel" | "reservada" | "vendida" | "indisponivel";

type ParsedRow = {
  unidade: number;
  bloco: string | null;
  area: number | null;
  tipo: UnitTipo | null;
  vagas: number | null;
  valor: number | null;
  status: UnitStatus;
  ativa: boolean;
  __error?: string;
};

type Props = { open: boolean; onOpenChange: (o: boolean) => void; projectId: string };

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  unidade: "unidade", "nº": "unidade", "n°": "unidade", numero: "unidade", número: "unidade", apt: "unidade", apartamento: "unidade",
  bloco: "bloco", torre: "bloco",
  area: "area", área: "area", "area (m2)": "area", "área (m²)": "area", m2: "area", "m²": "area",
  tipo: "tipo",
  vagas: "vagas", garagem: "vagas",
  valor: "valor", preço: "valor", preco: "valor", "preço (r$)": "valor", "valor (r$)": "valor",
};

const TIPO_NORM: Record<string, UnitTipo> = {
  "1 quarto": "1_quarto", "1q": "1_quarto",
  "2 quartos": "2_quartos", "2q": "2_quartos",
  "3 quartos": "3_quartos", "3q": "3_quartos",
  "4 quartos": "4_quartos_mais", "4 quartos +": "4_quartos_mais", "4+": "4_quartos_mais", "4q": "4_quartos_mais",
  cobertura: "cobertura", "cob": "cobertura",
  garden: "garden",
};

function normHeader(s: string) { return s.toString().trim().toLowerCase(); }
function normTipo(s: string | null): UnitTipo | null {
  if (!s) return null;
  return TIPO_NORM[s.toString().trim().toLowerCase()] ?? null;
}
function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = v.toString().trim().replace(/r\$\s?/i, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function ImportarUnidadesDialog({ open, onOpenChange, projectId }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);

  function reset() { setRows([]); if (fileRef.current) fileRef.current.value = ""; }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      const parsed: ParsedRow[] = raw.map((obj) => {
        const out: Partial<ParsedRow> = { status: "disponivel", ativa: true };
        for (const [k, v] of Object.entries(obj)) {
          const key = HEADER_MAP[normHeader(k)];
          if (!key) continue;
          if (key === "unidade") out.unidade = Number(parseNum(v) ?? 0);
          else if (key === "bloco") {
            const s = v == null ? null : v.toString().trim();
            out.bloco = s ? (/^\d+$/.test(s) ? s : s.toUpperCase()) : null;
          }
          else if (key === "area") out.area = parseNum(v);
          else if (key === "vagas") out.vagas = parseNum(v) == null ? null : Math.trunc(parseNum(v)!);
          else if (key === "valor") out.valor = parseNum(v);
          else if (key === "tipo") out.tipo = normTipo(v as string | null);
        }
        const row: ParsedRow = {
          unidade: out.unidade ?? 0,
          bloco: out.bloco ?? null,
          area: out.area ?? null,
          tipo: out.tipo ?? null,
          vagas: out.vagas ?? null,
          valor: out.valor ?? null,
          status: "disponivel",
          ativa: true,
        };
        if (!row.unidade || row.unidade <= 0) row.__error = "Unidade inválida";
        return row;
      });
      setRows(parsed);
      toast.success(`${parsed.length} linha(s) lida(s)`);
    } catch (err) {
      toast.error(`Falha ao ler arquivo: ${(err as Error).message}`);
    } finally {
      setParsing(false);
    }
  }

  const importar = useMutation({
    mutationFn: () => adminImportarUnidades({
      data: {
        project_id: projectId,
        rows: rows.filter((r) => !r.__error).map((r) => ({
          unidade: r.unidade,
          bloco: r.bloco,
          area: r.area,
          tipo: r.tipo,
          vagas: r.vagas,
          valor: r.valor,
          status: r.status,
          ativa: r.ativa,
        })),
      },
    }),
    onSuccess: (r) => {
      toast.success(`${r.inserted} unidade(s) importada(s)`);
      qc.invalidateQueries({ queryKey: ["admin", "lancamento", projectId, "units"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validos = rows.filter((r) => !r.__error).length;
  const invalidos = rows.length - validos;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar unidades (XLSX / CSV)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground bg-secondary/40 rounded-md p-3">
            <strong>Colunas reconhecidas:</strong> Unidade, Bloco, Área (m²), Tipo, Vagas, Valor.
            <br />
            <strong>Tipo aceito:</strong> 1 Quarto, 2 Quartos, 3 Quartos, 4 Quartos+, Cobertura, Garden.
            <br />
            Valores aceitam formato brasileiro (ex: <code>1.250.000,00</code>) ou número puro.
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Upload className="size-4 mr-1" />}
              Escolher arquivo
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            {rows.length > 0 && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5 text-green-600" /> {validos} válida(s)</span>
                {invalidos > 0 && <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3.5 text-amber-600" /> {invalidos} com erro</span>}
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="max-h-[50vh] overflow-auto border border-foreground/5 rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Unid.</TableHead>
                    <TableHead>Bloco</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Vagas</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r.__error ? "bg-amber-50" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{r.unidade || "—"}</TableCell>
                      <TableCell>{r.bloco ?? "—"}</TableCell>
                      <TableCell>{r.tipo ?? "—"}</TableCell>
                      <TableCell>{r.area ?? "—"}</TableCell>
                      <TableCell>{r.vagas ?? "—"}</TableCell>
                      <TableCell>{r.valor != null ? r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>
                      <TableCell>{r.__error ? <span className="text-amber-700 text-xs">{r.__error}</span> : <span className="text-green-700 text-xs inline-flex items-center gap-1"><FileSpreadsheet className="size-3" /> OK</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button type="button" disabled={validos === 0 || importar.isPending} onClick={() => importar.mutate()}>
            {importar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Importar {validos > 0 ? `${validos} unidade(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
