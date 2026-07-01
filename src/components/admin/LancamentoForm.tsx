import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { GaleriaLancamento } from "@/components/admin/GaleriaLancamento";
import { UnidadesLancamento } from "@/components/admin/UnidadesLancamento";
import { CondicoesPagamento } from "@/components/admin/CondicoesPagamento";
import { PdfsLancamento } from "@/components/admin/PdfsLancamento";
import { LazerPicker } from "@/components/admin/LazerPicker";
import { InstagramPostManager } from "@/components/admin/InstagramPostManager";
import { supabase } from "@/integrations/supabase/client";
import { prefixTenant } from "@/lib/tenant-cache";
import {
  adminObterLancamento,
  adminSalvarLancamento,
  listarAmenities,
  listarStatusLancamento,
  adminListarImagensLancamento,
} from "@/lib/api/lancamentos.functions";
import { adminListarCorretores, adminAssinarUrl } from "@/lib/api/admin.functions";
import { gerarDescricaoImovel, gerarSeoLancamento } from "@/lib/api/ia.functions";

type Props = { id?: string };

type FormState = {
  id?: string;
  nome: string;
  slug: string;
  descricao: string;
  status_id: string | null;
  construtora: string;
  entrega: string; // YYYY-MM
  endereco: string;
  arquitetura: string;
  quartos: string;
  suites: string;
  vagas: string;
  area_apartamentos: string;
  numero_unidades: string;
  numero_torres: string;
  unidades_por_andar: string;
  numero_andares: string;
  elevadores: string;
  corretor_id: string | null;
  imagem_capa: string | null;
  video_url: string;
  publicado: boolean;
  destaque: boolean;
  meta_title: string;
  meta_description: string;
  amenity_ids: string[];
};

const empty: FormState = {
  nome: "", slug: "", descricao: "", status_id: null,
  construtora: "", entrega: "", endereco: "", arquitetura: "",
  quartos: "", suites: "", vagas: "", area_apartamentos: "",
  numero_unidades: "", numero_torres: "", unidades_por_andar: "",
  numero_andares: "", elevadores: "",
  corretor_id: null, imagem_capa: null, video_url: "",
  publicado: false, destaque: false,
  meta_title: "", meta_description: "",
  amenity_ids: [],
};

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function num(s: string): number | null { const n = Number(s); return Number.isFinite(n) && s !== "" ? n : null; }

