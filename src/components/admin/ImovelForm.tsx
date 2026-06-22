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
  adminSalvarCidade,
  adminReordenarImagens,
  adminDefinirCapa,
} from "@/lib/api/admin.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { gerarDescricaoImovel } from "@/lib/api/ia.functions";
import { listarBairros, listarCidades } from "@/lib/api/catalogo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Upload, Sparkles, Crown } from "lucide-react";
import { InstagramPostManager } from "./InstagramPostManager";
import { useEffect } from "react";


type Imagem = { id: string; url: string; alt?: string | null; ordem: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImovelData = any;

function ordemInicial(img: Imagem) {
  return Number.isInteger(img.ordem) && img.ordem > 0 ? String(img.ordem) : "0";
}

interface Props { initial?: ImovelData }

const tipos = ["apartamento", "cobertura", "casa", "casa_condominio", "terreno", "comercial"];
const finalidades = ["venda", "aluguel", "lancamento"];
const statusList = ["ativo", "rascunho", "vendido", "reservado"];
const MAX_IMAGENS = 20;

export function ImovelForm({ initial }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bairros = useQuery({ queryKey: ["bairros"], queryFn: () => listarBairros() });
  const cidades = useQuery({ queryKey: ["cidades"], queryFn: () => listarCidades() });
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
    mostrar_rua: initial?.mostrar_rua ?? false,
    mostrar_endereco_completo: initial?.mostrar_endereco_completo ?? false,
  });

  const [caracTxt, setCaracTxt] = useState((initial?.caracteristicas ?? []).join(", "));
  const [imagens, setImagens] = useState<Imagem[]>(initial?.imagens ?? []);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [tomIA, setTomIA] = useState<"sofisticado" | "objetivo" | "acolhedor">("sofisticado");
  const [novoBairroOpen, setNovoBairroOpen] = useState(false);
  const [novoBairro, setNovoBairro] = useState<{ nome: string; slug: string; cidade_id: string | null }>({ nome: "", slug: "", cidade_id: null });
  const [novaCidadeOpen, setNovaCidadeOpen] = useState(false);
  const [novaCidade, setNovaCidade] = useState({ nome: "", slug: "", estado: "MG" });

  const criarBairro = useMutation({
    mutationFn: () => adminSalvarBairro({ data: { ...novoBairro, destaque: false } }),
    onSuccess: async () => {
      toast.success("Bairro criado");
      const r = await qc.fetchQuery({ queryKey: ["bairros"], queryFn: () => listarBairros() });
      const created = r?.find((b) => b.slug === novoBairro.slug);
      if (created) setForm((f) => ({ ...f, bairro_id: created.id }));
      setNovoBairroOpen(false);
      setNovoBairro({ nome: "", slug: "", cidade_id: null });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const criarCidade = useMutation({
    mutationFn: () => adminSalvarCidade({ data: novaCidade }),
    onSuccess: async () => {
      toast.success("Cidade criada");
      const r = await qc.fetchQuery({ queryKey: ["cidades"], queryFn: () => listarCidades() });
      const created = r?.find((c) => c.slug === novaCidade.slug);
      if (created) setNovoBairro((b) => ({ ...b, cidade_id: created.id }));
      setNovaCidadeOpen(false);
      setNovaCidade({ nome: "", slug: "", estado: "MG" });
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

  // Estado dos inputs de ordem (string por id de imagem). 0 = ainda não definido.
  const [ordens, setOrdens] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.imagens ?? []).map((img: Imagem) => [img.id, ordemInicial(img)])),
  );
  useEffect(() => {
    setOrdens((prev) => {
      const next: Record<string, string> = {};
      for (const img of imagens) {
        next[img.id] = prev[img.id] ?? ordemInicial(img);
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
      for (const file of aEnviar) {
        const sanitized = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9._-]+/g, "_");
        const prefix = crypto.randomUUID().slice(0, 8);
        const path = `${form.id}/${prefix}-${sanitized}`;
        const { error: upErr } = await supabase.storage.from("imoveis").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        await adminAdicionarImagem({
          data: { imovel_id: form.id, url: path, alt: form.titulo, ordem: 0 },
        });
      }
      toast.success("Imagens enviadas");
      const { data: imgs } = await supabase
        .from("imovel_imagens")
        .select("id, url, alt, ordem")
        .eq("imovel_id", form.id);
      const lista = imgs ?? [];
      // Preserva a ordem visual da tabela: mantém as existentes na mesma posição
      // e adiciona as novas ao final.
      setImagens((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const atualizadas = prev.map((p) => {
          const fresh = lista.find((l) => l.id === p.id);
          return fresh ? { ...p, ordem: fresh.ordem, url: fresh.url, alt: fresh.alt } : p;
        });
        const novos = lista.filter((i) => !prevIds.has(i.id));
        return [...atualizadas, ...novos];
      });

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

  const [apagandoTodas, setApagandoTodas] = useState(false);
  async function apagarTodasImagens() {
    if (imagens.length === 0) return;
    if (!confirm("Todas as imagens serão apagadas. Confirma?")) return;
    setApagandoTodas(true);
    try {
      for (const img of imagens) {
        await adminRemoverImagem({ data: { id: img.id, path: img.url } });
      }
      setImagens([]);
      setOrdens({});
      setForm((f) => ({ ...f, imagem_capa: "" }));
      toast.success("Todas as imagens foram apagadas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApagandoTodas(false);
    }
  }

  // Conjunto de números duplicados (apenas para destacar visualmente as células)
  const duplicados = (() => {
    const seen = new Set<number>();
    const dups = new Set<number>();
    for (const img of imagens) {
      const v = ordens[img.id];
      const n = v == null || v === "" || v === "0" ? null : Number(v);
      if (n === null || !Number.isFinite(n)) continue;
      if (seen.has(n)) dups.add(n);
      else seen.add(n);
    }
    return dups;
  })();


  function numerarSequencial() {
    const novo: Record<string, string> = {};
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
    if (!form.id) return;
    if (imagens.length === 0) {
      toast.error("Não há imagens para ordenar.");
      return;
    }
    // Validação no clique (botão fica sempre habilitado)
    const valores = imagens.map((i) => (ordens[i.id] ?? "0").trim());
    const nums = valores.map((v) => (v === "" ? NaN : Number(v)));
    const invalidos = nums.some(
      (n) => !Number.isInteger(n) || n < 1 || n > imagens.length,
    );
    if (invalidos) {
      toast.error(`Defina um número entre 1 e ${imagens.length} para cada foto.`);
      return;
    }
    const seen = new Set<number>();
    const dup: number[] = [];
    for (const n of nums) {
      if (seen.has(n)) dup.push(n);
      else seen.add(n);
    }
    if (dup.length > 0) {
      toast.error(`Há números repetidos: ${[...new Set(dup)].join(", ")}.`);
      return;
    }
    if (!nums.includes(1)) {
      toast.error("Defina a capa atribuindo o número 1 a uma foto.");
      return;
    }

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
      setImagens((prev) =>
        prev.map((i) => {
          const m = mapeadas.find((x) => x.img.id === i.id);
          return m ? { ...i, ordem: m.ordem } : i;
        }),
      );
      setForm((f) => ({ ...f, imagem_capa: capa ?? "" }));
      qc.invalidateQueries({ queryKey: ["admin", "imoveis"] });
      toast.success("Ordem salva — capa definida pela foto nº 1.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingOrdem(false);
    }
  }



  async function definirComoCapa(img: Imagem) {
    if (!form.id) return;
    try {
      const r = await adminDefinirCapa({ data: { imovel_id: form.id, imagem_id: img.id } });
      setForm((f) => ({ ...f, imagem_capa: r.imagem_capa }));
      qc.invalidateQueries({ queryKey: ["admin", "imoveis"] });
      toast.success("Capa definida — visível no site público.");
    } catch (e) {
      toast.error((e as Error).message);
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
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs">
                    <Plus className="size-3 mr-1" /> Novo bairro
                  </Button>
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
          <div><Label>Preço (R$)</Label><Input
            inputMode="numeric"
            value={form.preco != null ? new Intl.NumberFormat("pt-BR").format(form.preco) : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setForm({ ...form, preco: digits ? Number(digits) : null });
            }}
            placeholder="R$ 0"
          /></div>
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
          <div className="md:col-span-2 flex flex-col gap-3 rounded border border-dashed border-foreground/15 p-3">
            <p className="text-xs text-muted-foreground">
              Controla o que aparece no site público. Se ambos desmarcados, mostra apenas o bairro no mapa.
            </p>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.mostrar_rua}
                onCheckedChange={(v) => setForm({ ...form, mostrar_rua: v, mostrar_endereco_completo: v ? false : form.mostrar_endereco_completo })}
              />
              <Label>Mostrar endereço (somente nome da Rua/Av + bairro)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.mostrar_endereco_completo}
                onCheckedChange={(v) => setForm({ ...form, mostrar_endereco_completo: v, mostrar_rua: v ? false : form.mostrar_rua })}
              />
              <Label>Mostrar endereço completo (rua + número + bairro)</Label>
            </div>
          </div>
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
              <Button type="button" variant="outline" size="sm" onClick={numerarSequencial} disabled={imagens.length === 0}>
                Numerar sequencialmente
              </Button>
              <Button type="button" size="sm" onClick={salvarOrdem} disabled={savingOrdem || imagens.length === 0}>
                {savingOrdem ? "Salvando…" : "Salvar ordem"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={apagarTodasImagens}
                disabled={imagens.length === 0 || apagandoTodas}
              >
                <Trash2 className="size-4 mr-1" />
                {apagandoTodas ? "Apagando…" : "Apagar todas"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Defina um número (1–{imagens.length || MAX_IMAGENS}) para cada foto e clique <strong>Salvar ordem</strong>. Para trocar apenas a <strong>capa <Crown className="inline size-3 -mt-0.5" /></strong> sem mexer na ordem, clique no ícone de coroa na linha da imagem.
              </p>

            </div>

            {imagens.length > 0 && (
              <div className="border border-foreground/10 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 w-[70%]">Imagem</th>
                      <th className="text-left p-2">Ordem</th>
                      <th className="p-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {imagens.map((img, idx) => {
                      const valor = ordens[img.id] ?? "0";
                      const num = valor === "" || valor === "0" ? null : Number(valor);
                      const ehDup = num !== null && duplicados.has(num);
                      const foraRange =
                        num !== null && (!Number.isInteger(num) || num < 1 || num > imagens.length);
                      const ehCapa = form.imagem_capa === img.url;
                      return (
                        <tr key={img.id} className="border-t border-foreground/5">
                          <td className="p-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => abrirZoom(img)}
                                tabIndex={-1}
                                className="block w-20 h-16 rounded overflow-hidden border border-foreground/10 bg-muted shrink-0"
                                title="Clique para ampliar"
                              >
                                {signedUrls[img.id] && (
                                  <img
                                    src={signedUrls[img.id]}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                                  {img.url.split("/").pop()}
                                </div>
                                {ehCapa && (
                                  <span className="inline-flex items-center gap-1 mt-1 bg-gold text-petroleum text-[10px] px-2 py-0.5 rounded">
                                    <Crown className="size-3" /> Capa
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2 align-top">
                            <Input
                              type="number"
                              min={0}
                              max={imagens.length}
                              inputMode="numeric"
                              value={valor}
                              onChange={(e) =>
                                setOrdens((p) => ({ ...p, [img.id]: e.target.value }))
                              }
                              className={`w-20 ${ehDup || foraRange ? "border-destructive" : ""}`}
                              placeholder="0"
                            />
                            {ehDup && (
                              <p className="text-[11px] text-destructive mt-1">Número repetido</p>
                            )}
                            {foraRange && !ehDup && (
                              <p className="text-[11px] text-destructive mt-1">Use 1–{imagens.length}</p>
                            )}
                          </td>
                          <td className="p-2 align-top">
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                tabIndex={-1}
                                onClick={() => definirComoCapa(img)}
                                title="Definir como capa"
                                disabled={form.imagem_capa === img.url}
                              >
                                <Crown className={`size-4 ${form.imagem_capa === img.url ? "text-gold" : ""}`} />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                tabIndex={-1}
                                onClick={() => removerImg(img)}
                                title="Remover"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {mostrarGrid && (
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Pré-visualização (ordem salva)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {ordenadasSalvas.map((img) => (
                    <button
                      type="button"
                      key={img.id}
                      onClick={() => abrirZoom(img)}
                      className="relative aspect-[4/3] rounded overflow-hidden border border-foreground/10 bg-muted group"
                    >
                      {signedUrls[img.id] && (
                        <img
                          src={signedUrls[img.id]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      )}
                      {img.ordem === 1 && (
                        <span className="absolute top-1 left-1 bg-gold text-petroleum text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                          <Crown className="size-3" /> Capa
                        </span>
                      )}
                      <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        {img.ordem}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Dialog open={!!zoomImg} onOpenChange={(o) => !o && setZoomImg(null)}>
              <DialogContent className="max-w-5xl p-2">
                <DialogHeader className="sr-only">
                  <DialogTitle>Visualizar imagem</DialogTitle>
                </DialogHeader>
                {zoomImg && (
                  <img src={zoomImg.url} alt="" className="w-full h-auto max-h-[80vh] object-contain rounded" />
                )}
              </DialogContent>
            </Dialog>
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
