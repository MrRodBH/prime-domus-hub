import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

  useEffect(() => {
    if (!state.data || snapshot) return;
    setSnapshot(state.data.snapshot as Record<string, unknown>);
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
      await qc.invalidateQueries({ queryKey: ["website-setup-state"] });
      await qc.invalidateQueries({ queryKey: ["content-list", "pagina"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o wizard."),
  });

  if (state.isPending || !snapshot) return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Carregando construtor…</div>;
  if (state.isError) return <div className="rounded-xl border border-destructive/40 bg-card p-6 text-sm text-destructive">{(state.error as Error).message}</div>;
  const set = (key: string, value: unknown) => setSnapshot((current) => current ? { ...current, [key]: value } : current);
  const next = Math.min(step + 1, STEPS.length - 1);
  const viewport = String(snapshot.website_preview_viewport ?? "desktop");

  return <section className="rounded-xl border bg-card" aria-labelledby="website-builder-title">
    <div className="border-b p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Self-service · rascunho versionado</p><h1 id="website-builder-title" className="font-display text-2xl">Construa o website da sua empresa</h1><p className="mt-1 text-sm text-muted-foreground">Você pode sair e retomar depois. Nada será publicado sem confirmação.</p></div>
        <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ nextStep: step, status: "deferred" })}>Configurar depois</Button>
      </div>
      <Progress className="mt-4" value={((step + 1) / STEPS.length) * 100} />
      <p className="mt-2 text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length}: {STEPS[step]}</p>
    </div>
    <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <div className="min-h-[360px] space-y-5">
        {step === 0 && <div className="grid gap-3 md:grid-cols-3">{[["prime_classic","Clássico"],["prime_minimal","Minimalista"],["prime_editorial","Editorial"]].map(([key,label]) => <button key={key} onClick={() => set("website_theme", key)} className={`rounded-xl border p-5 text-left ${snapshot.website_theme === key ? "border-primary ring-2 ring-primary/20" : ""}`}><strong>{label}</strong><p className="mt-2 text-xs text-muted-foreground">Template catalogado, sem código customizado.</p>{snapshot.website_theme === key && <Check className="mt-4 size-5 text-primary" />}</button>)}</div>}
        {step === 1 && <div className="grid gap-5 md:grid-cols-2"><div><Label>Logomarca</Label><MediaPicker value={null} label={snapshot.primary_logo ? "Trocar logomarca selecionada" : "Selecionar logomarca"} onChange={(media) => set("primary_logo", media?.media_id ?? null)} /><p className="mt-2 text-xs text-muted-foreground">{snapshot.primary_logo ? "Logomarca vinculada à biblioteca." : "Faça upload em Mídias e selecione aqui."}</p></div><div><Label>Favicon</Label><MediaPicker value={null} label={snapshot.favicon ? "Trocar favicon selecionado" : "Selecionar favicon"} onChange={(media) => set("favicon", media?.media_id ?? null)} /><Label className="mt-4 block">Posição da logomarca</Label><Select value={String(snapshot.logo_alignment)} onValueChange={(value) => set("logo_alignment", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Esquerda</SelectItem><SelectItem value="center">Centralizada</SelectItem><SelectItem value="right">Direita</SelectItem></SelectContent></Select></div></div>}
        {step === 2 && <div className="grid gap-4 sm:grid-cols-2">{[["primary_color","Cor primária"],["secondary_color","Cor secundária"],["background_color","Fundo"],["text_color","Texto"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input type="color" className="h-12" value={String(snapshot[key])} onChange={(e) => set(key,e.target.value)} /></div>)}{[["heading_font","Fonte dos títulos"],["body_font","Fonte do texto"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Select value={String(snapshot[key])} onValueChange={(value) => set(key,value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Inter","Poppins","Montserrat","Playfair Display","Cormorant Garamond","Roboto","Lato","Merriweather","Source Sans 3","DM Sans"].map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent></Select></div>)}</div>}
        {step === 3 && <div><h2 className="font-semibold">Páginas e menu inicial</h2><p className="text-sm text-muted-foreground">Serão criados apenas rascunhos ausentes; repetir a operação não duplica páginas.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{PAGE_OPTIONS.map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-lg border p-3"><Checkbox checked={pages.includes(key)} onCheckedChange={(checked) => { const nextPages = checked ? [...pages,key] : pages.filter((item) => item !== key); set("website_selected_pages", nextPages); set("menu_items", nextPages.map((slug,index) => ({ id: slug, label: PAGE_OPTIONS.find(([p]) => p === slug)?.[1] ?? slug, href: slug === "inicio" ? "/" : `/${slug}`, parent_id: null, order: index }))); }} /><span>{label}</span></label>)}</div><p className="mt-4 text-xs text-muted-foreground">Submenus e ordenação fina permanecem editáveis no CMS.</p></div>}
        {step === 4 && <div className="space-y-4"><div><Label>Título do hero</Label><Input value={String((snapshot.home_hero as any)?.titulo ?? "")} onChange={(e) => set("home_hero", { ...((snapshot.home_hero as object) ?? {}), titulo: e.target.value })} /></div><div><Label>Texto de apoio</Label><Input value={String((snapshot.home_hero as any)?.subtitulo ?? "")} onChange={(e) => set("home_hero", { ...((snapshot.home_hero as object) ?? {}), subtitulo: e.target.value })} /></div><p className="text-xs text-muted-foreground">O conteúdo fica em rascunho e poderá ser refinado no CMS.</p></div>}
        {step === 5 && <div className="grid gap-4 sm:grid-cols-2">{[["primary_email","E-mail"],["primary_phone","Telefone"],["whatsapp","WhatsApp"],["instagram","Instagram"],["facebook","Facebook"],["default_meta_title","Título SEO"],["default_meta_description","Descrição SEO"]].map(([key,label]) => <div key={key}><Label>{label}</Label><Input value={String(snapshot[key] ?? "")} onChange={(e) => set(key,e.target.value)} /></div>)}</div>}
        {step === 6 && <div className="rounded-xl border p-5"><h2 className="font-semibold">Pronto para gerar os rascunhos</h2><p className="mt-2 text-sm text-muted-foreground">A configuração será salva e as páginas selecionadas serão criadas como rascunho. Publicação continua separada e exige confirmação no CMS.</p><Button className="mt-5" disabled={save.isPending || pages.length === 0} onClick={() => save.mutate({ nextStep: step, status: "draft_ready" })}>Gerar website como rascunho</Button>{snapshot.website_setup_status === "draft_ready" && <p className="mt-3 text-sm text-emerald-700">Rascunhos gerados. <Link className="underline" to="/admin/paginas">Abrir CMS de páginas</Link>.</p>}</div>}
      </div>
      <div className="space-y-3"><div className="flex justify-center gap-1">{[["desktop",Monitor],["tablet",Tablet],["mobile",Smartphone]].map(([key,Icon]: any) => <Button key={key} size="icon" variant={viewport === key ? "default" : "outline"} onClick={() => set("website_preview_viewport",key)}><Icon className="size-4" /></Button>)}</div><div className={`mx-auto overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${viewport === "mobile" ? "max-w-[320px]" : viewport === "tablet" ? "max-w-[600px]" : "max-w-full"}`}><div className="flex min-h-14 items-center px-4" style={{backgroundColor:String(snapshot.primary_color),justifyContent:snapshot.logo_alignment === "center" ? "center" : snapshot.logo_alignment === "right" ? "flex-end" : "flex-start",color:"white"}}><strong>{String(snapshot.short_name || snapshot.trade_name || "Sua marca")}</strong></div><div className="p-8 text-center" style={{backgroundColor:String(snapshot.background_color),color:String(snapshot.text_color),fontFamily:String(snapshot.body_font)}}><h2 className="text-3xl" style={{fontFamily:String(snapshot.heading_font)}}>{String((snapshot.home_hero as any)?.titulo || "Seu título principal")}</h2><p className="mt-3 opacity-70">{String((snapshot.home_hero as any)?.subtitulo || "Visualize aqui as escolhas do seu website.")}</p><button className="mt-5 rounded-md px-4 py-2 text-white" style={{backgroundColor:String(snapshot.secondary_color)}}>Conheça nossas opções</button></div></div></div>
    </div>
    <div className="flex justify-between border-t p-5"><Button variant="outline" disabled={step === 0 || save.isPending} onClick={() => save.mutate({ nextStep: step - 1, status: "in_progress" })}><ChevronLeft className="mr-2 size-4" />Anterior</Button>{step < STEPS.length - 1 && <Button disabled={save.isPending} onClick={() => save.mutate({ nextStep: next, status: "in_progress" })}>Salvar e continuar<ChevronRight className="ml-2 size-4" /></Button>}</div>
  </section>;
}