export function LancamentoForm({ id }: Props) {
  const nav = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [capaPreview, setCapaPreview] = useState<string | null>(null);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [tomIA, setTomIA] = useState<"sofisticado" | "objetivo" | "acolhedor">("sofisticado");

  const { data: statuses } = useQuery({ queryKey: ["launch-statuses"], queryFn: () => listarStatusLancamento() });
  // amenities são buscadas dentro do LazerPicker
  const { data: corretores } = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const { data: existing } = useQuery({
    queryKey: ["admin", "lancamento", id],
    queryFn: () => adminObterLancamento({ data: { id: id! } }),
    enabled: !!id,
  });
  const { data: imagensRaw } = useQuery({
    queryKey: ["admin", "lancamento-imagens", form.id],
    queryFn: () => adminListarImagensLancamento({ data: { project_id: form.id! } }),
    enabled: !!form.id,
  });
  const imagensIG = useMemo(
    () => (imagensRaw ?? []).map((i) => ({ id: i.id, url: i.storage_path, alt: i.legenda, ordem: i.ordem })),
    [imagensRaw],
  );
  const [igSignedUrls, setIgSignedUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancel = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const img of imagensIG) {
        try {
          const { url } = await adminAssinarUrl({ data: { bucket: "lancamentos", path: img.url, width: 400, quality: 65 } });
          map[img.id] = url;
        } catch { /* ignore */ }
      }
      if (!cancel) setIgSignedUrls(map);
    })();
    return () => { cancel = true; };
  }, [imagensIG]);

  useEffect(() => {
    if (!existing) return;
    setForm({
      id: existing.id,
      nome: existing.nome ?? "",
      slug: existing.slug ?? "",
      descricao: existing.descricao ?? "",
      status_id: existing.status_id,
      construtora: existing.construtora ?? "",
      entrega: existing.entrega ? String(existing.entrega).slice(0, 7) : "",
      endereco: existing.endereco ?? "",
      arquitetura: existing.arquitetura ?? "",
      quartos: existing.quartos?.toString() ?? "",
      suites: existing.suites?.toString() ?? "",
      vagas: existing.vagas?.toString() ?? "",
      area_apartamentos: existing.area_apartamentos?.toString() ?? "",
      numero_unidades: existing.numero_unidades?.toString() ?? "",
      numero_torres: existing.numero_torres?.toString() ?? "",
      unidades_por_andar: existing.unidades_por_andar?.toString() ?? "",
      numero_andares: existing.numero_andares?.toString() ?? "",
      elevadores: existing.elevadores?.toString() ?? "",
      corretor_id: existing.corretor_id,
      imagem_capa: existing.imagem_capa,
      video_url: existing.video_url ?? "",
      publicado: !!existing.publicado,
      destaque: !!existing.destaque,
      meta_title: existing.meta_title ?? "",
      meta_description: existing.meta_description ?? "",
      amenity_ids: existing.amenity_ids ?? [],
    });
  }, [existing]);

  useEffect(() => {
    let cancel = false;
    async function loadCapa() {
      if (!form.imagem_capa) { setCapaPreview(null); return; }
      if (form.imagem_capa.startsWith("http")) { setCapaPreview(form.imagem_capa); return; }
      try {
        const { url } = await adminAssinarUrl({ data: { bucket: "lancamentos", path: form.imagem_capa, width: 800, quality: 70 } });
        if (!cancel) setCapaPreview(url);
      } catch { /* ignore */ }
    }
    loadCapa();
    return () => { cancel = true; };
  }, [form.imagem_capa]);

  const salvar = useMutation({
    mutationFn: () => adminSalvarLancamento({
      data: {
        id: form.id,
        slug: form.slug || slugify(form.nome),
        nome: form.nome,
        descricao: form.descricao || null,
        status_id: form.status_id,
        quartos: num(form.quartos), suites: num(form.suites), vagas: num(form.vagas),
        area_apartamentos: num(form.area_apartamentos),
        construtora: form.construtora || null,
        entrega: form.entrega ? `${form.entrega}-01` : null,
        endereco: form.endereco || null,
        arquitetura: form.arquitetura || null,
        numero_unidades: num(form.numero_unidades),
        numero_torres: num(form.numero_torres),
        unidades_por_andar: num(form.unidades_por_andar),
        numero_andares: num(form.numero_andares),
        elevadores: num(form.elevadores),
        corretor_id: form.corretor_id,
        imagem_capa: form.imagem_capa,
        video_url: form.video_url || null,
        publicado: form.publicado,
        destaque: form.destaque,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        amenity_ids: form.amenity_ids,
      },
    }),
    onSuccess: (r) => {
      toast.success("Empreendimento salvo");
      if (!form.id && r.id) nav({ to: "/admin/lancamentos/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCapa(true);
    try {
      const sanitized = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]+/g, "_");
      const slug = form.slug || slugify(form.nome) || "novo";
      const path = prefixTenant(`${slug}/capa/${crypto.randomUUID().slice(0, 8)}-${sanitized}`);
      const { error } = await supabase.storage.from("lancamentos").upload(path, file, { upsert: false });
      if (error) throw error;
      setForm((f) => ({ ...f, imagem_capa: path }));
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingCapa(false);
      e.target.value = "";
    }
  }

  const gerarIA = useMutation({
    mutationFn: async () => {
      // Coleta nomes dos amenities selecionados
      const ams = await listarAmenities();
      const sel = new Set(form.amenity_ids);
      const lazer = ams.filter((a) => sel.has(a.id)).map((a) => a.nome);
      const descricao = await gerarDescricaoImovel({
        data: {
          titulo: form.nome,
          tipo: "Lançamento (Empreendimento)",
          finalidade: "lancamento",
          bairro: "",
          endereco: form.endereco,
          quartos: num(form.quartos),
          suites: num(form.suites),
          banheiros: null,
          vagas: num(form.vagas),
          area_util: num(form.area_apartamentos),
          area_total: null,
          preco: null,
          preco_sob_consulta: true,
          caracteristicas: [
            form.construtora && `Construtora: ${form.construtora}`,
            form.arquitetura && `Arquitetura: ${form.arquitetura}`,
            form.entrega && `Entrega: ${form.entrega}`,
            form.numero_unidades && `${form.numero_unidades} unidades`,
            form.numero_torres && `${form.numero_torres} torres`,
            form.numero_andares && `${form.numero_andares} andares`,
            ...lazer,
          ].filter(Boolean) as string[],
          tom: tomIA,
        },
      });
      const seo = await gerarSeoLancamento({
        data: {
          nome: form.nome,
          descricao: descricao.descricao,
          construtora: form.construtora,
          endereco: form.endereco,
          quartos: num(form.quartos),
          suites: num(form.suites),
          vagas: num(form.vagas),
          area_apartamentos: num(form.area_apartamentos),
          entrega: form.entrega,
          amenidades: lazer,
        },
      });
      return { ...descricao, ...seo };
    },
    onSuccess: (r) => {
      // Converte parágrafos em HTML para o RichTextEditor
      const html = r.descricao
        .split(/\n{2,}/)
        .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
        .join("");
      setForm((f) => ({
        ...f,
        descricao: html,
        meta_title: r.meta_title || f.meta_title,
        meta_description: r.meta_description || f.meta_description,
      }));
      toast.success("Descrição e SEO gerados com IA");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}
      className="max-w-5xl space-y-8"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">{form.id ? "Editar lançamento" : "Novo lançamento"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Empreendimento — dados gerais</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => nav({ to: "/admin/lancamentos" })}>Voltar</Button>
          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Identidade */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Identidade</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nome do empreendimento *</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value, slug: f.slug || slugify(e.target.value) }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (URL) *</Label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Construtora</Label>
            <Input value={form.construtora} onChange={(e) => setForm((f) => ({ ...f, construtora: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Arquitetura</Label>
            <Input value={form.arquitetura} onChange={(e) => setForm((f) => ({ ...f, arquitetura: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, status_id: e.target.value || null }))}>
              <option value="">— Selecione —</option>
              {statuses?.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Entrega (mês/ano)</Label>
            <Input type="month" value={form.entrega} onChange={(e) => setForm((f) => ({ ...f, entrega: e.target.value }))} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Corretor responsável</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.corretor_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, corretor_id: e.target.value || null }))}>
              <option value="">— Selecione —</option>
              {corretores?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Vídeo (URL YouTube/Vimeo)</Label>
            <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Dados de tipologia */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Tipologia / Características gerais</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="space-y-1.5"><Label>Quartos</Label><Input type="number" value={form.quartos} onChange={(e) => setForm((f) => ({ ...f, quartos: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Suítes</Label><Input type="number" value={form.suites} onChange={(e) => setForm((f) => ({ ...f, suites: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Vagas</Label><Input type="number" value={form.vagas} onChange={(e) => setForm((f) => ({ ...f, vagas: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Área (m²)</Label><Input type="number" step="0.01" value={form.area_apartamentos} onChange={(e) => setForm((f) => ({ ...f, area_apartamentos: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Nº unidades</Label><Input type="number" value={form.numero_unidades} onChange={(e) => setForm((f) => ({ ...f, numero_unidades: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Nº torres</Label><Input type="number" value={form.numero_torres} onChange={(e) => setForm((f) => ({ ...f, numero_torres: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Unid./andar</Label><Input type="number" value={form.unidades_por_andar} onChange={(e) => setForm((f) => ({ ...f, unidades_por_andar: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Nº andares</Label><Input type="number" value={form.numero_andares} onChange={(e) => setForm((f) => ({ ...f, numero_andares: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Elevadores</Label><Input type="number" value={form.elevadores} onChange={(e) => setForm((f) => ({ ...f, elevadores: e.target.value }))} /></div>
        </div>
      </section>

      {/* Imagem de capa */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Imagem de capa</h2>
        <div className="flex items-center gap-4">
          {capaPreview ? (
            <img src={capaPreview} alt="" className="w-48 h-32 object-cover rounded border border-foreground/10" />
          ) : (
            <div className="w-48 h-32 rounded border border-dashed border-foreground/20 flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
          )}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-foreground/10 text-sm cursor-pointer hover:bg-foreground/5">
            {uploadingCapa ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Enviar imagem
            <input type="file" accept="image/*" className="hidden" onChange={uploadCapa} disabled={uploadingCapa} />
          </label>
          {form.imagem_capa && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, imagem_capa: null }))}>Remover</Button>
          )}
        </div>
      </section>

      {/* Galeria — só após salvar (precisa de id) */}
      {form.id ? (
        <GaleriaLancamento
          projectId={form.id}
          slug={form.slug}
          imagemCapa={form.imagem_capa}
          onCapaChange={(p) => setForm((f) => ({ ...f, imagem_capa: p }))}
        />
      ) : (
        <section className="bg-card border border-dashed border-foreground/15 rounded-lg p-6 text-sm text-muted-foreground">
          Salve o empreendimento para liberar o upload da galeria de fotos.
        </section>
      )}

      {/* Unidades — só após salvar */}
      {form.id && <UnidadesLancamento projectId={form.id} />}
      {form.id && <CondicoesPagamento projectId={form.id} />}
      {form.id && <PdfsLancamento projectId={form.id} slug={form.slug} />}




      {/* Descrição rica */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-medium">Descrição do empreendimento</h2>
          <div className="flex items-center gap-2">
            <Select value={tomIA} onValueChange={(v) => setTomIA(v as typeof tomIA)}>
              <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sofisticado">Tom sofisticado</SelectItem>
                <SelectItem value="objetivo">Tom objetivo</SelectItem>
                <SelectItem value="acolhedor">Tom acolhedor</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={() => gerarIA.mutate()} disabled={gerarIA.isPending}>
              <Sparkles className="size-3.5 mr-1.5" />
              {gerarIA.isPending ? "Gerando…" : "Gerar com IA"}
            </Button>
          </div>
        </div>
        <RichTextEditor value={form.descricao} onChange={(html) => setForm((f) => ({ ...f, descricao: html }))} />
        <p className="text-xs text-muted-foreground">A IA usa nome, tipologia, lazer selecionado e demais campos preenchidos acima.</p>
      </section>

      {/* Lazer */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Lazer</h2>
        <LazerPicker
          by="id"
          value={form.amenity_ids}
          onChange={(ids) => setForm((f) => ({ ...f, amenity_ids: ids }))}
          label="Selecionar itens de lazer"
        />
      </section>

      {/* Instagram — só após salvar */}
      {form.id && (
        <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
          <h2 className="font-medium">Instagram</h2>
          <p className="text-sm text-muted-foreground">
            Gere legenda + hashtags com IA, edite e baixe um ZIP com as fotos do empreendimento prontas para postar.
          </p>
          <InstagramPostManager
            launchProjectId={form.id}
            titulo={form.nome}
            imagens={imagensIG}
            signedUrls={igSignedUrls}
            bucket="lancamentos"
          />
        </section>
      )}

      {/* SEO */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">SEO</h2>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Meta title</Label>
            <Input value={form.meta_title} onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))} placeholder={form.nome ? `${form.nome} — RM Prime Imóveis` : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta description</Label>
            <Input value={form.meta_description} onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Publicação */}
      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Publicação</h2>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Switch checked={form.publicado} onCheckedChange={(v) => setForm((f) => ({ ...f, publicado: v }))} />
            <Label>Publicado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.destaque} onCheckedChange={(v) => setForm((f) => ({ ...f, destaque: v }))} />
            <Label>Destaque na home</Label>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => nav({ to: "/admin/lancamentos" })}>Cancelar</Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
          Salvar empreendimento
        </Button>
      </div>
    </form>
  );
}
