import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { GaleriaLancamento } from "@/components/admin/GaleriaLancamento";
import { UnidadesLancamento } from "@/components/admin/UnidadesLancamento";
import { CondicoesPagamento } from "@/components/admin/CondicoesPagamento";
import { PdfsLancamento } from "@/components/admin/PdfsLancamento";
import { LazerPicker } from "@/components/admin/LazerPicker";
import { InstagramPostManager } from "@/components/admin/InstagramPostManager";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import {
  consumeTenantLaunchCover,
  saveTenantLaunchProject,
  signTenantLaunchMedia,
} from "@/lib/api/content-media.functions";
import {
  adminListarImagensLancamento,
  adminObterLancamento,
} from "@/lib/api/lancamentos.functions";
import { listarTenantLaunchStatuses } from "@/lib/api/tenant-launch-catalog.functions";
import { adminListarCorretores } from "@/lib/api/admin.functions";

type Props = { id?: string };

type FormState = {
  id?: string;
  nome: string;
  slug: string;
  descricao: string;
  status_id: string | null;
  construtora: string;
  entrega: string;
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

type LaunchImage = {
  id: string;
  storage_path: string;
  legenda: string | null;
  ordem: number;
};

const EMPTY: FormState = {
  nome: "",
  slug: "",
  descricao: "",
  status_id: null,
  construtora: "",
  entrega: "",
  endereco: "",
  arquitetura: "",
  quartos: "",
  suites: "",
  vagas: "",
  area_apartamentos: "",
  numero_unidades: "",
  numero_torres: "",
  unidades_por_andar: "",
  numero_andares: "",
  elevadores: "",
  corretor_id: null,
  imagem_capa: null,
  video_url: "",
  publicado: false,
  destaque: false,
  meta_title: "",
  meta_description: "",
  amenity_ids: [],
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LancamentoForm({ id }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const statuses = useQuery({
    queryKey: ["tenant-launch-statuses"],
    queryFn: () => listarTenantLaunchStatuses(),
  });
  const brokers = useQuery({
    queryKey: ["admin", "corretores"],
    queryFn: () => adminListarCorretores(),
  });
  const existing = useQuery({
    queryKey: ["admin", "lancamento", id],
    queryFn: () => adminObterLancamento({ data: { id: id! } }),
    enabled: Boolean(id),
  });
  const images = useQuery<LaunchImage[]>({
    queryKey: ["admin", "lancamento-imagens", form.id],
    queryFn: () => adminListarImagensLancamento({ data: { project_id: form.id! } }),
    enabled: Boolean(form.id),
  });

  const instagramImages = useMemo(
    () => (images.data ?? []).map((image) => ({
      id: image.id,
      url: image.storage_path,
      alt: image.legenda,
      ordem: image.ordem,
    })),
    [images.data],
  );
  const [instagramSignedUrls, setInstagramSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const row = existing.data as any;
    if (!row) return;
    setForm({
      id: row.id,
      nome: row.nome ?? "",
      slug: row.slug ?? "",
      descricao: row.descricao ?? "",
      status_id: row.status_id ?? null,
      construtora: row.construtora ?? "",
      entrega: row.entrega ? String(row.entrega).slice(0, 7) : "",
      endereco: row.endereco ?? "",
      arquitetura: row.arquitetura ?? "",
      quartos: row.quartos?.toString() ?? "",
      suites: row.suites?.toString() ?? "",
      vagas: row.vagas?.toString() ?? "",
      area_apartamentos: row.area_apartamentos?.toString() ?? "",
      numero_unidades: row.numero_unidades?.toString() ?? "",
      numero_torres: row.numero_torres?.toString() ?? "",
      unidades_por_andar: row.unidades_por_andar?.toString() ?? "",
      numero_andares: row.numero_andares?.toString() ?? "",
      elevadores: row.elevadores?.toString() ?? "",
      corretor_id: row.corretor_id ?? null,
      imagem_capa: row.imagem_capa ?? null,
      video_url: row.video_url ?? "",
      publicado: Boolean(row.publicado),
      destaque: Boolean(row.destaque),
      meta_title: row.meta_title ?? "",
      meta_description: row.meta_description ?? "",
      amenity_ids: row.amenity_ids ?? [],
    });
  }, [existing.data]);

  useEffect(() => {
    let active = true;
    if (!form.id || !form.imagem_capa) {
      setCoverPreview(null);
      return;
    }
    signTenantLaunchMedia({
      data: { projectId: form.id, resource: "cover", width: 800, quality: 70 },
    })
      .then((result) => { if (active) setCoverPreview(result.url); })
      .catch(() => { if (active) setCoverPreview(null); });
    return () => { active = false; };
  }, [form.id, form.imagem_capa]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!form.id) return;
      const next: Record<string, string> = {};
      for (const image of images.data ?? []) {
        try {
          const result = await signTenantLaunchMedia({
            data: {
              projectId: form.id,
              resource: "gallery",
              resourceId: image.id,
              width: 400,
              quality: 65,
            },
          });
          if (result.url) next[image.id] = result.url;
        } catch {
          // Presentation-only preview; persisted metadata remains authoritative.
        }
      }
      if (active) setInstagramSignedUrls(next);
    })();
    return () => { active = false; };
  }, [form.id, images.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveTenantLaunchProject({
      data: {
        id: form.id,
        slug: form.slug || slugify(form.nome),
        nome: form.nome,
        descricao: form.descricao || null,
        status_id: form.status_id,
        quartos: optionalNumber(form.quartos),
        suites: optionalNumber(form.suites),
        vagas: optionalNumber(form.vagas),
        area_apartamentos: optionalNumber(form.area_apartamentos),
        construtora: form.construtora || null,
        entrega: form.entrega ? `${form.entrega}-01` : null,
        endereco: form.endereco || null,
        arquitetura: form.arquitetura || null,
        numero_unidades: optionalNumber(form.numero_unidades),
        numero_torres: optionalNumber(form.numero_torres),
        unidades_por_andar: optionalNumber(form.unidades_por_andar),
        numero_andares: optionalNumber(form.numero_andares),
        elevadores: optionalNumber(form.elevadores),
        corretor_id: form.corretor_id,
        video_url: form.video_url || null,
        publicado: form.publicado,
        destaque: form.destaque,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        amenity_ids: form.amenity_ids,
      },
    }),
    onSuccess: (result) => {
      setForm((current) => ({ ...current, id: result.id }));
      toast.success("Empreendimento salvo.");
      if (!id) navigate({ to: "/admin/lancamentos/$id", params: { id: result.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!form.id) {
      toast.error("Salve o lançamento antes de enviar a capa.");
      return;
    }
    setUploadingCover(true);
    try {
      const target = await createUploadTarget({
        data: {
          domain: "lancamento-capa",
          entityId: form.id,
          originalFileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
      const { error } = await supabase.storage
        .from(target.bucket)
        .upload(target.path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const consumed = await consumeTenantLaunchCover({
        data: { projectId: form.id, targetId: target.targetId },
      });
      setForm((current) => ({ ...current, imagem_capa: consumed.path }));
      const preview = await signTenantLaunchMedia({
        data: { projectId: form.id!, resource: "cover", width: 800, quality: 70 },
      });
      setCoverPreview(preview.url);
      toast.success("Capa registrada por provenance.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no upload da capa.");
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}
      className="max-w-5xl space-y-8"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">{form.id ? "Editar lançamento" : "Novo lançamento"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Empreendimento — dados gerais</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/lancamentos" })}>Voltar</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Identidade</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nome do empreendimento" required value={form.nome} onChange={(value) => setForm((current) => ({ ...current, nome: value, slug: current.slug || slugify(value) }))} />
          <Field label="Slug (URL)" required value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: slugify(value) }))} />
          <Field label="Construtora" value={form.construtora} onChange={(value) => setForm((current) => ({ ...current, construtora: value }))} />
          <Field label="Arquitetura" value={form.arquitetura} onChange={(value) => setForm((current) => ({ ...current, arquitetura: value }))} />
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status_id ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, status_id: event.target.value || null }))}
            >
              <option value="">— Selecione —</option>
              {(statuses.data ?? []).map((status) => <option key={status.id} value={status.id}>{status.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Entrega (mês/ano)</Label><Input type="month" value={form.entrega} onChange={(event) => setForm((current) => ({ ...current, entrega: event.target.value }))} /></div>
          <div className="md:col-span-2"><Field label="Endereço" value={form.endereco} onChange={(value) => setForm((current) => ({ ...current, endereco: value }))} /></div>
          <div className="space-y-1.5">
            <Label>Corretor responsável</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.corretor_id ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, corretor_id: event.target.value || null }))}
            >
              <option value="">— Selecione —</option>
              {(brokers.data ?? []).map((broker: any) => <option key={broker.id} value={broker.id}>{broker.nome}</option>)}
            </select>
          </div>
          <Field label="Vídeo (URL HTTPS)" value={form.video_url} onChange={(value) => setForm((current) => ({ ...current, video_url: value }))} />
        </div>
      </section>

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Tipologia / Características gerais</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <NumberField label="Quartos" value={form.quartos} onChange={(value) => setForm((current) => ({ ...current, quartos: value }))} />
          <NumberField label="Suítes" value={form.suites} onChange={(value) => setForm((current) => ({ ...current, suites: value }))} />
          <NumberField label="Vagas" value={form.vagas} onChange={(value) => setForm((current) => ({ ...current, vagas: value }))} />
          <NumberField label="Área (m²)" value={form.area_apartamentos} onChange={(value) => setForm((current) => ({ ...current, area_apartamentos: value }))} />
          <NumberField label="Nº unidades" value={form.numero_unidades} onChange={(value) => setForm((current) => ({ ...current, numero_unidades: value }))} />
          <NumberField label="Nº torres" value={form.numero_torres} onChange={(value) => setForm((current) => ({ ...current, numero_torres: value }))} />
          <NumberField label="Unid./andar" value={form.unidades_por_andar} onChange={(value) => setForm((current) => ({ ...current, unidades_por_andar: value }))} />
          <NumberField label="Nº andares" value={form.numero_andares} onChange={(value) => setForm((current) => ({ ...current, numero_andares: value }))} />
          <NumberField label="Elevadores" value={form.elevadores} onChange={(value) => setForm((current) => ({ ...current, elevadores: value }))} />
        </div>
      </section>

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Imagem de capa</h2>
        <div className="flex items-center gap-4">
          {coverPreview
            ? <img src={coverPreview} alt="Capa do empreendimento" className="w-48 h-32 object-cover rounded border border-foreground/10" />
            : <div className="w-48 h-32 rounded border border-dashed border-foreground/20 flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>}
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-foreground/10 text-sm cursor-pointer hover:bg-foreground/5">
            {uploadingCover ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Enviar imagem
            <input type="file" accept="image/*" className="hidden" onChange={uploadCover} disabled={uploadingCover || !form.id} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">O path é transporte; a capa é persistida somente após consumo atômico do upload target.</p>
      </section>

      {form.id ? (
        <GaleriaLancamento
          projectId={form.id}
          currentCoverPath={form.imagem_capa}
          onCoverChange={(path) => setForm((current) => ({ ...current, imagem_capa: path }))}
        />
      ) : (
        <section className="bg-card border border-dashed border-foreground/15 rounded-lg p-6 text-sm text-muted-foreground">Salve o empreendimento para liberar a mídia.</section>
      )}

      {form.id && <UnidadesLancamento projectId={form.id} />}
      {form.id && <CondicoesPagamento projectId={form.id} />}
      {form.id && <PdfsLancamento projectId={form.id} />}

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Descrição do empreendimento</h2>
        <RichTextEditor value={form.descricao} onChange={(descricao) => setForm((current) => ({ ...current, descricao }))} />
        <p className="text-xs text-muted-foreground">Edição manual; nenhum provider externo é executado nesta etapa.</p>
      </section>

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Lazer</h2>
        <LazerPicker
          by="id"
          value={form.amenity_ids}
          onChange={(amenity_ids) => setForm((current) => ({ ...current, amenity_ids }))}
          label="Selecionar itens de lazer"
        />
      </section>

      {form.id && (
        <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
          <h2 className="font-medium">Instagram</h2>
          <p className="text-sm text-muted-foreground">Crie e salve drafts manuais; geração externa de copy não possui adapter factual.</p>
          <InstagramPostManager
            launchProjectId={form.id}
            titulo={form.nome}
            imagens={instagramImages}
            signedUrls={instagramSignedUrls}
          />
        </section>
      )}

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">SEO</h2>
        <div className="grid gap-4">
          <Field label="Meta title" value={form.meta_title} onChange={(value) => setForm((current) => ({ ...current, meta_title: value }))} />
          <Field label="Meta description" value={form.meta_description} onChange={(value) => setForm((current) => ({ ...current, meta_description: value }))} />
        </div>
      </section>

      <section className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-medium">Publicação</h2>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2"><Switch checked={form.publicado} onCheckedChange={(publicado) => setForm((current) => ({ ...current, publicado }))} /><Label>Publicado</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.destaque} onCheckedChange={(destaque) => setForm((current) => ({ ...current, destaque }))} /><Label>Destaque na home</Label></div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/lancamentos" })}>Cancelar</Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
          Salvar empreendimento
        </Button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input required={required} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function NumberField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type="number" step="any" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
