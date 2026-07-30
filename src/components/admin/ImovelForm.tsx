import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  adminAdicionarImagem,
  adminAssinarUrl,
  adminDefinirCapa,
  adminListarCorretores,
  adminRemoverImagem,
  adminReordenarImagens,
  adminSalvarImovel,
} from "@/lib/api/admin.functions";
import { gerarDescricaoImovel } from "@/lib/api/ia.functions";
import { listarBairros, listarCidades } from "@/lib/api/catalogo.functions";
import { listarAmenities } from "@/lib/api/lancamentos.functions";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { supabase } from "@/integrations/supabase/client";

const PROPERTY_TYPES = ["apartamento", "cobertura", "casa", "casa_condominio", "terreno", "comercial"] as const;
const PURPOSES = ["venda", "aluguel", "lancamento"] as const;
const STATUSES = ["ativo", "rascunho", "vendido", "reservado"] as const;
const MAX_IMAGES = 20;

type PropertyImage = {
  id: string;
  url: string;
  alt?: string | null;
  ordem: number;
};

type PropertyFormState = {
  id?: string;
  codigo: string;
  titulo: string;
  slug: string;
  descricao: string;
  finalidade: (typeof PURPOSES)[number];
  tipo: (typeof PROPERTY_TYPES)[number];
  status: (typeof STATUSES)[number];
  preco: number | null;
  preco_sob_consulta: boolean;
  condominio: number | null;
  iptu: number | null;
  area_util: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  endereco: string;
  rua: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  cep: string;
  bairro_id: string | null;
  corretor_id: string | null;
  badge: string;
  destaque: boolean;
  exclusivo: boolean;
  imagem_capa: string;
  latitude: number | null;
  longitude: number | null;
  video_url: string;
  tour_url: string;
  mostrar_rua: boolean;
  mostrar_endereco_completo: boolean;
};

type Props = {
  // Existing route loaders provide a repository DTO whose optional fields are
  // normalized below. Keeping this boundary tolerant does not grant authority.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial?: any;
};

function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function initialState(initial?: Props["initial"]): PropertyFormState {
  return {
    id: initial?.id,
    codigo: initial?.codigo ?? "",
    titulo: initial?.titulo ?? "",
    slug: initial?.slug ?? "",
    descricao: initial?.descricao ?? "",
    finalidade: initial?.finalidade ?? "venda",
    tipo: initial?.tipo ?? "apartamento",
    status: initial?.status ?? "rascunho",
    preco: initial?.preco ?? null,
    preco_sob_consulta: initial?.preco_sob_consulta ?? false,
    condominio: initial?.condominio ?? null,
    iptu: initial?.iptu ?? null,
    area_util: initial?.area_util ?? null,
    area_total: initial?.area_total ?? null,
    quartos: initial?.quartos ?? null,
    suites: initial?.suites ?? null,
    banheiros: initial?.banheiros ?? null,
    vagas: initial?.vagas ?? null,
    endereco: initial?.endereco ?? "",
    rua: initial?.rua ?? initial?.endereco ?? "",
    numero: initial?.numero ?? "",
    complemento: initial?.complemento ?? "",
    cidade: initial?.cidade ?? "",
    estado: initial?.estado ?? "",
    cep: initial?.cep ?? "",
    bairro_id: initial?.bairro_id ?? null,
    corretor_id: initial?.corretor_id ?? null,
    badge: initial?.badge ?? "",
    destaque: initial?.destaque ?? false,
    exclusivo: initial?.exclusivo ?? false,
    imagem_capa: initial?.imagem_capa ?? "",
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    video_url: initial?.video_url ?? "",
    tour_url: initial?.tour_url ?? "",
    mostrar_rua: initial?.mostrar_rua ?? false,
    mostrar_endereco_completo: initial?.mostrar_endereco_completo ?? false,
  };
}

