import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { atualizarSiteSettings } from "@/lib/api/site.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { prefixTenant } from "@/lib/tenant-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Plus, Trash2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { data: any }

/* ============ HOME — Diferenciais ============ */
export function CmsHomeDiferenciaisTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ eyebrow: string; titulo: string; itens: { n: string; title: string; desc: string }[] }>({
    eyebrow: "", titulo: "", itens: [],
  });
  useEffect(() => {
    if (data?.home_diferenciais) setForm({
      eyebrow: data.home_diferenciais.eyebrow ?? "",
      titulo: data.home_diferenciais.titulo ?? "",
      itens: data.home_diferenciais.itens ?? [],
    });
  }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "home_diferenciais", value: form } }),
    onSuccess: () => { toast.success("Diferenciais salvos"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  function upd(i: number, k: "n" | "title" | "desc", v: string) {
    const arr = [...form.itens]; arr[i] = { ...arr[i], [k]: v }; setForm({ ...form, itens: arr });
  }
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Eyebrow</Label><Input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} /></div>
        <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      </div>
      <div className="space-y-3">
        {form.itens.map((it, i) => (
          <div key={i} className="grid md:grid-cols-[70px_1fr_2fr_auto] gap-2 items-start border border-foreground/5 p-3 rounded">
            <Input placeholder="01" value={it.n} onChange={(e) => upd(i, "n", e.target.value)} />
            <Input placeholder="Título" value={it.title} onChange={(e) => upd(i, "title", e.target.value)} />
            <Textarea rows={2} placeholder="Descrição" value={it.desc} onChange={(e) => upd(i, "desc", e.target.value)} />
            <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, itens: form.itens.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, itens: [...form.itens, { n: String(form.itens.length + 1).padStart(2, "0"), title: "", desc: "" }] })}>
          <Plus className="size-4 mr-1" /> Adicionar diferencial
        </Button>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar diferenciais</Button>
    </div>
  );
}

