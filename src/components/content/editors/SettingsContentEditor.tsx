import { normalizePublicNavigationUrl } from "@/lib/public-content-security";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Eye, Loader2, RefreshCw } from "lucide-react";
import { useContentSession } from "../session";
import {
  CONFIGURATION_REGISTRY,
  type ConfigurationDefinition,
  type ConfigurationDomain,
} from "@/lib/api/configuration-registry";
import {
  getTenantConfigurationDiagnostics,
  previewTenantConfiguration,
} from "@/lib/api/tenant-configuration.functions";
import { listarMidias } from "@/lib/api/media.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DOMAIN_HELP: Record<ConfigurationDomain, string> = {
  identity: "Identidade pública e institucional do tenant.",
  branding: "Logos e imagens são referências UUID persistidas na biblioteca de mídias do tenant.",
  visual: "Tokens visuais validados. CSS, HTML e JavaScript arbitrários não são aceitos.",
  contact: "Canais de atendimento, localização e horários.",
  social: "Somente destinos HTTPS e hosts sociais catalogados.",
  seo: "Metadados padrão. Canonical host permanece pendente da DCA-01.",
  legal: "Referências legais e preferências de privacidade; nenhum texto jurídico é gerado como autoridade.",
  catalog: "Comportamento de exibição do catálogo sem alterar authorization boundaries.",
  lead_capture: "Contrato de captação e consentimento.",
  header_footer: "Única autoridade para cabeçalho, rodapé e menus.",
  analytics: "Somente identificadores públicos. Tokens e secrets são proibidos.",
  future_activation: "Estados vinculantes de ativações futuras; somente leitura.",
  legacy_content: "Conteúdo estruturado das páginas existentes e arquivo de migração auditável.",
};

export function SettingsContentEditor() {
  const session = useContentSession();
  const data = session.draft.data as {
    domain?: ConfigurationDomain;
    value?: Record<string, unknown>;
    expectedRevision?: number;
    configurationStatus?: string;
    publishedRevision?: number;
    draftRevision?: number | null;
  };
  const domain = data.domain;
  const value = data.value ?? {};
  const diagnosticsFn = useServerFn(getTenantConfigurationDiagnostics);
  const previewFn = useServerFn(previewTenantConfiguration);

  const diagnostics = useQuery({
    queryKey: ["tenant-configuration-diagnostics"],
    queryFn: () => diagnosticsFn(),
    retry: false,
  });
  const preview = useQuery({
    queryKey: ["tenant-configuration-preview", session.previewNonce],
    queryFn: () => previewFn(),
    enabled: false,
    retry: false,
  });

  const definitions = useMemo(
    () => domain ? CONFIGURATION_REGISTRY.filter((definition) => definition.domain === domain) : [],
    [domain],
  );

  if (!domain) {
    return <ConfigurationError message="Domínio de configuração ausente." onRetry={() => session.reset()} />;
  }

  const update = (key: string, next: unknown) => {
    session.updateData({ value: { ...value, [key]: next } });
  };

  async function handlePreview() {
    await session.flush();
    await preview.refetch();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Configurações do website</div>
            <h2 className="mt-1 text-xl font-semibold">{session.draft.titulo}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{DOMAIN_HELP[domain]}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={data.configurationStatus === "draft" ? "secondary" : "outline"}>
              {data.configurationStatus === "draft" ? "Rascunho" : data.configurationStatus === "published" ? "Publicado" : "Não publicado"}
            </Badge>
            <Badge variant="outline">publicada r{data.publishedRevision ?? 0}</Badge>
            {data.draftRevision ? <Badge variant="outline">rascunho r{data.draftRevision}</Badge> : null}
          </div>
        </div>
      </div>

      {domain === "future_activation" ? <FutureActivationNotice /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {definitions.map((definition) => (
          <ConfigurationField
            key={definition.key}
            definition={definition}
            value={value[definition.key]}
            onChange={(next) => update(definition.key, next)}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Preview validado</h3>
              <p className="text-xs text-muted-foreground">Salva o rascunho antes de preparar a prévia. Não publica.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handlePreview()} disabled={preview.isFetching || session.save === "saving"}>
              {preview.isFetching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Eye className="mr-2 size-4" />}
              Gerar preview
            </Button>
          </div>
          {preview.isError ? (
            <ConfigurationError message={(preview.error as Error).message} onRetry={() => void handlePreview()} compact />
          ) : preview.data ? (
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {preview.data.valid ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-destructive" />}
                <span>{preview.data.valid ? `Preview ${preview.data.source} válido` : "Preview inválido"}</span>
              </div>
              {preview.data.errors.map((error) => <p key={error} className="text-destructive">{error}</p>)}
              {preview.data.configuration ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px]">{JSON.stringify(preview.data.configuration, null, 2)}</pre>
              ) : null}
            </div>
          ) : <p className="mt-4 text-xs text-muted-foreground">Estado: previewing disponível.</p>}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Diagnósticos</h3>
              <p className="text-xs text-muted-foreground">Autoridade, registry, mídia e gates futuros.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void diagnostics.refetch()} disabled={diagnostics.isFetching}>
              <RefreshCw className={`mr-2 size-4 ${diagnostics.isFetching ? "animate-spin" : ""}`} /> Tentar novamente
            </Button>
          </div>
          {diagnostics.isPending ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> loading</div>
          ) : diagnostics.isError ? (
            <ConfigurationError message={(diagnostics.error as Error).message} onRetry={() => void diagnostics.refetch()} compact />
          ) : diagnostics.data ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Registry</dt><dd>{diagnostics.data.registryKeyCount} keys</dd>
              <dt className="text-muted-foreground">Validação</dt><dd>{diagnostics.data.valid ? "valid" : "invalid"}</dd>
              <dt className="text-muted-foreground">Draft</dt><dd>{diagnostics.data.draftPresent ? "present" : "empty"}</dd>
              <dt className="text-muted-foreground">Publicada</dt><dd>{diagnostics.data.publishedPresent ? `r${diagnostics.data.publishedRevision}` : "missing"}</dd>
              <dt className="text-muted-foreground">Secrets inline</dt><dd>{diagnostics.data.secretsAccepted ? "accepted" : "denied"}</dd>
              <dt className="text-muted-foreground">Client tenant authority</dt><dd>{diagnostics.data.clientTenantAuthority ? "enabled" : "false"}</dd>
              <dt className="text-muted-foreground">Domain</dt><dd>{diagnostics.data.domainActivation}</dd>
              <dt className="text-muted-foreground">Cloudflare</dt><dd>{diagnostics.data.cloudflareMode}</dd>
              <dt className="text-muted-foreground">Billing</dt><dd>{diagnostics.data.billingActivation}</dd>
              <dt className="text-muted-foreground">UX final</dt><dd>{diagnostics.data.finalVisualRefinement}</dd>
            </dl>
          ) : null}
          {diagnostics.data?.errors.map((error) => <p key={error} className="mt-2 text-xs text-destructive">{error}</p>)}
        </div>
      </div>
    </div>
  );
}