export function ImovelForm({ initial }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PropertyFormState>(() => initialState(initial));
  const [images, setImages] = useState<PropertyImage[]>(initial?.imagens ?? []);
  const [orders, setOrders] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.imagens ?? []).map((image: PropertyImage) => [image.id, image.ordem > 0 ? String(image.ordem) : "0"])),
  );
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [tone, setTone] = useState<"sofisticado" | "objetivo" | "acolhedor">("sofisticado");
  const [manualFeatures, setManualFeatures] = useState<string[]>(initial?.caracteristicas ?? []);

  const neighborhoods = useQuery({ queryKey: ["bairros"], queryFn: () => listarBairros() });
  const cities = useQuery({ queryKey: ["cidades"], queryFn: () => listarCidades() });
  const brokers = useQuery({ queryKey: ["admin", "corretores"], queryFn: () => adminListarCorretores() });
  const amenities = useQuery({ queryKey: ["launch-amenities"], queryFn: () => listarAmenities() });

  const availableFeatures = useMemo(
    () => [...new Set((amenities.data ?? []).map((item) => item.nome))].sort(),
    [amenities.data],
  );

  useEffect(() => {
    setOrders((current) => Object.fromEntries(images.map((image) => [image.id, current[image.id] ?? (image.ordem > 0 ? String(image.ordem) : "0")])));
  }, [images]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const image of images) {
        if (image.url.startsWith("http")) {
          next[image.id] = image.url;
          continue;
        }
        try {
          const result = await adminAssinarUrl({ data: { bucket: "imoveis", path: image.url, width: 500, quality: 70 } });
          next[image.id] = result.url;
        } catch {
          // A failed preview signature must not weaken the persisted authority.
        }
      }
      if (!cancelled) setSignedUrls(next);
    })();
    return () => { cancelled = true; };
  }, [images]);

  const saveProperty = useMutation({
    mutationFn: () => adminSalvarImovel({
      data: {
        ...form,
        caracteristicas: manualFeatures,
        descricao: form.descricao || null,
        badge: form.badge || null,
        endereco: form.endereco || null,
        rua: form.rua || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        imagem_capa: form.imagem_capa || null,
        video_url: form.video_url || null,
        tour_url: form.tour_url || null,
      },
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "imoveis"] });
      toast.success("Imóvel salvo.");
      if (!form.id) navigate({ to: "/admin/imoveis/$id", params: { id: result.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const generateDescription = useMutation({
    mutationFn: () => gerarDescricaoImovel({
      data: {
        titulo: form.titulo,
        tipo: form.tipo,
        finalidade: form.finalidade,
        bairro: neighborhoods.data?.find((item) => item.id === form.bairro_id)?.nome ?? "",
        endereco: form.endereco,
        quartos: form.quartos,
        suites: form.suites,
        banheiros: form.banheiros,
        vagas: form.vagas,
        area_util: form.area_util,
        area_total: form.area_total,
        preco: form.preco,
        preco_sob_consulta: form.preco_sob_consulta,
        caracteristicas: manualFeatures,
        tom: tone,
      },
    }),
    onSuccess: (result) => setForm((current) => ({ ...current, descricao: result.descricao })),
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadImages(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!form.id) {
      toast.error("Salve o imóvel antes de adicionar imagens.");
      return;
    }
    const allowed = selected.slice(0, Math.max(0, MAX_IMAGES - images.length));
    if (allowed.length === 0) {
      toast.error(`Limite de ${MAX_IMAGES} imagens atingido.`);
      return;
    }

    setUploading(true);
    try {
      for (const file of allowed) {
        const target = await createUploadTarget({
          data: {
            domain: "imoveis",
            entityId: form.id,
            originalFileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        });
        const { error: uploadError } = await supabase.storage
          .from(target.bucket)
          .upload(target.path, file, { upsert: false });
        if (uploadError) throw uploadError;

        const result = await adminAdicionarImagem({
          data: {
            imovel_id: form.id,
            uploadTargetId: target.targetId,
            alt: form.titulo || file.name,
            ordem: 0,
          },
        });
        setImages((current) => [...current, result.image]);
      }
      toast.success("Upload e registro de provenance concluídos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(image: PropertyImage) {
    if (!window.confirm("Remover esta imagem?")) return;
    try {
      await adminRemoverImagem({ data: { id: image.id } });
      setImages((current) => current.filter((item) => item.id !== image.id));
      toast.success("Imagem removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover imagem.");
    }
  }

  async function persistOrder() {
    if (!form.id || images.length === 0) return;
    const ordered = images.map((image) => ({ image, ordem: Number(orders[image.id]) }));
    const numbers = ordered.map((item) => item.ordem);
    const validSequence = numbers.every((value) => Number.isInteger(value) && value >= 1 && value <= images.length)
      && new Set(numbers).size === images.length
      && numbers.includes(1);
    if (!validSequence) {
      toast.error(`Utilize cada número de 1 a ${images.length} exatamente uma vez.`);
      return;
    }

    setSavingOrder(true);
    try {
      const result = await adminReordenarImagens({
        data: {
          imovel_id: form.id,
          ordem: ordered.map(({ image, ordem }) => ({ id: image.id, ordem })),
        },
      });
      setImages((current) => current.map((image) => ({ ...image, ordem: Number(orders[image.id]) })));
      setForm((current) => ({ ...current, imagem_capa: result.imagem_capa }));
      toast.success("Ordem salva; a foto nº 1 é a capa.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao ordenar imagens.");
    } finally {
      setSavingOrder(false);
    }
  }

  async function setCover(image: PropertyImage) {
    if (!form.id) return;
    try {
      const result = await adminDefinirCapa({ data: { imovel_id: form.id, imagem_id: image.id } });
      setForm((current) => ({ ...current, imagem_capa: result.imagem_capa }));
      toast.success("Capa atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao definir capa.");
    }
  }

  const setNumber = (key: keyof PropertyFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: optionalNumber(value) }));

  return (
    <form
      className="mx-auto max-w-6xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        saveProperty.mutate();
      }}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{form.id ? "Editar imóvel" : "Novo imóvel"}</h1>
          <p className="text-sm text-muted-foreground">Dados, publicação e mídia com autoridade tenant-scoped.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/imoveis" })}>Cancelar</Button>
          <Button type="submit" disabled={saveProperty.isPending}>
            {saveProperty.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </header>

      <Section title="Informações principais">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Código" required value={form.codigo} onChange={(value) => setForm((current) => ({ ...current, codigo: value }))} />
          <Field label="Slug" required value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} />
          <div className="md:col-span-2"><Field label="Título" required value={form.titulo} onChange={(value) => setForm((current) => ({ ...current, titulo: value }))} /></div>
          <SelectField label="Finalidade" value={form.finalidade} options={PURPOSES} onChange={(value) => setForm((current) => ({ ...current, finalidade: value as PropertyFormState["finalidade"] }))} />
          <SelectField label="Tipo" value={form.tipo} options={PROPERTY_TYPES} onChange={(value) => setForm((current) => ({ ...current, tipo: value as PropertyFormState["tipo"] }))} />
          <SelectField label="Status" value={form.status} options={STATUSES} onChange={(value) => setForm((current) => ({ ...current, status: value as PropertyFormState["status"] }))} />
          <Field label="Badge" value={form.badge} onChange={(value) => setForm((current) => ({ ...current, badge: value }))} />
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label>Descrição</Label>
            <div className="flex gap-2">
              <Select value={tone} onValueChange={(value) => setTone(value as typeof tone)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sofisticado">Sofisticado</SelectItem>
                  <SelectItem value="objetivo">Objetivo</SelectItem>
                  <SelectItem value="acolhedor">Acolhedor</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" disabled={generateDescription.isPending} onClick={() => generateDescription.mutate()}>
                <Sparkles className="mr-2 size-4" />Gerar com IA
              </Button>
            </div>
          </div>
          <Textarea rows={7} value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} />
        </div>
      </Section>

      <Section title="Valores e características">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Preço" value={form.preco} onChange={(value) => setNumber("preco", value)} />
          <NumberField label="Condomínio" value={form.condominio} onChange={(value) => setNumber("condominio", value)} />
          <NumberField label="IPTU" value={form.iptu} onChange={(value) => setNumber("iptu", value)} />
          <NumberField label="Área útil" value={form.area_util} onChange={(value) => setNumber("area_util", value)} />
          <NumberField label="Área total" value={form.area_total} onChange={(value) => setNumber("area_total", value)} />
          <NumberField label="Quartos" value={form.quartos} onChange={(value) => setNumber("quartos", value)} />
          <NumberField label="Suítes" value={form.suites} onChange={(value) => setNumber("suites", value)} />
          <NumberField label="Banheiros" value={form.banheiros} onChange={(value) => setNumber("banheiros", value)} />
          <NumberField label="Vagas" value={form.vagas} onChange={(value) => setNumber("vagas", value)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Toggle label="Preço sob consulta" checked={form.preco_sob_consulta} onChange={(checked) => setForm((current) => ({ ...current, preco_sob_consulta: checked }))} />
          <Toggle label="Destaque" checked={form.destaque} onChange={(checked) => setForm((current) => ({ ...current, destaque: checked }))} />
          <Toggle label="Exclusivo" checked={form.exclusivo} onChange={(checked) => setForm((current) => ({ ...current, exclusivo: checked }))} />
        </div>
        <div className="mt-4">
          <Label>Características</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableFeatures.map((feature) => {
              const selected = manualFeatures.includes(feature);
              return (
                <Button
                  key={feature}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => setManualFeatures((current) => selected ? current.filter((item) => item !== feature) : [...current, feature])}
                >
                  {feature}
                </Button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Localização e responsável">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Bairro"
            value={form.bairro_id ?? "none"}
            options={["none", ...(neighborhoods.data ?? []).map((item) => item.id)]}
            labels={Object.fromEntries((neighborhoods.data ?? []).map((item) => [item.id, item.nome]))}
            onChange={(value) => setForm((current) => ({ ...current, bairro_id: value === "none" ? null : value }))}
          />
          <SelectField
            label="Corretor"
            value={form.corretor_id ?? "none"}
            options={["none", ...(brokers.data ?? []).map((item) => item.id)]}
            labels={Object.fromEntries((brokers.data ?? []).map((item) => [item.id, item.nome]))}
            onChange={(value) => setForm((current) => ({ ...current, corretor_id: value === "none" ? null : value }))}
          />
          <SelectField
            label="Cidade de referência"
            value={cities.data?.find((item) => item.nome === form.cidade)?.id ?? "none"}
            options={["none", ...(cities.data ?? []).map((item) => item.id)]}
            labels={Object.fromEntries((cities.data ?? []).map((item) => [item.id, `${item.nome}/${item.estado}`]))}
            onChange={(value) => {
              const city = cities.data?.find((item) => item.id === value);
              setForm((current) => ({ ...current, cidade: city?.nome ?? "", estado: city?.estado ?? "" }));
            }}
          />
          <Field label="Rua" value={form.rua} onChange={(value) => setForm((current) => ({ ...current, rua: value, endereco: value }))} />
          <Field label="Número" value={form.numero} onChange={(value) => setForm((current) => ({ ...current, numero: value }))} />
          <Field label="Complemento" value={form.complemento} onChange={(value) => setForm((current) => ({ ...current, complemento: value }))} />
          <Field label="CEP" value={form.cep} onChange={(value) => setForm((current) => ({ ...current, cep: value }))} />
          <NumberField label="Latitude" value={form.latitude} onChange={(value) => setNumber("latitude", value)} />
          <NumberField label="Longitude" value={form.longitude} onChange={(value) => setNumber("longitude", value)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Toggle label="Mostrar rua" checked={form.mostrar_rua} onChange={(checked) => setForm((current) => ({ ...current, mostrar_rua: checked }))} />
          <Toggle label="Mostrar endereço completo" checked={form.mostrar_endereco_completo} onChange={(checked) => setForm((current) => ({ ...current, mostrar_endereco_completo: checked }))} />
        </div>
      </Section>

      <Section title="Mídia e tours">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vídeo HTTPS" value={form.video_url} onChange={(value) => setForm((current) => ({ ...current, video_url: value }))} />
          <Field label="Tour HTTPS" value={form.tour_url} onChange={(value) => setForm((current) => ({ ...current, tour_url: value }))} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" asChild disabled={!form.id || uploading || images.length >= MAX_IMAGES}>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Enviar imagens
              <input className="hidden" type="file" accept="image/*" multiple onChange={uploadImages} />
            </label>
          </Button>
          <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES} · o path é transporte; o registro usa uploadTargetId.</span>
        </div>

        {images.length > 0 ? (
          <div className="mt-5 space-y-3">
            {images.map((image) => (
              <div key={image.id} className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[96px_1fr_100px_auto]">
                <div className="aspect-square overflow-hidden rounded bg-muted">
                  {signedUrls[image.id] ? <img className="h-full w-full object-cover" src={signedUrls[image.id]} alt={image.alt ?? form.titulo} /> : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{image.alt || "Imagem do imóvel"}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{image.url}</div>
                  {form.imagem_capa === image.url ? <div className="mt-1 inline-flex items-center gap-1 text-xs"><Crown className="size-3" />Capa atual</div> : null}
                </div>
                <div>
                  <Label className="text-xs">Ordem</Label>
                  <Input type="number" min={1} max={images.length} value={orders[image.id] ?? "0"} onChange={(event) => setOrders((current) => ({ ...current, [image.id]: event.target.value }))} />
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <Button type="button" size="icon" variant="outline" aria-label="Definir capa" onClick={() => void setCover(image)}><Crown className="size-4" /></Button>
                  <Button type="button" size="icon" variant="destructive" aria-label="Remover imagem" onClick={() => void removeImage(image)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" disabled={savingOrder} onClick={() => void persistOrder()}>
              {savingOrder ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar ordem e capa nº 1
            </Button>
          </div>
        ) : null}
      </Section>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-card p-5"><h2 className="mb-4 text-lg font-medium">{title}</h2>{children}</section>;
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label><Input required={required} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type="number" step="any" value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></div>;
}

function SelectField({ label, value, options, labels = {}, onChange }: { label: string; value: string; options: readonly string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{labels[option] ?? (option === "none" ? "Nenhum" : option)}</SelectItem>)}</SelectContent></Select></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-md border px-3 py-2"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>;
}