/* ============ HOME — Depoimentos ============ */
export function CmsHomeDepoimentosTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ eyebrow: string; titulo: string; itens: { quote: string; name: string; role: string }[] }>({
    eyebrow: "", titulo: "", itens: [],
  });
  useEffect(() => {
    if (data?.home_depoimentos) setForm({
      eyebrow: data.home_depoimentos.eyebrow ?? "",
      titulo: data.home_depoimentos.titulo ?? "",
      itens: data.home_depoimentos.itens ?? [],
    });
  }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "home_depoimentos", value: form } }),
    onSuccess: () => { toast.success("Depoimentos salvos"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  function upd(i: number, k: "quote" | "name" | "role", v: string) {
    const arr = [...form.itens]; arr[i] = { ...arr[i], [k]: v }; setForm({ ...form, itens: arr });
  }
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Eyebrow</Label><Input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} /></div>
        <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      </div>
      <div className="space-y-3">
        {form.itens.map((it, i) => (
          <div key={i} className="grid gap-2 border border-foreground/5 p-3 rounded">
            <Textarea rows={3} placeholder="Depoimento" value={it.quote} onChange={(e) => upd(i, "quote", e.target.value)} />
            <div className="grid md:grid-cols-2 gap-2">
              <Input placeholder="Nome" value={it.name} onChange={(e) => upd(i, "name", e.target.value)} />
              <Input placeholder="Cargo/Descrição" value={it.role} onChange={(e) => upd(i, "role", e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, itens: form.itens.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4 mr-1" /> Remover
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, itens: [...form.itens, { quote: "", name: "", role: "" }] })}>
          <Plus className="size-4 mr-1" /> Adicionar depoimento
        </Button>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar depoimentos</Button>
    </div>
  );
}

/* ============ Página Sobre ============ */
export function CmsPaginaSobreTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    hero_eyebrow: string; hero_titulo: string; hero_subtitle: string;
    hero_image_path: string | null;
    blocos: { titulo?: string; texto: string }[];
    stats: { valor: string; label: string }[];
    cta_titulo: string; cta_texto: string; cta_label: string; cta_url: string;
    meta_title: string; meta_description: string;
  }>({
    hero_eyebrow: "", hero_titulo: "", hero_subtitle: "", hero_image_path: null,
    blocos: [], stats: [],
    cta_titulo: "", cta_texto: "", cta_label: "", cta_url: "",
    meta_title: "", meta_description: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (data?.pagina_sobre) {
      setForm({
        hero_eyebrow: data.pagina_sobre.hero_eyebrow ?? "",
        hero_titulo: data.pagina_sobre.hero_titulo ?? "",
        hero_subtitle: data.pagina_sobre.hero_subtitle ?? "",
        hero_image_path: data.pagina_sobre.hero_image_path ?? null,
        blocos: data.pagina_sobre.blocos ?? [],
        stats: data.pagina_sobre.stats ?? [],
        cta_titulo: data.pagina_sobre.cta_titulo ?? "",
        cta_texto: data.pagina_sobre.cta_texto ?? "",
        cta_label: data.pagina_sobre.cta_label ?? "",
        cta_url: data.pagina_sobre.cta_url ?? "",
        meta_title: data.pagina_sobre.meta_title ?? "",
        meta_description: data.pagina_sobre.meta_description ?? "",
      });
      setPreview(data.pagina_sobre.hero_image_url ?? null);
    }
  }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "pagina_sobre", value: form } }),
    onSuccess: () => { toast.success("Página Sobre salva"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const path = prefixTenant(`sobre-${Date.now()}.${file.name.split(".").pop()}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setForm({ ...form, hero_image_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setPreview(url);
      toast.success("Imagem enviada — clique em Salvar.");
    } catch (err) { toast.error((err as Error).message); }
    finally { setUploading(false); e.target.value = ""; }
  }
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-xl">Hero</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Eyebrow</Label><Input value={form.hero_eyebrow} onChange={(e) => setForm({ ...form, hero_eyebrow: e.target.value })} /></div>
          <div><Label>Título</Label><Input value={form.hero_titulo} onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Subtítulo</Label><Textarea rows={2} value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} /></div>
        </div>
        <div>
          <Label>Imagem opcional (topo da página)</Label>
          <div className="flex items-center gap-4 mt-2">
            {preview && <img src={preview} alt="" className="h-20 w-32 object-cover rounded border border-foreground/10" />}
            <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
              <Upload className="size-4" /> {uploading ? "Enviando…" : preview ? "Trocar" : "Enviar imagem"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
            </label>
            {preview && <Button variant="ghost" size="sm" onClick={() => { setForm({ ...form, hero_image_path: null }); setPreview(null); }}>Remover</Button>}
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">Blocos de texto</h3>
        {form.blocos.map((b, i) => (
          <div key={i} className="border border-foreground/5 p-3 rounded space-y-2">
            <Input placeholder="Título (opcional)" value={b.titulo ?? ""} onChange={(e) => { const arr = [...form.blocos]; arr[i] = { ...arr[i], titulo: e.target.value }; setForm({ ...form, blocos: arr }); }} />
            <Textarea rows={4} placeholder="Texto do bloco" value={b.texto} onChange={(e) => { const arr = [...form.blocos]; arr[i] = { ...arr[i], texto: e.target.value }; setForm({ ...form, blocos: arr }); }} />
            <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, blocos: form.blocos.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4 mr-1" /> Remover
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, blocos: [...form.blocos, { texto: "" }] })}>
          <Plus className="size-4 mr-1" /> Adicionar bloco
        </Button>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">Estatísticas (opcional)</h3>
        {form.stats.map((s, i) => (
          <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
            <Input placeholder="Ex: 500+" value={s.valor} onChange={(e) => { const arr = [...form.stats]; arr[i] = { ...arr[i], valor: e.target.value }; setForm({ ...form, stats: arr }); }} />
            <Input placeholder="Ex: imóveis vendidos" value={s.label} onChange={(e) => { const arr = [...form.stats]; arr[i] = { ...arr[i], label: e.target.value }; setForm({ ...form, stats: arr }); }} />
            <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, stats: [...form.stats, { valor: "", label: "" }] })}>
          <Plus className="size-4 mr-1" /> Adicionar estatística
        </Button>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">CTA final (opcional)</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Título</Label><Input value={form.cta_titulo} onChange={(e) => setForm({ ...form, cta_titulo: e.target.value })} /></div>
          <div><Label>Texto do botão</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Texto</Label><Textarea rows={2} value={form.cta_texto} onChange={(e) => setForm({ ...form, cta_texto: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>URL do botão</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/contato" /></div>
        </div>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">SEO</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Meta title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></div>
          <div><Label>Meta description</Label><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
        </div>
      </section>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar página Sobre</Button>
    </div>
  );
}

/* ============ Página Contato ============ */
export function CmsPaginaContatoTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    hero_eyebrow: "", hero_titulo: "", hero_subtitle: "",
    form_titulo: "", form_texto: "", form_botao: "",
    mapa_url: "", horario_atendimento: "",
    meta_title: "", meta_description: "",
  });
  useEffect(() => { if (data?.pagina_contato) setForm({ ...form, ...data.pagina_contato }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "pagina_contato", value: form } }),
    onSuccess: () => { toast.success("Página Contato salva"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <p className="text-xs text-muted-foreground">Textos institucionais da página. Os dados de contato (endereço, telefone, e-mail, redes) vêm das abas <strong>Empresa</strong> e <strong>Contato</strong> global.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Eyebrow</Label><Input value={form.hero_eyebrow} onChange={(e) => setForm({ ...form, hero_eyebrow: e.target.value })} /></div>
        <div><Label>Título</Label><Input value={form.hero_titulo} onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Subtítulo</Label><Textarea rows={2} value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} /></div>
        <div><Label>Título do formulário</Label><Input value={form.form_titulo} onChange={(e) => setForm({ ...form, form_titulo: e.target.value })} /></div>
        <div><Label>Botão de envio</Label><Input value={form.form_botao} onChange={(e) => setForm({ ...form, form_botao: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Texto de apoio (acima do form)</Label><Textarea rows={2} value={form.form_texto} onChange={(e) => setForm({ ...form, form_texto: e.target.value })} /></div>
        <div><Label>Horário de atendimento</Label><Input value={form.horario_atendimento} onChange={(e) => setForm({ ...form, horario_atendimento: e.target.value })} placeholder="Seg-Sex, 9h-18h" /></div>
        <div><Label>URL do mapa (embed do Google Maps)</Label><Input value={form.mapa_url} onChange={(e) => setForm({ ...form, mapa_url: e.target.value })} placeholder="https://www.google.com/maps/embed?..." /></div>
        <div><Label>Meta title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></div>
        <div><Label>Meta description</Label><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar página Contato</Button>
    </div>
  );
}

/* ============ Página Anuncie ============ */
export function CmsPaginaAnuncieTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    hero_eyebrow: string; hero_titulo: string; hero_subtitle: string; hero_image_path: string | null;
    beneficios_eyebrow: string; beneficios_titulo: string; beneficios: { titulo: string; desc: string }[];
    form_titulo: string; form_texto: string; form_botao: string;
    meta_title: string; meta_description: string;
  }>({
    hero_eyebrow: "", hero_titulo: "", hero_subtitle: "", hero_image_path: null,
    beneficios_eyebrow: "", beneficios_titulo: "", beneficios: [],
    form_titulo: "", form_texto: "", form_botao: "",
    meta_title: "", meta_description: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (data?.pagina_anuncie) {
      setForm({
        hero_eyebrow: data.pagina_anuncie.hero_eyebrow ?? "",
        hero_titulo: data.pagina_anuncie.hero_titulo ?? "",
        hero_subtitle: data.pagina_anuncie.hero_subtitle ?? "",
        hero_image_path: data.pagina_anuncie.hero_image_path ?? null,
        beneficios_eyebrow: data.pagina_anuncie.beneficios_eyebrow ?? "",
        beneficios_titulo: data.pagina_anuncie.beneficios_titulo ?? "",
        beneficios: data.pagina_anuncie.beneficios ?? [],
        form_titulo: data.pagina_anuncie.form_titulo ?? "",
        form_texto: data.pagina_anuncie.form_texto ?? "",
        form_botao: data.pagina_anuncie.form_botao ?? "",
        meta_title: data.pagina_anuncie.meta_title ?? "",
        meta_description: data.pagina_anuncie.meta_description ?? "",
      });
      setPreview(data.pagina_anuncie.hero_image_url ?? null);
    }
  }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "pagina_anuncie", value: form } }),
    onSuccess: () => { toast.success("Página Anuncie salva"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const path = prefixTenant(`anuncie-${Date.now()}.${file.name.split(".").pop()}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setForm({ ...form, hero_image_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setPreview(url);
      toast.success("Imagem enviada — clique em Salvar.");
    } catch (err) { toast.error((err as Error).message); }
    finally { setUploading(false); e.target.value = ""; }
  }
  function updBen(i: number, k: "titulo" | "desc", v: string) {
    const arr = [...form.beneficios]; arr[i] = { ...arr[i], [k]: v }; setForm({ ...form, beneficios: arr });
  }
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-xl">Hero</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Eyebrow</Label><Input value={form.hero_eyebrow} onChange={(e) => setForm({ ...form, hero_eyebrow: e.target.value })} /></div>
          <div><Label>Título</Label><Input value={form.hero_titulo} onChange={(e) => setForm({ ...form, hero_titulo: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Subtítulo</Label><Textarea rows={2} value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} /></div>
        </div>
        <div>
          <Label>Imagem opcional</Label>
          <div className="flex items-center gap-4 mt-2">
            {preview && <img src={preview} alt="" className="h-20 w-32 object-cover rounded border border-foreground/10" />}
            <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
              <Upload className="size-4" /> {uploading ? "Enviando…" : preview ? "Trocar" : "Enviar imagem"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
            </label>
            {preview && <Button variant="ghost" size="sm" onClick={() => { setForm({ ...form, hero_image_path: null }); setPreview(null); }}>Remover</Button>}
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">Benefícios</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Eyebrow</Label><Input value={form.beneficios_eyebrow} onChange={(e) => setForm({ ...form, beneficios_eyebrow: e.target.value })} /></div>
          <div><Label>Título</Label><Input value={form.beneficios_titulo} onChange={(e) => setForm({ ...form, beneficios_titulo: e.target.value })} /></div>
        </div>
        {form.beneficios.map((b, i) => (
          <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start border border-foreground/5 p-3 rounded">
            <Input placeholder="Título" value={b.titulo} onChange={(e) => updBen(i, "titulo", e.target.value)} />
            <Textarea rows={2} placeholder="Descrição" value={b.desc} onChange={(e) => updBen(i, "desc", e.target.value)} />
            <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, beneficios: form.beneficios.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, beneficios: [...form.beneficios, { titulo: "", desc: "" }] })}>
          <Plus className="size-4 mr-1" /> Adicionar benefício
        </Button>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">Formulário</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Título</Label><Input value={form.form_titulo} onChange={(e) => setForm({ ...form, form_titulo: e.target.value })} /></div>
          <div><Label>Botão</Label><Input value={form.form_botao} onChange={(e) => setForm({ ...form, form_botao: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Texto de apoio</Label><Textarea rows={2} value={form.form_texto} onChange={(e) => setForm({ ...form, form_texto: e.target.value })} /></div>
        </div>
      </section>

      <section className="space-y-3 border-t border-foreground/5 pt-6">
        <h3 className="font-display text-xl">SEO</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Meta title</Label><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} /></div>
          <div><Label>Meta description</Label><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
        </div>
      </section>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar página Anuncie</Button>
    </div>
  );
}
