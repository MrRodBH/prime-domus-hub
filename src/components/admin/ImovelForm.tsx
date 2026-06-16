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
} from "@/lib/api/admin.functions";
import { gerarDescricaoImovel } from "@/lib/api/ia.functions";
import { listarBairros } from "@/lib/api/catalogo.functions";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Upload, Sparkles } from "lucide-react";
import { InstagramPostManager } from "./InstagramPostManager";
import { useEffect } from "react";


type Imagem = { id: string; url: string; alt?: string | null; ordem: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImovelData = any;

interface Props { initial?: ImovelData }

const tipos = ["apartamento", "cobertura", "casa", "casa_condominio", "terreno", "comercial"];
const finalidades = ["venda", "aluguel", "lancamento"];
const statusList = ["ativo", "rascunho", "vendido", "reservado"];

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

  // Assina URLs para preview das imagens existentes
  useEffect(() => {
    (async () => {
      const map: Record<string, string> = {};
      for (const img of imagens) {
        if (img.url.startsWith("http")) { map[img.id] = img.url; continue; }
        try {
          const { url } = await adminAssinarUrl({ data: { bucket: "imoveis", path: img.url } });
          map[img.id] = url;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) { /* ignore */ }
      }
      setSignedUrls(map);
    })();
  }, [imagens]);

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
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${form.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("imoveis").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        await adminAdicionarImagem({
          data: { imovel_id: form.id, url: path, alt: form.titulo, ordem: imagens.length },
        });
      }
      toast.success("Imagens enviadas");
      // refetch
      const { data: imgs } = await supabase
        .from("imovel_imagens")
        .select("id, url, alt, ordem")
        .eq("imovel_id", form.id)
        .order("ordem");
      setImagens(imgs ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removerImg(img: Imagem) {
    if (!confirm("Remover esta imagem?")) return;
    await adminRemoverImagem({ data: { id: img.id, path: img.url } });
    setImagens(imagens.filter((i) => i.id !== img.id));
    toast.success("Imagem removida");
  }

  async function definirCapa(img: Imagem) {
    setForm((f) => ({ ...f, imagem_capa: img.url }));
    toast.success("Capa definida — clique em Salvar para confirmar.");
  }

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
            <Label>Bairro</Label>
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
        <h2 className="font-display text-lg">Galeria de imagens</h2>
        {!form.id && <p className="text-sm text-muted-foreground">Salve o imóvel para começar a enviar imagens.</p>}
        {form.id && (
          <>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
                <Upload className="size-4" /> {uploading ? "Enviando…" : "Adicionar imagens"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <p className="text-xs text-muted-foreground">JPG/PNG. A capa atual é a marcada com 👑.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {imagens.map((img) => (
                <div key={img.id} className="relative group rounded overflow-hidden border border-foreground/10 aspect-[4/3] bg-muted">
                  {signedUrls[img.id] && <img src={signedUrls[img.id]} alt="" className="w-full h-full object-cover" />}
                  {form.imagem_capa === img.url && <span className="absolute top-1 left-1 bg-gold text-petroleum text-xs px-2 py-0.5 rounded">👑 Capa</span>}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => definirCapa(img)}>Definir capa</Button>
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
