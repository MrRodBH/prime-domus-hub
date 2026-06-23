import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminObterCondicoesPagamento,
  adminSalvarCondicoesPagamento,
} from "@/lib/api/lancamentos.functions";

type Form = {
  entrada: string;
  sinal: string;
  parcela_30: string;
  parcela_60: string;
  parcela_90: string;
  num_parcelas: string;
  valor_parcela: string;
  qtd_anuais: string;
  valor_anual: string;
  qtd_semestrais: string;
  valor_semestral: string;
  observacoes: string;
};

const empty: Form = {
  entrada: "", sinal: "", parcela_30: "", parcela_60: "", parcela_90: "",
  num_parcelas: "", valor_parcela: "",
  qtd_anuais: "", valor_anual: "",
  qtd_semestrais: "", valor_semestral: "",
  observacoes: "",
};

const num = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };
const numOrNull = (s: string) => { if (s === "") return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CondicoesPagamento({ projectId }: { projectId: string }) {
  const [form, setForm] = useState<Form>(empty);

  const { data: row } = useQuery({
    queryKey: ["admin", "lancamento", projectId, "pc"],
    queryFn: () => adminObterCondicoesPagamento({ data: { project_id: projectId } }),
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      entrada: row.entrada?.toString() ?? "",
      sinal: row.sinal?.toString() ?? "",
      parcela_30: row.parcela_30?.toString() ?? "",
      parcela_60: row.parcela_60?.toString() ?? "",
      parcela_90: row.parcela_90?.toString() ?? "",
      num_parcelas: row.num_parcelas?.toString() ?? "",
      valor_parcela: row.valor_parcela?.toString() ?? "",
      qtd_anuais: row.qtd_anuais?.toString() ?? "",
      valor_anual: row.valor_anual?.toString() ?? "",
      qtd_semestrais: row.qtd_semestrais?.toString() ?? "",
      valor_semestral: row.valor_semestral?.toString() ?? "",
      observacoes: row.observacoes ?? "",
    });
  }, [row]);

  const qtdAnuais = num(form.qtd_anuais);
  const qtdSemestrais = num(form.qtd_semestrais);

  const total = useMemo(() => {
    return (
      num(form.entrada) +
      num(form.sinal) +
      num(form.parcela_30) +
      num(form.parcela_60) +
      num(form.parcela_90) +
      num(form.num_parcelas) * num(form.valor_parcela) +
      qtdAnuais * num(form.valor_anual) +
      qtdSemestrais * num(form.valor_semestral)
    );
  }, [form, qtdAnuais, qtdSemestrais]);

  const salvar = useMutation({
    mutationFn: () => adminSalvarCondicoesPagamento({
      data: {
        project_id: projectId,
        entrada: numOrNull(form.entrada),
        sinal: num(form.sinal),
        parcela_30: numOrNull(form.parcela_30),
        parcela_60: numOrNull(form.parcela_60),
        parcela_90: numOrNull(form.parcela_90),
        num_parcelas: num(form.num_parcelas),
        valor_parcela: num(form.valor_parcela),
        qtd_anuais: numOrNull(form.qtd_anuais),
        valor_anual: qtdAnuais === 0 ? null : numOrNull(form.valor_anual),
        qtd_semestrais: numOrNull(form.qtd_semestrais),
        valor_semestral: qtdSemestrais === 0 ? null : numOrNull(form.valor_semestral),
        observacoes: form.observacoes || null,
      },
    }),
    onSuccess: () => toast.success("Condições salvas"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-medium">Condições de pagamento</h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="font-display text-xl text-gold">{fmtBRL(total)}</p>
          </div>
          <Button type="button" size="sm" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Entrada (opcional)" value={form.entrada} onChange={(v) => setForm({ ...form, entrada: v })} />
        <Field label="Sinal de contrato *" value={form.sinal} onChange={(v) => setForm({ ...form, sinal: v })} required />
        <Field label="30 dias (opcional)" value={form.parcela_30} onChange={(v) => setForm({ ...form, parcela_30: v })} />
        <Field label="60 dias (opcional)" value={form.parcela_60} onChange={(v) => setForm({ ...form, parcela_60: v })} />
        <Field label="90 dias (opcional)" value={form.parcela_90} onChange={(v) => setForm({ ...form, parcela_90: v })} />
        <div />

        <Field label="Nº de parcelas *" value={form.num_parcelas} onChange={(v) => setForm({ ...form, num_parcelas: v })} integer required />
        <Field label="Valor da parcela *" value={form.valor_parcela} onChange={(v) => setForm({ ...form, valor_parcela: v })} required />
        <div />

        <Field label="Qtd. anuais" value={form.qtd_anuais} onChange={(v) => setForm({ ...form, qtd_anuais: v })} integer />
        <Field label="Valor anual" value={form.valor_anual} onChange={(v) => setForm({ ...form, valor_anual: v })} disabled={qtdAnuais === 0} />
        <div />

        <Field label="Qtd. semestrais" value={form.qtd_semestrais} onChange={(v) => setForm({ ...form, qtd_semestrais: v })} integer />
        <Field label="Valor semestral" value={form.valor_semestral} onChange={(v) => setForm({ ...form, valor_semestral: v })} disabled={qtdSemestrais === 0} />
        <div />
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          placeholder="Reajuste, condições especiais, etc."
          rows={3}
        />
      </div>

      <div className="rounded-md bg-secondary/40 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Linha label="Entrada" v={num(form.entrada)} />
        <Linha label="Sinal" v={num(form.sinal)} />
        <Linha label="30/60/90 dias" v={num(form.parcela_30) + num(form.parcela_60) + num(form.parcela_90)} />
        <Linha label={`${num(form.num_parcelas)} × parcelas`} v={num(form.num_parcelas) * num(form.valor_parcela)} />
        {qtdAnuais > 0 && <Linha label={`${qtdAnuais} × anual`} v={qtdAnuais * num(form.valor_anual)} />}
        {qtdSemestrais > 0 && <Linha label={`${qtdSemestrais} × semestral`} v={qtdSemestrais * num(form.valor_semestral)} />}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, required, disabled, integer }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; disabled?: boolean; integer?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step={integer ? "1" : "0.01"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
function Linha({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{fmtBRL(v)}</p>
    </div>
  );
}
