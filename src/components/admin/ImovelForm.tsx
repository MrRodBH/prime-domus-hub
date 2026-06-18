import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  adminSalvarImovel,
  adminAdicionarImagem,
  adminRemoverImagem,
  adminAssinarUrl,
  adminSalvarBairro,
  adminReordenarImagens,
} from "@/lib/api/admin.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { gerarDescricaoImovel } from "@/lib/api/ia.functions";
import { listarBairros } from "@/lib/api/catalogo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Upload, Sparkles, GripVertical, Crown } from "lucide-react";
import { InstagramPostManager } from "./InstagramPostManager";
import { useEffect } from "react";


type Imagem = { id: string; url: string; alt?: string | null; ordem: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImovelData = any;

interface Props { initial?: ImovelData }

const tipos = ["apartamento", "cobertura", "casa", "casa_condominio", "terreno", "comercial"];
const finalidades = ["venda", "aluguel", "lancamento"];
const statusList = ["ativo", "rascunho", "vendido", "reservado"];
const MAX_IMAGENS = 20;

export function ImovelForm({ initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bairros = useQuery({ queryKey: ["bairros"], queryFn: () => listarBairros() });
  const [form, setForm] = useState({
    id: initial?.id,
    codigo: initial?.codigo ?? "",
    titulo: initial?.titulo ?? "",
    slug: initial?.slug ?? "",
    descricao: initial?.descricao ?? "",
    finalidade: initial?.finalidade ?? "venda",
    tipo: initial?.tipo ?? "apartamento",
    status: initial?.status ?? "ativo",
    preco: initial?.preco ?? null,
    preco_sob_consulta: initial?.preco_sob_consulta ?? false,
    area_util: initial?.area_util ?? null,
    area_total: initial?.area_total ?? null,
    quartos: initial?.quartos ?? null,
    suites: initial?.suites ?? null,
    banheiros: initial?.banheiros ?? null,
    vagas: initial?.vagas ?? null,
    endereco: initial?.endereco ?? "",
    bairro_id: initial?.bairro_id ?? null,
    corretor_id: initial?.corretor_id ?? null,
    badge: initial?.badge ?? "",
    destaque: initial?.destaque ?? false,
    exclusivo: initial?.exclusivo ?? false,
    caracteristicas: initial?.caracteristicas ?? [],
    imagem_capa: initial?.imagem_capa ?? "",
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    video_url: initial?.video_url ?? "",
    tour_url: initial?.tour_url ?? "",
  });

  const [caracTxt, setCaracTxt] = useState((initial?.caracteristicas ?? []).join(", "));
  const [imagens, setImagens] = useState<Imagem[]>(initial?.imagens ?? []);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [tomIA, setTomIA] = useState<"sofisticado" | "objetivo" | "acolhedor">("sofisticado");
  const [novoBairroOpen, setNovoBairroOpen] = useState(false);
  const [novoBairro, setNovoBairro] = useState({ nome: "", slug: "", cidade: "Belo Horizonte", estado: "MG" });

  const criarBairro = useMutation({
    mutationFn: () => adminSalvarBairro({ data: { ...novoBairro, destaque: false, ordem: 0 } }),
    onSuccess: async () => {
      toast.success("Bairro criado");
      const r = await qc.fetchQuery({ queryKey: ["bairros"], queryFn: () => listarBairros() });
      const created = r?.find((b) => b.slug === novoBairro.slug);
      if (created) setForm((f) => ({ ...f, bairro_id: created.id }));
      setNovoBairroOpen(false);
      setNovoBairro({ nome: "", slug: "", cidade: "Belo Horizonte", estado: "MG" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerarIA = useMutation({
    mutationFn: () => {
      const bairroNome = bairros.data?.find((b) => b.id === form.bairro_id)?.nome ?? "";
      return gerarDescricaoImovel({
        data: {
          titulo: form.titulo,
          tipo: form.tipo,
          finalidade: form.finalidade,
          bairro: bairroNome,
          endereco: form.endereco,
          quartos: form.quartos,
          suites: form.suites,
          banheiros: form.banheiros,
          vagas: form.vagas,
          area_util: form.area_util,
          area_total: form.area_total,
          preco: form.preco,
          preco_sob_consulta: form.preco_sob_consulta,
          caracteristicas: caracTxt.split(",").map((s: string) => s.trim()).filter(Boolean),
          tom: tomIA,
        },
      });
    },
    onSuccess: (r) => {
      setForm((f) => ({ ...f, descricao: r.descricao }));
      toast.success("Descrição gerada com IA");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Assina URLs (miniaturas 400px) para preview das imagens existentes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const img of imagens) {
        if (img.url.startsWith("http")) { map[img.id] = img.url; continue; }
        try {
          const { url } = await adminAssinarUrl({ data: { bucket: "imoveis", path: img.url, width: 400, quality: 65 } });
          map[img.id] = url;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) { /* ignore */ }
      }
      if (!cancelled) setSignedUrls(map);
    })();
    return () => { cancelled = true; };
  }, [imagens]);

  // Estado dos inputs de ordem (string por id de imagem)
  const [ordens, setOrdens] = useState<Record<string, string>>({});
  useEffect(() => {
    setOrdens((prev) => {
      const next: Record<string, string> = {};
      for (const img of imagens) {
        next[img.id] = prev[img.id] ?? (img.ordem > 0 ? String(img.ordem) : "");
      }
      return next;
    });
  }, [imagens]);
  const [savingOrdem, setSavingOrdem] = useState(false);
  const [zoomImg, setZoomImg] = useState<{ id: string; url: string } | null>(null);

  const salvar = useMutation({
    mutationFn: () =>
      adminSalvarImovel({
        data: {
          ...form,
          caracteristicas: caracTxt.split(",").map((s: string) => s.trim()).filter(Boolean),
        },
      }),
    onSuccess: (r) => {
      toast.success("Imóvel salvo");
      qc.invalidateQueries({ queryKey: ["admin", "imoveis"] });
      if (!form.id && r.id) navigate({ to: "/admin/imoveis/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !form.id) {
      toast.error("Salve o imóvel antes de adicionar imagens.");
      return;
    }
    const restante = MAX_IMAGENS - imagens.length;
    if (restante <= 0) {
      toast.error(`Limite de ${MAX_IMAGENS} imagens atingido.`);
      e.target.value = "";
      return;
    }
    const arr = Array.from(files);
    const aEnviar = arr.slice(0, restante);
    if (arr.length > restante) {
      toast.warning(`Apenas ${restante} imagem(ns) serão enviadas (limite de ${MAX_IMAGENS}).`);
    }
    setUploading(true);
    try {
      for (const [idx, file] of aEnviar.entries()) {
        const ext = file.name.split(".").pop();
        const path = `${form.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("imoveis").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        await adminAdicionarImagem({
          data: { imovel_id: form.id, url: path, alt: form.titulo, ordem: imagens.length + idx },
        });
      }
      toast.success("Imagens enviadas");
      const { data: imgs } = await supabase
        .from("imovel_imagens")
        .select("id, url, alt, ordem")
        .eq("imovel_id", form.id)
        .order("ordem");
      const lista = imgs ?? [];
      setImagens(lista);
      // Garante capa = primeira imagem
      if (lista.length > 0 && form.imagem_capa !== lista[0].url) {
        setForm((f) => ({ ...f, imagem_capa: lista[0].url }));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removerImg(img: Imagem) {
    if (!confirm("Remover esta imagem?")) return;
    try {
      await adminRemoverImagem({ data: { id: img.id, path: img.url } });
      setImagens((prev) => prev.filter((i) => i.id !== img.id));
      setOrdens((prev) => {
        const next = { ...prev };
        delete next[img.id];
        return next;
      });
      toast.success("Imagem removida");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // ===== Validação de ordens =====
  const valoresOrdem = imagens.map((i) => (ordens[i.id] ?? "").trim());
  const numeros = valoresOrdem.map((v) => (v === "" ? null : Number(v)));
  const duplicados = new Set<number>();
  {
    const seen = new Set<number>();
    for (const n of numeros) {
      if (n === null || !Number.isFinite(n)) continue;
      if (seen.has(n)) duplicados.add(n);
      else seen.add(n);
    }
  }
  const todosValidos =
    imagens.length > 0 &&
    numeros.every(
      (n) => n !== null && Number.isInteger(n) && n >= 1 && n <= imagens.length,
    );
  const temCapa = numeros.some((n) => n === 1);
  const podeSalvarOrdem =
    !!form.id && todosValidos && duplicados.size === 0 && temCapa && !savingOrdem;

  function numerarSequencial() {
    const novo: Record<string, string> = {};
    // Preserva quem já tem ordem; preenche o resto sequencialmente
    const usados = new Set<number>();
    imagens.forEach((img) => {
      const v = Number(ordens[img.id]);
      if (Number.isInteger(v) && v >= 1 && v <= imagens.length && !usados.has(v)) {
        novo[img.id] = String(v);
        usados.add(v);
      }
    });
    let proximo = 1;
    imagens.forEach((img) => {
      if (novo[img.id]) return;
      while (usados.has(proximo)) proximo++;
      novo[img.id] = String(proximo);
      usados.add(proximo);
      proximo++;
    });
    setOrdens(novo);
  }

  async function salvarOrdem() {
    if (!form.id || !podeSalvarOrdem) return;
    setSavingOrdem(true);
    try {
      const mapeadas = imagens
        .map((img) => ({ img, ordem: Number(ordens[img.id]) }))
        .sort((a, b) => a.ordem - b.ordem);
      const capa = mapeadas.find((m) => m.ordem === 1)?.img.url ?? null;
      await adminReordenarImagens({
        data: {
          imovel_id: form.id,
          ordem: mapeadas.map((m) => ({ id: m.img.id, ordem: m.ordem })),
          imagem_capa: capa,
        },
      });
      setImagens(mapeadas.map((m) => ({ ...m.img, ordem: m.ordem })));
      setForm((f) => ({ ...f, imagem_capa: capa ?? "" }));
      toast.success("Ordem salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingOrdem(false);
    }
  }

  async function abrirZoom(img: Imagem) {
    if (img.url.startsWith("http")) {
      setZoomImg({ id: img.id, url: img.url });
      return;
    }
    try {
      const { url } = await adminAssinarUrl({
        data: { bucket: "imoveis", path: img.url, width: 1600, quality: 85 },
      });
      setZoomImg({ id: img.id, url });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Grid 5x4 só quando todas as imagens já têm ordem persistida (>0)
  const ordenadasSalvas = [...imagens]
    .filter((i) => i.ordem > 0)
    .sort((a, b) => a.ordem - b.ordem);
  const mostrarGrid = ordenadasSalvas.length === imagens.length && imagens.length > 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{form.id ? "Editar imóvel" : "Novo imóvel"}</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/imoveis" })}>Cancelar</Button>
          <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-display text-lg">Informações principais</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Código *</Label><Input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
          <div><Label>Slug (URL) *</Label><Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Título *</Label><Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="md:col-span-2">
            <div className="flex items-end justify-between gap-2 mb-1">
              <Label>Descrição</Label>
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
            <Textarea rows={6} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">A IA usa os campos preenchidos abaixo (tipo, bairro, quartos, área, preço, características).</p>
          </div>
          <div>
            <Label>Finalidade</Label>
            <Select value={form.finalidade} onValueChange={(v) => setForm({ ...form, finalidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{finalidades.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statusList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Bairro</Label>
              <Dialog open={novoBairroOpen} onOpenChange={setNovoBairroOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs text-petroleum hover:underline inline-flex items-center gap-1">
                    <Plus className="size-3" /> Novo bairro
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo bairro</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={novoBairro.nome}
                        onChange={(e) => {
                          const nome = e.target.value;
                          const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                          setNovoBairro({ ...novoBairro, nome, slug });
                        }}
                      />
                    </div>
                    <div><Label>Slug *</Label><Input value={novoBairro.slug} onChange={(e) => setNovoBairro({ ...novoBairro, slug: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Cidade</Label><Input value={novoBairro.cidade} onChange={(e) => setNovoBairro({ ...novoBairro, cidade: e.target.value })} /></div>
                      <div><Label>Estado</Label><Input value={novoBairro.estado} onChange={(e) => setNovoBairro({ ...novoBairro, estado: e.target.value })} /></div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setNovoBairroOpen(false)}>Cancelar</Button>
                    <Button type="button" disabled={!novoBairro.nome || !novoBairro.slug || criarBairro.isPending} onClick={() => criarBairro.mutate()}>
                      {criarBairro.isPending ? "Salvando…" : "Criar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={form.bairro_id ?? ""} onValueChange={(v) => setForm({ ...form, bairro_id: v || null })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>{bairros.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-display text-lg">Valores e medidas</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><Label>Preço (R$)</Label><Input type="number" value={form.preco ?? ""} onChange={(e) => setForm({ ...form, preco: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="flex items-center gap-2 pt-7"><Switch checked={form.preco_sob_consulta} onCheckedChange={(v) => setForm({ ...form, preco_sob_consulta: v })} /><Label>Sob consulta</Label></div>
          <div></div>
          <div><Label>Área útil (m²)</Label><Input type="number" value={form.area_util ?? ""} onChange={(e) => setForm({ ...form, area_util: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Área total (m²)</Label><Input type="number" value={form.area_total ?? ""} onChange={(e) => setForm({ ...form, area_total: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Quartos</Label><Input type="number" value={form.quartos ?? ""} onChange={(e) => setForm({ ...form, quartos: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Suítes</Label><Input type="number" value={form.suites ?? ""} onChange={(e) => setForm({ ...form, suites: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Banheiros</Label><Input type="number" value={form.banheiros ?? ""} onChange={(e) => setForm({ ...form, banheiros: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Vagas</Label><Input type="number" value={form.vagas ?? ""} onChange={(e) => setForm({ ...form, vagas: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-display text-lg">Localização e marcação</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div><Label>Latitude</Label><Input type="number" step="any" value={form.latitude ?? ""} onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Longitude</Label><Input type="number" step="any" value={form.longitude ?? ""} onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Selo (badge)</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="ex: Lançamento, Exclusivo" /></div>
          <div className="flex items-center gap-6 pt-7">
            <div className="flex items-center gap-2"><Switch checked={form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} /><Label>Destaque</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.exclusivo} onCheckedChange={(v) => setForm({ ...form, exclusivo: v })} /><Label>Exclusivo</Label></div>
          </div>
          <div className="md:col-span-2"><Label>Características (separadas por vírgula)</Label><Textarea rows={2} value={caracTxt} onChange={(e) => setCaracTxt(e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <h2 className="font-display text-lg">Tour virtual e vídeo</h2>
        <p className="text-xs text-muted-foreground -mt-1">
          Cole a URL pública. Suportado: YouTube, Vimeo, Matterport, Kuula (ou qualquer URL de embed).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>URL do vídeo</Label>
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            />
          </div>
          <div>
            <Label>URL do tour 360°</Label>
            <Input
              type="url"
              placeholder="https://my.matterport.com/show/?m=..."
              value={form.tour_url}
              onChange={(e) => setForm({ ...form, tour_url: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display text-lg">Galeria de imagens</h2>
          <span className="text-xs text-muted-foreground">
            {imagens.length}/{MAX_IMAGENS} fotos
          </span>
        </div>
        {!form.id && <p className="text-sm text-muted-foreground">Salve o imóvel para começar a enviar imagens.</p>}
        {form.id && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm ${
                  imagens.length >= MAX_IMAGENS || uploading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-petroleum text-linen cursor-pointer"
                }`}
              >
                <Upload className="size-4" />
                {uploading ? "Enviando…" : imagens.length >= MAX_IMAGENS ? "Limite atingido" : "Adicionar imagens"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading || imagens.length >= MAX_IMAGENS}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Máximo de {MAX_IMAGENS} imagens. Arraste para reordenar — a primeira é a capa (👑).
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagens.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(idx)}
                  onDragEnd={() => setDragIdx(null)}
                  className={`relative group rounded overflow-hidden border border-foreground/10 aspect-[4/3] bg-muted cursor-move ${
                    dragIdx === idx ? "opacity-50" : ""
                  }`}
                >
                  {signedUrls[img.id] && <img src={signedUrls[img.id]} alt="" className="w-full h-full object-cover pointer-events-none" />}
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-gold text-petroleum text-xs px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Crown className="size-3" /> Capa
                    </span>
                  )}
                  <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </span>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                    <GripVertical className="size-3" />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button type="button" size="icon" variant="destructive" onClick={() => removerImg(img)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>


      {form.id && (
        <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-3">
          <h2 className="font-display text-lg">Instagram</h2>
          <p className="text-sm text-muted-foreground">
            Gere legenda + hashtags com IA, edite e baixe um ZIP com as fotos prontas para postar.
          </p>
          <InstagramPostManager
            imovelId={form.id}
            titulo={form.titulo}
            imagens={imagens}
            signedUrls={signedUrls}
          />
        </div>
      )}
    </form>
  );
}
