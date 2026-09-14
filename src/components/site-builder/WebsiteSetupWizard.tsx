import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { WebsitePreview } from "./WebsitePreview";
import { updateWebsiteStarterMenu, websiteHeroTitle } from "@/lib/website-builder-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTenantConfigurationDraft, saveTenantConfigurationDraft } from "@/lib/api/tenant-configuration.functions";
import { provisionTenantWebsiteDrafts } from "@/lib/api/tenant-cms.functions";

const STEPS = ["Tema", "Marca", "Visual", "Navegação", "Hero", "Contato e SEO", "Revisão"] as const;
const PAGE_OPTIONS = [
  ["inicio", "Início"], ["imoveis", "Imóveis"], ["lancamentos", "Lançamentos"],
  ["sobre", "Sobre"], ["contato", "Contato"],
] as const;
type StarterPage = (typeof PAGE_OPTIONS)[number][0];

export function WebsiteSetupWizard() {
  const stateFn = useServerFn(getTenantConfigurationDraft);
  const saveFn = useServerFn(saveTenantConfigurationDraft);
  const provisionFn = useServerFn(provisionTenantWebsiteDrafts);
  const qc = useQueryClient();
  const state = useQuery({ queryKey: ["website-setup-state"], queryFn: () => stateFn(), retry: false });
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [step, setStep] = useState(0);
  const lastSaved = useRef("");
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => {
    if (!state.data || snapshot) return;
    setSnapshot(state.data.snapshot as Record<string, unknown>);
    lastSaved.current = JSON.stringify(state.data.snapshot);
    setStep(Math.min(Number(state.data.snapshot.website_setup_step ?? 0), STEPS.length - 1));
  }, [state.data, snapshot]);

  const pages = useMemo<StarterPage[]>(() => {
    const value = snapshot?.website_selected_pages;
    return Array.isArray(value) ? value.filter((entry): entry is StarterPage => PAGE_OPTIONS.some(([key]) => key === entry)) : ["inicio", "imoveis", "sobre", "contato"];
  }, [snapshot]);

  const save = useMutation({
    mutationFn: async ({ nextStep, status }: { nextStep: number; status: "deferred" | "in_progress" | "draft_ready" }) => {
      if (!snapshot || !state.data) throw new Error("website_setup_not_loaded");
      const candidate = { ...snapshot, website_setup_step: nextStep, website_setup_status: status };
      const result = await saveFn({ data: { snapshot: candidate, expectedRevision: state.data.expectedRevision, notes: `Website builder — ${status} — etapa ${nextStep + 1}` } });
      if (status === "draft_ready") await provisionFn({ data: { pages } });
      return { candidate, nextStep, result };
    },
    onSuccess: async ({ candidate, nextStep }) => {
      setSnapshot(candidate); setStep(nextStep);
      lastSaved.current = JSON.stringify(candidate);
      setSavedVersion(value => value + 1);
      toast.success("Rascunho salvo. O website publicado permanece na versão atual.");
      await qc.invalidateQueries({ queryKey: ["website-setup-state"] });
      await qc.invalidateQueries({ queryKey: ["content-list", "pagina"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o wizard."),
  });

  if (state.isError && !snapshot) return <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-6 space-y-3"><p>Não foi possível carregar o website. {(state.error as Error).message}</p><Button variant="outline" onClick={() => void state.refetch()}>Tentar novamente</Button></div>;
  if (state.isPending || !snapshot) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Carregando construtor…</div>;

  const set = (key: string, value: unknown) => { if (!save.isPending && !state.isError) setSnapshot((current) => current ? { ...current, [key]: value } : current); };
  const next = Math.min(step + 1, STEPS.length - 1);
  const viewport = String(snapshot.website_preview_viewport ?? "desktop");

  return <section className="rounded-xl border bg-card" aria-labelledby="website-builder-title">
    <div className="border-b p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Self-service · rascunho versionado</p><h1 id="website-builder-title" className="font-display text-2xl">Construa o website da sua empresa</h1><p className="mt-1 text-sm text-muted-foreground">Você pode sair e retomar depois. Nada será publicado sem confirmação.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/admin/site" search={{ item: "legacy_content" }} className="inline-flex items-center rounded-md border px-3 py-2 text-sm">Editar conteúdo e publicar</Link><Button variant="ghost" disabled={save.isPending || state.isError} onClick={() => save.mutate({ nextStep: step, status: "deferred" })}>Configurar depois</Button></div>
      </div>
      <Progress className="mt-4" value={((step + 1) / STEPS.length) * 100} />
      <p className="mt-2 text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length}: {STEPS[step]}</p>
    </div>
    {(save.isError || state.isError) && <div role="alert" className="mx-5 mt-4 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"><p>{((save.error || state.error) as Error).message}</p><p className="mt-1">Suas alterações continuam nesta tela. Corrija o problema e tente salvar novamente.</p>{state.isError && <Button variant="outline" onClick={() => void state.refetch()}>Tentar carregar novamente</Button>}</div>}
    <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <fieldset disabled={save.isPending || state.isError} className="min-h-[360px] min-w-0 space-y-5">
        {step === 0 && <div className="rounded-xl border p-5"><h2 className="font-semibold">Layout atual do website</h2><p className="mt-2 text-sm text-muted-foreground">A prévia ao lado mostra o website existente. O layout aprovado será preservado; nas próximas etapas você pode editar a marca, as cores disponíveis, a navegação e o conteúdo.</p><p className="mt-3 text-xs text-muted-foreground">Variações de layout ainda não estão disponíveis nesta publicação.</p></div>}
        {step === 1 && <div className="grid gap-5 md:grid-cols-2"><div><Label>Logomarca</Label><MediaPicker value={null} label={snapshot.primary_logo ? "Trocar logomarca selecionada" : "Selecionar logomarca"} onChange={(media) => set("primary_logo", media?.media_id ?? null)} /><p className="mt-2 text-xs text-muted-foreground">{snapshot.primary_logo ? "Logomarca vinculada à biblioteca." : "Faça upload em Mídias e selecione aqui."}</p></div><div><Label>Favicon</Label><MediaPicker value={null} label={snapshot.favicon ? "Trocar favicon selecionado" : "Selecionar favicon"} onChange={(media) => set("favicon", media?.media_id ?? null)} /></div></div>}
        {step === 2 && <div className="grid gap-4 sm:grid-cols-2">{[["primary_color","Cor primária"],["secondary_color","Cor secundária"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input type="color" className="h-12" value={String(snapshot[key])} onChange={(e) => set(key,e.target.value)} /></div>)}{[["heading_font","Fonte dos títulos"],["body_font","Fonte do texto"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Select value={String(snapshot[key])} onValueChange={(value) => set(key,value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Inter","Poppins","Montserrat","Playfair Display","Cormorant Garamond","Roboto","Lato","Merriweather","Source Sans 3","DM Sans"].map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent></Select></div>)}</div>}
        {step === 3 && <div><h2 className="font-semibold">Páginas e menu inicial</h2><p className="text-sm text-muted-foreground">Serão criados apenas rascunhos ausentes; repetir a operação não duplica páginas.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{PAGE_OPTIONS.map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-3"><Checkbox checked={pages.includes(key)} onCheckedChange={(checked) => { const nextPages = checked ? [...pages,key] : pages.filter((item) => item !== key); set("website_selected_pages", nextPages); set("menu_items", updateWebsiteStarterMenu(snapshot.menu_items, nextPages)); }} /><span>{label}</span></label>)}</div><p className="mt-4 text-xs text-muted-foreground">Submenus e ordenação fina permanecem editáveis no CMS.</p></div>}
        {step === 4 && <div className="space-y-4"><div><Label>Título do hero</Label><Textarea value={websiteHeroTitle(snapshot.home_hero)} onChange={(e) => set("home_hero", { ...((snapshot.home_hero as object) ?? {}), title_lines: e.target.value.split("\n") })} /><p className="mt-1 text-xs text-muted-foreground">Uma linha por trecho do título, como no website.</p></div><div><Label>Texto de apoio</Label><Input value={String((snapshot.home_hero as any)?.subtitle ?? (snapshot.home_hero as any)?.subtitulo ?? "")} onChange={(e) => set("home_hero", { ...((snapshot.home_hero as object) ?? {}), subtitle: e.target.value })} /></div><p className="text-xs text-muted-foreground">O conteúdo fica em rascunho e poderá ser refinado no CMS.</p></div>}
        {step === 5 && <div className="grid gap-4 sm:grid-cols-2">{[["primary_email","E-mail"],["primary_phone","Telefone"],["whatsapp","WhatsApp"],["instagram","Instagram"],["facebook","Facebook"],["default_meta_title","Título SEO"],["default_meta_description","Descrição SEO"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input value={String(snapshot[key] ?? "")} onChange={(e) => set(key,e.target.value)} /></div>)}</div>}
        {step === 6 && <div className="rounded-xl border p-5"><h2 className="font-semibold">Pronto para gerar os rascunhos</h2><p className="mt-2 text-sm text-muted-foreground">A configuração será salva e as páginas selecionadas serão criadas como rascunho. Publicação continua separada e exige confirmação no CMS.</p><Button className="mt-5" disabled={save.isPending || pages.length === 0} onClick={() => save.mutate({ nextStep: step, status: "draft_ready" })}>Gerar website como rascunho</Button>{snapshot.website_setup_status === "draft_ready" && <p className="mt-3 text-sm text-emerald-700">Rascunhos gerados. <Link className="underline" to="/admin/paginas">Abrir CMS de páginas</Link>.</p>}</div>}
      </fieldset>
      <div className="space-y-3"><div className="flex justify-center gap-1">{[["desktop",Monitor],["tablet",Tablet],["mobile",Smartphone]].map(([key,Icon]: any) => <Button key={key} size="icon" variant={viewport === key ? "default" : "outline"} onClick={() => set("website_preview_viewport",key)}><Icon className="size-4" /></Button>)}</div><WebsitePreview viewport={viewport} savedVersion={savedVersion} unsaved={lastSaved.current !== JSON.stringify(snapshot)} /></div>
    </div>
    <div className="flex justify-between border-t p-5"><Button variant="outline" disabled={step === 0 || save.isPending} onClick={() => save.mutate({ nextStep: step - 1, status: "in_progress" })}><ChevronLeft className="mr-2 size-4" />Anterior</Button>{step < STEPS.length - 1 && <Button disabled={save.isPending || state.isError} onClick={() => save.mutate({ nextStep: next, status: "in_progress" })}>Salvar e continuar<ChevronRight className="ml-2 size-4" /></Button>}</div>
  </section>;
}