function ConfigurationField({
  definition,
  value,
  onChange,
}: {
  definition: ConfigurationDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const readonly = definition.editAuthority === "system" || definition.uiControl === "readonly" || definition.key === "legacy_settings_archive";
  const id = `configuration-${definition.key}`;

  return (
    <div className={`rounded-lg border bg-card p-4 ${definition.uiControl === "json" ? "lg:col-span-2" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <Label htmlFor={id}>{definition.label}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{definition.description}</p>
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-[10px]">{definition.publicExposure ? "public" : "admin"}</Badge>
          {readonly ? <Badge variant="secondary" className="text-[10px]">readonly</Badge> : null}
        </div>
      </div>
      <FieldControl id={id} definition={definition} value={value} readonly={readonly} onChange={onChange} />
      <p className="mt-2 text-[11px] text-muted-foreground">{definition.validationMessage}</p>
    </div>
  );
}

function FieldControl({
  id,
  definition,
  value,
  readonly,
  onChange,
}: {
  id: string;
  definition: ConfigurationDefinition;
  value: unknown;
  readonly: boolean;
  onChange: (value: unknown) => void;
}) {
  if (definition.uiControl === "readonly") {
    return <Input id={id} value={String(value ?? definition.defaultValue ?? "")} readOnly disabled />;
  }
  if (definition.uiControl === "switch") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input id={id} type="checkbox" checked={value === true} disabled={readonly} onChange={(event) => onChange(event.target.checked)} />
        {value === true ? "Ativado" : "Desativado"}
      </label>
    );
  }
  if (definition.uiControl === "select") {
    return (
      <Select value={String(value ?? definition.defaultValue ?? "")} disabled={readonly} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>{(definition.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  if (definition.uiControl === "number") {
    return (
      <Input
        id={id}
        type="number"
        value={value == null ? "" : String(value)}
        readOnly={readonly}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    );
  }
  if (definition.uiControl === "string-list") {
    return (
      <Textarea
        id={id}
        rows={3}
        value={Array.isArray(value) ? value.join("\n") : ""}
        readOnly={readonly}
        onChange={(event) => onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
        placeholder="Um item por linha"
      />
    );
  }
  if (definition.key === "footer_columns") {
    return <WebsiteFooterField id={id} value={value} readonly={readonly} onChange={onChange} />;
  }
  if (definition.key === "legal_links") {
    return <WebsiteMenuField plainLinks id={id} value={value} readonly={readonly} onChange={onChange} />;
  }
  if (definition.key === "menu_items") {
    return <WebsiteMenuField id={id} value={value} readonly={readonly} onChange={onChange} />;
  }
  if (definition.uiControl === "json") {
    return <JsonConfigurationField id={id} value={value} readonly={readonly} onChange={onChange} />;
  }
  if (definition.uiControl === "media-picker") {
    return <MediaConfigurationField id={id} value={value} readonly={readonly} onChange={onChange} />;
  }
  if (definition.uiControl === "textarea") {
    return <Textarea id={id} rows={4} value={String(value ?? "")} readOnly={readonly} onChange={(event) => onChange(event.target.value)} />;
  }
  if (definition.uiControl === "color") {
    const color = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
    return (
      <div className="flex gap-2">
        <input type="color" value={color} disabled={readonly} onChange={(event) => onChange(event.target.value)} className="h-10 w-14 rounded border bg-transparent" />
        <Input id={id} value={String(value ?? "")} readOnly={readonly} onChange={(event) => onChange(event.target.value)} placeholder="#RRGGBB" />
      </div>
    );
  }
  return (
    <Input
      id={id}
      type={definition.uiControl === "email" ? "email" : definition.uiControl === "url" ? "url" : "text"}
      value={String(value ?? "")}
      readOnly={readonly}
      maxLength={definition.maxLength}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function JsonConfigurationField({ id, value, readonly, onChange }: { id: string; value: unknown; readonly: boolean; onChange: (value: unknown) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(JSON.stringify(value ?? {}, null, 2)), [value]);

  function commit(next: string) {
    try {
      const parsed = JSON.parse(next);
      setError(null);
      onChange(parsed);
    } catch {
      setError("JSON inválido. O valor não foi aplicado ao draft.");
    }
  }

  return (
    <div>
      <Textarea
        id={id}
        className="font-mono text-xs"
        rows={Math.min(16, Math.max(5, text.split("\n").length))}
        value={text}
        readOnly={readonly}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => commit(text)}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function MediaConfigurationField({ id, value, readonly, onChange }: { id: string; value: unknown; readonly: boolean; onChange: (value: unknown) => void }) {
  const media = useQuery({
    queryKey: ["configuration-media-picker"],
    queryFn: () => listarMidias({ data: { search: "", tipo: "image", tag: "", page: 0, pageSize: 100 } }),
    retry: false,
  });
  const selected = typeof value === "string" ? value : "__none__";

  if (media.isError) {
    return <ConfigurationError message={(media.error as Error).message} onRetry={() => void media.refetch()} compact />;
  }
  return (
    <Select value={selected} disabled={readonly || media.isPending} onValueChange={(next) => onChange(next === "__none__" ? null : next)}>
      <SelectTrigger id={id}><SelectValue placeholder={media.isPending ? "Carregando mídias…" : "Selecione uma mídia"} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Sem mídia</SelectItem>
        {(media.data?.items ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function FutureActivationNotice() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="font-medium">Ativações preservadas no roadmap</div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Domain activation = pending DCA-01</span>
        <span>Cloudflare mode = HYBRID / pending DCA-01</span>
        <span>Billing activation = pending BCA-01</span>
        <span>Final visual refinement = pending PR-M3</span>
      </div>
    </div>
  );
}

function ConfigurationError({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  return (
    <div className={`${compact ? "mt-3" : "p-6"} rounded-md border border-destructive/30 bg-destructive/5 text-sm`}>
      <div className="flex items-center gap-2 text-destructive"><AlertCircle className="size-4" />{message || "permission_denied"}</div>
      <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 size-4" />Tentar novamente</Button>
    </div>
  );
}


type WebsiteMenuRow = Record<string, unknown>;

/** Edits the canonical configuration draft; never calls the retired menu mutation API. */
export function WebsiteMenuField({ id, value, readonly, onChange, plainLinks = false }: { id: string; value: unknown; readonly: boolean; onChange: (value: unknown) => void; plainLinks?: boolean }) {
  const compatible = Array.isArray(value) && value.every(row => row !== null && typeof row === "object" && !Array.isArray(row));
  const rows: WebsiteMenuRow[] = compatible ? value as WebsiteMenuRow[] : [];
  const [editing, setEditing] = useState<{ index: number | null; baseline: string; row: WebsiteMenuRow } | null>(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);
  const snapshot = JSON.stringify(value);
  useEffect(() => setRemoving(null), [snapshot]);
  function begin(index: number | null) {
    setError(""); setRemoving(null);
    setEditing({ index, baseline: snapshot, row: index === null ? (plainLinks ? { label: "", url: "" } : { id: crypto.randomUUID(), location: "header", label: "", url: "", order: rows.length * 10, visible: true, target: "_self", type: "internal" }) : { ...rows[index] } });
  }
  function apply() {
    if (!editing || readonly) return;
    if (editing.baseline !== snapshot) { setError("O menu mudou enquanto você editava. Cancele esta edição e abra o item atualizado. Seu texto permanece disponível para copiar."); return; }
    const label = String(editing.row.label ?? "").trim();
    const url = normalizePublicNavigationUrl(String(editing.row.url ?? ""), "contact");
    if (!label || label.length > 120) { setError("Informe um título de até 120 caracteres."); return; }
    if (!url) { setError("Informe um caminho iniciado por /, um endereço HTTPS, telefone (tel:) ou e-mail (mailto:)."); return; }
    if (!plainLinks && !["header", "footer"].includes(String(editing.row.location))) { setError("Selecione Cabeçalho ou Rodapé."); return; }
    const row = { ...editing.row, label, url };
    onChange(editing.index === null ? [...rows, row] : rows.map((existing, index) => index === editing.index ? row : existing));
    setEditing(null); setError("");
  }
  function move(index: number, direction: number) {
    if (readonly || editing) return;
    const next = [...rows]; const destination = index + direction;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    if (plainLinks) { onChange(next); return; }
    // Public projection gives `order` precedence over legacy `ordem`; keep both coherent.
    onChange(next.map((row, order) => ({ ...row, order: order * 10, ...(Object.hasOwn(row, "ordem") ? { ordem: order * 10 } : {}) })));
  }
  if (!compatible) return <div><p className="mb-2 text-sm">Este menu usa um formato anterior. Os dados foram preservados para edição detalhada.</p><JsonConfigurationField id={id} value={value} readonly={readonly} onChange={onChange} /></div>;
  return <div id={id} className="space-y-4">
    <p className="text-sm text-muted-foreground">Monte a navegação do website com títulos e destinos. As mudanças entram no rascunho; use Publicar no editor para disponibilizá-las no site.</p>
    {rows.length === 0 && <p className="rounded-lg border border-dashed p-4 text-sm">Nenhum link configurado. Adicione o primeiro item do menu.</p>}
    <ol className="space-y-3">{rows.map((row, index) => <li key={String(row.id ?? index)} className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><strong className="block break-words">{String(row.label ?? "Item sem título")}</strong><span className="block break-all text-sm text-muted-foreground">{String(row.url ?? "")}</span>{!plainLinks && <span className="text-xs text-muted-foreground">{row.location === "footer" ? "Rodapé" : "Cabeçalho"} · {(row.visible ?? row.visivel ?? true) ? "Visível" : "Oculto"}</span>}</div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={readonly || !!editing || removing !== null} onClick={() => begin(index)}>Editar link</Button><Button type="button" variant="outline" aria-label={`Mover ${String(row.label)} para cima`} disabled={readonly || !!editing || removing !== null || index === 0} onClick={() => move(index, -1)}>↑</Button><Button type="button" variant="outline" aria-label={`Mover ${String(row.label)} para baixo`} disabled={readonly || !!editing || removing !== null || index === rows.length - 1} onClick={() => move(index, 1)}>↓</Button><Button type="button" variant="outline" disabled={readonly || !!editing || removing !== null} onClick={() => setRemoving(index)}>Remover link</Button></div></div>
      {removing === index && <div className="mt-3 space-y-2" role="alert"><p className="text-sm">Remover este link do rascunho? A página de destino será preservada.</p><Button type="button" variant="outline" onClick={() => setRemoving(null)}>Manter link</Button><Button type="button" variant="destructive" disabled={readonly} onClick={() => { onChange(rows.filter((_, i) => i !== index)); setRemoving(null); }}>Confirmar remoção do link</Button></div>}
    </li>)}</ol>
    {!editing && <Button type="button" variant="outline" disabled={readonly || removing !== null} onClick={() => begin(null)}>Adicionar link</Button>}
    {editing && <fieldset disabled={readonly} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
      <legend className="px-2 font-medium">{editing.index === null ? "Novo link" : "Editar link do website"}</legend>
      <label className="space-y-1 text-sm">Título do link<Input value={String(editing.row.label ?? "")} maxLength={120} onChange={e => setEditing({ ...editing, row: { ...editing.row, label: e.target.value } })} /></label>
      <label className="space-y-1 text-sm">Destino<Input value={String(editing.row.url ?? "")} placeholder="/imoveis ou https://..." onChange={e => setEditing({ ...editing, row: { ...editing.row, url: e.target.value } })} /></label>
      {!plainLinks && <><label className="space-y-1 text-sm">Exibir em<select className="block min-h-10 w-full rounded-md border bg-background px-3" value={String(editing.row.location ?? "header")} onChange={e => setEditing({ ...editing, row: { ...editing.row, location: e.target.value } })}><option value="header">Cabeçalho</option><option value="footer">Rodapé</option></select></label>
      <label className="space-y-1 text-sm">Abrir destino<select className="block min-h-10 w-full rounded-md border bg-background px-3" value={String(editing.row.target ?? "_self")} onChange={e => setEditing({ ...editing, row: { ...editing.row, target: e.target.value } })}><option value="_self">Na mesma aba</option><option value="_blank">Em nova aba</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(editing.row.visible ?? editing.row.visivel ?? true)} onChange={e => setEditing({ ...editing, row: { ...editing.row, visible: e.target.checked, ...(Object.hasOwn(editing.row, "visivel") ? { visivel: e.target.checked } : {}) } })} />Mostrar no website</label></>}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" onClick={apply}>Aplicar ao rascunho</Button><Button type="button" variant="outline" onClick={() => { setEditing(null); setError(""); }}>Cancelar edição do link</Button></div>
    </fieldset>}
  </div>;
}


export function WebsiteFooterField({ id, value, readonly, onChange }: { id: string; value: unknown; readonly: boolean; onChange: (value: unknown) => void }) {
  const columnKeys = useRef<string[]>([]);
  const [removing, setRemoving] = useState<{ index: number; snapshot: string } | null>(null);
  const snapshot = JSON.stringify(value);
  const compatible = Array.isArray(value) && value.every(column => column !== null && typeof column === "object" && !Array.isArray(column));
  if (!compatible) return <JsonConfigurationField id={id} value={value} readonly={readonly} onChange={onChange} />;
  const columns = value as Array<Record<string, unknown>>;
  while (columnKeys.current.length < columns.length) columnKeys.current.push(crypto.randomUUID());
  const update = (index: number, patch: Record<string, unknown>) => { if (!readonly) onChange(columns.map((column, i) => i === index ? { ...column, ...patch } : column)); };
  return <div id={id} className="space-y-5">
    <p className="text-sm text-muted-foreground">Edite os títulos e links das colunas do rodapé. O layout atual exibe as duas primeiras colunas. As demais configurações existentes são preservadas.</p>
    {columns.map((column, index) => <section key={columnKeys.current[index]} className="space-y-4 rounded-lg border p-4">
      <label className="block space-y-2 text-sm">Título da coluna {index + 1}<Input readOnly={readonly} value={String(column.title ?? "")} onChange={e => update(index, { title: e.target.value })} /></label>
      <WebsiteMenuField plainLinks id={`${id}-links-${index}`} value={column.links ?? []} readonly={readonly} onChange={links => update(index, { links })} />
      <Button type="button" variant="outline" disabled={readonly} onClick={() => setRemoving({ index, snapshot })}>Remover coluna {index + 1}</Button>
      {removing?.index === index && <div role="alert" className="space-y-2"><p>Remover a coluna e seus links do rascunho? As páginas de destino serão preservadas.</p><Button type="button" variant="outline" onClick={() => setRemoving(null)}>Manter coluna</Button><Button type="button" variant="destructive" disabled={readonly || removing.snapshot !== snapshot} onClick={() => { if (!readonly && removing.snapshot === snapshot) { columnKeys.current = columnKeys.current.filter((_, i) => i !== index); onChange(columns.filter((_, i) => i !== index)); } setRemoving(null); }}>Confirmar remoção da coluna</Button></div>}
    </section>)}
    <Button type="button" variant="outline" disabled={readonly || columns.length >= 2} onClick={() => onChange([...columns, { title: "", links: [] }])}>Adicionar coluna</Button>
  </div>;
}
