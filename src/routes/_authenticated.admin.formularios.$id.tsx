import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  obterFormularioAdmin,
  salvarFormulario,
  salvarCampos,
  listarSubmissoes,
} from "@/lib/api/forms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/formularios/$id")({
  component: FormularioEditPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado</div>,
});

type FieldTipo = "text" | "textarea" | "email" | "phone" | "number" | "date" | "select" | "radio" | "checkbox" | "file" | "hidden";
interface FieldDraft {
  id?: string;
  ordem: number;
  tipo: FieldTipo;
  nome: string;
  label: string;
  placeholder?: string | null;
  ajuda?: string | null;
  obrigatorio: boolean;
  opcoes: Array<{ label: string; value: string }>;
  validacao: { min?: number; max?: number; minLength?: number; maxLength?: number; regex?: string; mascara?: string };
  valor_padrao?: string | null;
  largura: "full" | "half" | "third";
}

function FormularioEditPage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const obterFn = useServerFn(obterFormularioAdmin);
  const salvarFn = useServerFn(salvarFormulario);
  const salvarCamposFn = useServerFn(salvarCampos);

  const { data, isLoading } = useQuery({
    queryKey: ["form-admin", id],
    queryFn: () => obterFn({ data: { id } }),
    enabled: !isNew,
  });

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [descricao, setDescricao] = useState("");
  const [successMessage, setSuccessMessage] = useState("Mensagem enviada! Retornaremos em breve.");
  const [submitLabel, setSubmitLabel] = useState("Enviar");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [notifyEmails, setNotifyEmails] = useState("");
  const [criarLead, setCriarLead] = useState(true);
  const [origemSlug, setOrigemSlug] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [mapNome, setMapNome] = useState("nome");
  const [mapEmail, setMapEmail] = useState("email");
  const [mapTelefone, setMapTelefone] = useState("telefone");
  const [mapMensagem, setMapMensagem] = useState("mensagem");
  const [fields, setFields] = useState<FieldDraft[]>([]);

  useEffect(() => {
    if (isNew) {
      // template padrão
      setFields([
        { ordem: 0, tipo: "text", nome: "nome", label: "Nome", obrigatorio: true, opcoes: [], validacao: {}, largura: "full" },
        { ordem: 1, tipo: "email", nome: "email", label: "E-mail", obrigatorio: true, opcoes: [], validacao: {}, largura: "half" },
        { ordem: 2, tipo: "phone", nome: "telefone", label: "Telefone", obrigatorio: false, opcoes: [], validacao: {}, largura: "half" },
        { ordem: 3, tipo: "textarea", nome: "mensagem", label: "Mensagem", obrigatorio: false, opcoes: [], validacao: {}, largura: "full" },
      ]);
      return;
    }
    if (data) {
      const f = data.form as {
        nome: string; slug: string; status: "draft" | "published" | "archived"; descricao: string | null;
        config: {
          success_message?: string; submit_button_label?: string; redirect_url?: string; notify_emails?: string[];
          criar_lead?: boolean; lead_origem_slug?: string; webhook_url?: string;
          map_nome?: string; map_email?: string; map_telefone?: string; map_mensagem?: string;
        };
      };
      setNome(f.nome);
      setSlug(f.slug);
      setStatus(f.status);
      setDescricao(f.descricao ?? "");
      setSuccessMessage(f.config?.success_message ?? "Mensagem enviada! Retornaremos em breve.");
      setSubmitLabel(f.config?.submit_button_label ?? "Enviar");
      setRedirectUrl(f.config?.redirect_url ?? "");
      setNotifyEmails((f.config?.notify_emails ?? []).join(", "));
      setCriarLead(f.config?.criar_lead ?? true);
      setOrigemSlug(f.config?.lead_origem_slug ?? "");
      setWebhookUrl(f.config?.webhook_url ?? "");
      setMapNome(f.config?.map_nome ?? "nome");
      setMapEmail(f.config?.map_email ?? "email");
      setMapTelefone(f.config?.map_telefone ?? "telefone");
      setMapMensagem(f.config?.map_mensagem ?? "mensagem");
      setFields((data.fields ?? []).map((r) => ({
        id: r.id as string,
        ordem: r.ordem as number,
        tipo: r.tipo as FieldTipo,
        nome: r.nome as string,
        label: r.label as string,
        placeholder: r.placeholder as string | null,
        ajuda: r.ajuda as string | null,
        obrigatorio: r.obrigatorio as boolean,
        opcoes: (r.opcoes as Array<{ label: string; value: string }>) ?? [],
        validacao: (r.validacao as FieldDraft["validacao"]) ?? {},
        valor_padrao: r.valor_padrao as string | null,
        largura: (r.largura as "full" | "half" | "third") ?? "full",
      })));
    }
  }, [isNew, data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const emails = notifyEmails.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await salvarFn({
        data: {
          id: isNew ? undefined : id,
          nome, slug, status, descricao,
          config: {
            success_message: successMessage, submit_button_label: submitLabel,
            redirect_url: redirectUrl || undefined,
            notify_emails: emails,
            criar_lead: criarLead, lead_origem_slug: origemSlug || undefined,
            webhook_url: webhookUrl || undefined,
            map_nome: mapNome, map_email: mapEmail, map_telefone: mapTelefone, map_mensagem: mapMensagem,
          },
        },
      });
      const formId = res.id;
      await salvarCamposFn({
        data: { form_id: formId, fields: fields.map((f, i) => ({ ...f, ordem: i })) },
      });
      return formId;
    },
    onSuccess: (formId) => {
      toast.success("Salvo");
      qc.invalidateQueries({ queryKey: ["forms-admin"] });
      qc.invalidateQueries({ queryKey: ["form-admin", formId] });
      if (isNew) navigate({ to: "/admin/formularios/$id", params: { id: formId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateField(i: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addField() {
    setFields((prev) => [...prev, { ordem: prev.length, tipo: "text", nome: `campo_${prev.length + 1}`, label: "Novo campo", obrigatorio: false, opcoes: [], validacao: {}, largura: "full" }]);
  }
  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveField(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  if (!isNew && isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-serif">{isNew ? "Novo formulário" : nome}</h1>
          {!isNew && (
            <p className="text-xs text-muted-foreground font-mono">
              slug: <button className="underline" onClick={() => { navigator.clipboard.writeText(slug); toast.success("Copiado"); }}>{slug} <Copy className="inline size-3" /></button>
            </p>
          )}
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}Salvar
        </Button>
      </header>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="campos">Campos ({fields.length})</TabsTrigger>
          <TabsTrigger value="destinos">Destinos</TabsTrigger>
          {!isNew && <TabsTrigger value="submissoes">Submissões</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="space-y-4 pt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome interno</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Contato do site" />
            </div>
            <div>
              <Label>Slug (identificador único)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
                placeholder="contato-parcerias"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rótulo do botão de envio</Label>
              <Input value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição (opcional, mostrada acima do formulário)</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Mensagem de sucesso</Label>
              <Input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>URL de redirecionamento após envio (opcional)</Label>
              <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="/obrigado" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campos" className="space-y-3 pt-4">
          {fields.map((f, i) => (
            <FieldEditor
              key={i}
              field={f}
              onChange={(patch) => updateField(i, patch)}
              onRemove={() => removeField(i)}
              onUp={() => moveField(i, -1)}
              onDown={() => moveField(i, 1)}
              first={i === 0}
              last={i === fields.length - 1}
            />
          ))}
          <Button variant="outline" onClick={addField}><Plus className="size-4 mr-2" />Adicionar campo</Button>
        </TabsContent>

        <TabsContent value="destinos" className="space-y-4 pt-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">1. E-mail</h3>
            <Label>E-mails de notificação (separados por vírgula)</Label>
            <Input value={notifyEmails} onChange={(e) => setNotifyEmails(e.target.value)} placeholder="contato@empresa.com, gerente@empresa.com" />
            <p className="text-xs text-muted-foreground">Deixe vazio para não enviar e-mails.</p>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">2. Criar Lead no CRM</h3>
              <Switch checked={criarLead} onCheckedChange={setCriarLead} />
            </div>
            {criarLead && (
              <>
                <div>
                  <Label>Slug da origem (opcional — se não informado, usa "form-{slug || 'seuform'}")</Label>
                  <Input value={origemSlug} onChange={(e) => setOrigemSlug(e.target.value)} placeholder="site-parcerias" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><Label>Mapear "nome" para</Label><Input value={mapNome} onChange={(e) => setMapNome(e.target.value)} /></div>
                  <div><Label>Mapear "email" para</Label><Input value={mapEmail} onChange={(e) => setMapEmail(e.target.value)} /></div>
                  <div><Label>Mapear "telefone" para</Label><Input value={mapTelefone} onChange={(e) => setMapTelefone(e.target.value)} /></div>
                  <div><Label>Mapear "mensagem" para</Label><Input value={mapMensagem} onChange={(e) => setMapMensagem(e.target.value)} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Nome dos campos do formulário que serão usados para preencher o Lead.</p>
              </>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">3. Salvar submissão</h3>
            <p className="text-xs text-muted-foreground">Todas as submissões são sempre gravadas em form_submissions (sem configuração adicional).</p>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-medium">4. Webhook externo (opcional)</h3>
            <Label>URL do webhook</Label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://api.exemplo.com/webhook" />
            <p className="text-xs text-muted-foreground">POST JSON: {`{ form, dados, tenant_id, lead_id }`}</p>
          </div>
        </TabsContent>

        {!isNew && (
          <TabsContent value="submissoes" className="pt-4">
            <SubmissoesList formId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function FieldEditor({
  field, onChange, onRemove, onUp, onDown, first, last,
}: {
  field: FieldDraft;
  onChange: (p: Partial<FieldDraft>) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  first: boolean;
  last: boolean;
}) {
  const needsOptions = field.tipo === "select" || field.tipo === "radio" || field.tipo === "checkbox";
  return (
    <div className="rounded-lg border p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onUp} disabled={first}><ArrowUp className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={onDown} disabled={last}><ArrowDown className="size-3.5" /></Button>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="size-3.5 text-destructive" /></Button>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={field.tipo} onValueChange={(v) => onChange({ tipo: v as FieldTipo })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="textarea">Texto longo</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="select">Select</SelectItem>
              <SelectItem value="radio">Radio</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="file">Arquivo</SelectItem>
              <SelectItem value="hidden">Oculto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nome (chave)</Label>
          <Input value={field.nome} onChange={(e) => onChange({ nome: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_") })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Rótulo</Label>
          <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Placeholder</Label>
          <Input value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
        </div>
        <div>
          <Label>Largura</Label>
          <Select value={field.largura} onValueChange={(v) => onChange({ largura: v as "full" | "half" | "third" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Total</SelectItem>
              <SelectItem value="half">Metade</SelectItem>
              <SelectItem value="third">Terço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Switch id={`req-${field.nome}`} checked={field.obrigatorio} onCheckedChange={(v) => onChange({ obrigatorio: v })} />
          <Label htmlFor={`req-${field.nome}`}>Obrigatório</Label>
        </div>
      </div>
      {needsOptions && (
        <div>
          <Label>Opções (uma por linha, formato: rótulo|valor)</Label>
          <Textarea
            rows={3}
            value={field.opcoes.map((o) => `${o.label}|${o.value}`).join("\n")}
            onChange={(e) => {
              const opcoes = e.target.value.split("\n").map((line) => {
                const [label, value] = line.split("|");
                return { label: (label ?? "").trim(), value: (value ?? label ?? "").trim() };
              }).filter((o) => o.label);
              onChange({ opcoes });
            }}
            placeholder={"Opção A|a\nOpção B|b"}
          />
        </div>
      )}
      <div className="grid sm:grid-cols-4 gap-3 text-xs">
        <div><Label>Min length</Label><Input type="number" value={field.validacao.minLength ?? ""} onChange={(e) => onChange({ validacao: { ...field.validacao, minLength: e.target.value ? Number(e.target.value) : undefined } })} /></div>
        <div><Label>Max length</Label><Input type="number" value={field.validacao.maxLength ?? ""} onChange={(e) => onChange({ validacao: { ...field.validacao, maxLength: e.target.value ? Number(e.target.value) : undefined } })} /></div>
        <div className="sm:col-span-2"><Label>Regex (opcional)</Label><Input value={field.validacao.regex ?? ""} onChange={(e) => onChange({ validacao: { ...field.validacao, regex: e.target.value } })} /></div>
      </div>
    </div>
  );
}

function SubmissoesList({ formId }: { formId: string }) {
  const listarFn = useServerFn(listarSubmissoes);
  const { data, isLoading } = useQuery({
    queryKey: ["form-submissoes", formId],
    queryFn: () => listarFn({ data: { form_id: formId, page: 0, pageSize: 50 } }),
  });
  if (isLoading) return <Loader2 className="animate-spin" />;
  if (!data || data.items.length === 0) return <p className="text-muted-foreground text-sm">Nenhuma submissão ainda.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{data.total} submissão(ões)</p>
      {data.items.map((s) => (
        <details key={s.id as string} className="border rounded-md p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {new Date(s.created_at as string).toLocaleString("pt-BR")}
            {s.utm_source ? <span className="ml-2 text-xs text-muted-foreground">UTM: {String(s.utm_source)}</span> : null}
          </summary>
          <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">{JSON.stringify(s.dados, null, 2)}</pre>
        </details>
      ))}
    </div>
  );
}
