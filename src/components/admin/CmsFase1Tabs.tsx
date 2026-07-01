import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { atualizarSiteSettings } from "@/lib/api/site.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function CmsEmpresaTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    razao_social: "", nome_fantasia: "", cnpj: "", creci: "",
    responsavel_tecnico: "", fundacao: "", slogan: "", sobre_curto: "",
  });
  useEffect(() => { if (data?.empresa) setForm({ ...form, ...data.empresa }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "empresa", value: form } }),
    onSuccess: () => { toast.success("Dados da empresa salvos"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Razão social</Label><Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} /></div>
        <div><Label>Nome fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
        <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
        <div><Label>CRECI</Label><Input value={form.creci} onChange={(e) => setForm({ ...form, creci: e.target.value })} /></div>
        <div><Label>Responsável técnico</Label><Input value={form.responsavel_tecnico} onChange={(e) => setForm({ ...form, responsavel_tecnico: e.target.value })} /></div>
        <div><Label>Fundação</Label><Input value={form.fundacao} onChange={(e) => setForm({ ...form, fundacao: e.target.value })} placeholder="Ex: 2015" /></div>
        <div className="md:col-span-2"><Label>Slogan</Label><Input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Sobre (versão curta — usada no rodapé)</Label><Textarea rows={3} value={form.sobre_curto} onChange={(e) => setForm({ ...form, sobre_curto: e.target.value })} /></div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar empresa</Button>
    </div>
  );
}

export function CmsBrandingDinamicoTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    color_primary: "", color_secondary: "", color_accent: "",
    color_button: "", color_link: "",
    font_primary: "", font_secondary: "",
  });
  useEffect(() => { if (data?.branding_v2) setForm({ ...form, ...data.branding_v2 }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "branding_v2", value: form } }),
    onSuccess: () => { toast.success("Branding aplicado. Recarregue para ver."); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const colorField = (key: keyof typeof form, label: string, help?: string) => (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" className="h-10 w-14 rounded border border-foreground/10 bg-transparent" value={/^#/.test(form[key] || "") ? (form[key] as string) : "#0f3d44"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        <Input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="#RRGGBB ou oklch(...)" />
      </div>
      {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
    </div>
  );
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {colorField("color_primary", "Cor primária", "Aplicada em botões, títulos e destaques principais.")}
        {colorField("color_secondary", "Cor secundária")}
        {colorField("color_accent", "Cor de destaque")}
        {colorField("color_button", "Cor dos botões")}
        {colorField("color_link", "Cor dos links")}
      </div>
      <div className="grid md:grid-cols-2 gap-4 border-t border-foreground/5 pt-4">
        <div>
          <Label>Fonte principal (sans-serif)</Label>
          <Input value={form.font_primary} onChange={(e) => setForm({ ...form, font_primary: e.target.value })} placeholder="Inter, Poppins, Montserrat…" />
          <p className="text-xs text-muted-foreground mt-1">Nome exato como consta no Google Fonts.</p>
        </div>
        <div>
          <Label>Fonte secundária (títulos)</Label>
          <Input value={form.font_secondary} onChange={(e) => setForm({ ...form, font_secondary: e.target.value })} placeholder="Cormorant Garamond, Playfair Display…" />
        </div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar branding</Button>
      <p className="text-xs text-muted-foreground">As alterações são aplicadas em runtime via CSS Variables. Sem necessidade de build.</p>
    </div>
  );
}

export function CmsSeoGlobalTab({ data }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    default_title: "", default_description: "", keywords: "", twitter_handle: "",
  });
  useEffect(() => { if (data?.seo_global) setForm({ ...form, ...data.seo_global }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "seo_global", value: form } }),
    onSuccess: () => { toast.success("SEO global salvo"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
      <div><Label>Título padrão (fallback quando página não define)</Label><Input value={form.default_title} onChange={(e) => setForm({ ...form, default_title: e.target.value })} maxLength={70} /></div>
      <div><Label>Descrição padrão</Label><Textarea rows={3} value={form.default_description} onChange={(e) => setForm({ ...form, default_description: e.target.value })} maxLength={200} /></div>
      <div><Label>Palavras-chave</Label><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="imóveis, alto padrão, belo horizonte" /></div>
      <div><Label>Handle Twitter/X</Label><Input value={form.twitter_handle} onChange={(e) => setForm({ ...form, twitter_handle: e.target.value })} placeholder="@rmprime" /></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar SEO Global</Button>
    </div>
  );
}

export function CmsRodapeTab({ data }: Props) {
  const qc = useQueryClient();
  type LinkItem = { label: string; url: string };
  const [form, setForm] = useState<{
    copyright: string; coluna1_titulo: string; coluna2_titulo: string;
    coluna1_links: LinkItem[]; coluna2_links: LinkItem[];
    mostrar_redes: boolean; texto_legal: string;
  }>({
    copyright: "", coluna1_titulo: "Explore", coluna2_titulo: "Institucional",
    coluna1_links: [], coluna2_links: [], mostrar_redes: true, texto_legal: "",
  });
  useEffect(() => {
    if (data?.footer) setForm({
      copyright: data.footer.copyright ?? "",
      coluna1_titulo: data.footer.coluna1_titulo ?? "Explore",
      coluna2_titulo: data.footer.coluna2_titulo ?? "Institucional",
      coluna1_links: data.footer.coluna1_links ?? [],
      coluna2_links: data.footer.coluna2_links ?? [],
      mostrar_redes: data.footer.mostrar_redes !== false,
      texto_legal: data.footer.texto_legal ?? "",
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [data]);
  const save = useMutation({
    mutationFn: () => atualizarSiteSettings({ data: { key: "footer", value: form } }),
    onSuccess: () => { toast.success("Rodapé salvo"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const renderCol = (colKey: "coluna1_links" | "coluna2_links") => (
    <div className="space-y-2">
      {form[colKey].map((l, i) => (
        <div key={i} className="flex gap-2">
          <Input value={l.label} onChange={(e) => { const arr = [...form[colKey]]; arr[i] = { ...arr[i], label: e.target.value }; setForm({ ...form, [colKey]: arr }); }} placeholder="Rótulo" />
          <Input value={l.url} onChange={(e) => { const arr = [...form[colKey]]; arr[i] = { ...arr[i], url: e.target.value }; setForm({ ...form, [colKey]: arr }); }} placeholder="/pagina ou https://…" />
          <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, [colKey]: form[colKey].filter((_, j) => j !== i) })}>Remover</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setForm({ ...form, [colKey]: [...form[colKey], { label: "", url: "" }] })}>+ Adicionar link</Button>
    </div>
  );
  return (
    <div className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
      <div><Label>Copyright</Label><Input value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} placeholder="© 2026 Sua Imobiliária" /></div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div><Label>Título Coluna 1</Label><Input value={form.coluna1_titulo} onChange={(e) => setForm({ ...form, coluna1_titulo: e.target.value })} /></div>
          {renderCol("coluna1_links")}
        </div>
        <div className="space-y-3">
          <div><Label>Título Coluna 2</Label><Input value={form.coluna2_titulo} onChange={(e) => setForm({ ...form, coluna2_titulo: e.target.value })} /></div>
          {renderCol("coluna2_links")}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.mostrar_redes} onChange={(e) => setForm({ ...form, mostrar_redes: e.target.checked })} />
        Exibir coluna de Redes Sociais
      </label>
      <div><Label>Texto legal (LGPD/aviso)</Label><Textarea rows={2} value={form.texto_legal} onChange={(e) => setForm({ ...form, texto_legal: e.target.value })} /></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar rodapé</Button>
    </div>
  );
}
