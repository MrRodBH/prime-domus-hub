// FormBuilderEditor — construtor de campos (Bloco 3.1). Minimal editor de fields
// (nome, tipo, obrigatório). Config avançada é editada no próprio schema.
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useContentSession } from "../session";

type Field = {
  id?: string; ordem: number; tipo: string; nome: string; label: string;
  placeholder?: string | null; obrigatorio: boolean;
  opcoes: Array<{ label: string; value: string }>; validacao: Record<string, unknown>;
  largura: "full" | "half" | "third"; valor_padrao?: string | null;
};

const TIPOS = ["text", "textarea", "email", "phone", "number", "date", "select", "radio", "checkbox", "file", "hidden"];

export function FormBuilderEditor() {
  const s = useContentSession();
  const data = s.draft.data as { fields?: Field[]; config?: Record<string, unknown> };
  const fields: Field[] = data.fields ?? [];
  const config = data.config ?? {};

  function update(fs: Field[]) { s.updateData({ fields: fs.map((f, i) => ({ ...f, ordem: i })) }); }
  function add() {
    update([...fields, {
      ordem: fields.length, tipo: "text", nome: `campo_${fields.length + 1}`,
      label: "Novo campo", obrigatorio: false, opcoes: [], validacao: {}, largura: "full",
    }]);
  }
  function move(i: number, dir: -1 | 1) {
    const t = i + dir; if (t < 0 || t >= fields.length) return;
    const arr = [...fields]; [arr[i], arr[t]] = [arr[t], arr[i]]; update(arr);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Configuração geral</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Mensagem de sucesso</Label>
            <Input value={(config.success_message as string) ?? ""} onChange={(e) => s.updateData({ config: { ...config, success_message: e.target.value } })} />
          </div>
          <div><Label>Rótulo do botão</Label>
            <Input value={(config.submit_button_label as string) ?? ""} onChange={(e) => s.updateData({ config: { ...config, submit_button_label: e.target.value } })} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Switch checked={!!config.criar_lead} onCheckedChange={(v) => s.updateData({ config: { ...config, criar_lead: v } })} />
            <span className="text-sm">Criar Lead no CRM ao submeter</span>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Campos ({fields.length})</h3>
          <Button size="sm" variant="outline" onClick={add}><Plus className="size-3 mr-1" /> Campo</Button>
        </div>
        {fields.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">Nenhum campo ainda.</div>
        )}
        {fields.map((f, i) => (
          <div key={i} className="rounded-md border border-foreground/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
              <div className="flex gap-0.5">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, 1)} disabled={i === fields.length - 1}><ArrowDown className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => update(fields.filter((_, j) => j !== i))}><Trash2 className="size-3.5 text-destructive" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome (interno)" value={f.nome} onChange={(e) => { const c = [...fields]; c[i] = { ...f, nome: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }; update(c); }} />
              <Input placeholder="Label" value={f.label} onChange={(e) => { const c = [...fields]; c[i] = { ...f, label: e.target.value }; update(c); }} />
              <Select value={f.tipo} onValueChange={(v) => { const c = [...fields]; c[i] = { ...f, tipo: v }; update(c); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2">
                <Switch checked={f.obrigatorio} onCheckedChange={(v) => { const c = [...fields]; c[i] = { ...f, obrigatorio: v }; update(c); }} />
                <span className="text-xs">Obrigatório</span>
              </label>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
