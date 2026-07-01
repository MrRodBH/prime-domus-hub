import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { obterSiteSettings, atualizarSiteSettings } from "@/lib/api/site.functions";
import { obterMetaConfigAdmin, atualizarMetaConfigAdmin } from "@/lib/api/meta.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { prefixTenant } from "@/lib/tenant-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { CmsEmpresaTab, CmsBrandingDinamicoTab, CmsSeoGlobalTab, CmsRodapeTab } from "@/components/admin/CmsFase1Tabs";
import { CmsMenuTab } from "@/components/admin/CmsMenuTab";
import { CmsHomeDiferenciaisTab, CmsHomeDepoimentosTab, CmsPaginaSobreTab, CmsPaginaContatoTab, CmsPaginaAnuncieTab } from "@/components/admin/CmsPaginasTabs";
import { CmsVersoesTab } from "@/components/admin/CmsVersoesTab";


export const Route = createFileRoute("/_authenticated/admin/site")({
  component: AdminSite,
});

function AdminSite() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branding, setBranding] = useState<any>({ site_name: "RM Prime Imóveis", logo_path: null, favicon_path: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hero, setHero] = useState<any>({ title_lines: [], cta_primary: "", cta_secondary: "", eyebrow: "", subtitle: "", image_path: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [secoes, setSecoes] = useState<any>({
    destaques_eyebrow: "Seleção Exclusiva", destaques_titulo: "Destaques", destaques_qtd: 3,
    bairros_eyebrow: "Os Melhores Endereços", bairros_titulo: "Bairros em destaque",
    bairros_descricao: "", bairros_qtd: 4,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contato, setContato] = useState<any>({ telefone: "", whatsapp: "", email: "", endereco: "", instagram: "", facebook: "", linkedin: "", creci: "", localizacao: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lanc, setLanc] = useState<any>({ eyebrow: "", title_lines: [], subtitle: "", cta_primary: "", cta_secondary: "", image_path: null, empty_message: "", meta_title: "", meta_description: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [heroImgPreview, setHeroImgPreview] = useState<string | null>(null);
  const [lancImgPreview, setLancImgPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFav, setUploadingFav] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLanc, setUploadingLanc] = useState(false);

  useEffect(() => {
    if (!data) return;
    setBranding({
      site_name: data.branding.site_name ?? "",
      logo_path: data.branding.logo_path ?? null,
      favicon_path: data.branding.favicon_path ?? null,
    });
    setHero({
      eyebrow: data.home_hero.eyebrow ?? "",
      title_lines: data.home_hero.title_lines ?? [],
      subtitle: data.home_hero.subtitle ?? "",
      cta_primary: data.home_hero.cta_primary ?? "",
      cta_secondary: data.home_hero.cta_secondary ?? "",
      image_path: data.home_hero.image_path ?? null,
      search_tipos: data.home_hero.search_tipos ?? ["Coberturas & Garden", "Apartamentos de luxo", "Casas em condomínio", "Terrenos premium"],
    });
    setSecoes({
      destaques_eyebrow: data.home_secoes.destaques_eyebrow ?? "Seleção Exclusiva",
      destaques_titulo: data.home_secoes.destaques_titulo ?? "Destaques",
      destaques_qtd: data.home_secoes.destaques_qtd ?? 3,
      bairros_eyebrow: data.home_secoes.bairros_eyebrow ?? "Os Melhores Endereços",
      bairros_titulo: data.home_secoes.bairros_titulo ?? "Bairros em destaque",
      bairros_descricao: data.home_secoes.bairros_descricao ?? "",
      bairros_qtd: data.home_secoes.bairros_qtd ?? 4,
    });
    setContato({
      telefone: data.contato.telefone ?? "",
      whatsapp: data.contato.whatsapp ?? "",
      email: data.contato.email ?? "",
      endereco: data.contato.endereco ?? "",
      instagram: data.contato.instagram ?? "",
      facebook: data.contato.facebook ?? "",
      linkedin: data.contato.linkedin ?? "",
      creci: data.contato.creci ?? "",
      localizacao: data.contato.localizacao ?? "",
    });
    setLogoPreview(data.branding.logo_url ?? null);
    setFaviconPreview(data.branding.favicon_url ?? null);
    setHeroImgPreview(data.home_hero.image_url ?? null);
    setLanc({
      eyebrow: data.pagina_lancamentos.eyebrow ?? "",
      title_lines: data.pagina_lancamentos.title_lines ?? [],
      subtitle: data.pagina_lancamentos.subtitle ?? "",
      cta_primary: data.pagina_lancamentos.cta_primary ?? "",
      cta_secondary: data.pagina_lancamentos.cta_secondary ?? "",
      image_path: data.pagina_lancamentos.image_path ?? null,
      empty_message: data.pagina_lancamentos.empty_message ?? "",
      meta_title: data.pagina_lancamentos.meta_title ?? "",
      meta_description: data.pagina_lancamentos.meta_description ?? "",
    });
    setLancImgPreview(data.pagina_lancamentos.image_url ?? null);
  }, [data]);

  const salvar = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ key, value }: { key: "branding" | "home_hero" | "home_secoes" | "contato" | "pagina_lancamentos"; value: any }) =>
      atualizarSiteSettings({ data: { key, value } }),
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = prefixTenant(`logo-${Date.now()}.${ext}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setBranding({ ...branding, logo_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setLogoPreview(url);
      toast.success("Logo enviada — clique em Salvar para aplicar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function uploadFavicon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFav(true);
    try {
      const ext = file.name.split(".").pop();
      const path = prefixTenant(`favicon-${Date.now()}.${ext}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setBranding({ ...branding, favicon_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setFaviconPreview(url);
      toast.success("Favicon enviado — clique em Salvar para aplicar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingFav(false);
      e.target.value = "";
    }
  }

  async function uploadHeroImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const ext = file.name.split(".").pop();
      const path = prefixTenant(`hero-${Date.now()}.${ext}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setHero({ ...hero, image_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setHeroImgPreview(url);
      toast.success("Imagem do hero enviada — clique em Salvar para aplicar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  }

  async function uploadLancImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLanc(true);
    try {
      const ext = file.name.split(".").pop();
      const path = prefixTenant(`lancamentos-${Date.now()}.${ext}`);
      const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
      if (error) throw error;
      setLanc({ ...lanc, image_path: path });
      const { url } = await adminAssinarUrl({ data: { bucket: "site", path } });
      setLancImgPreview(url);
      toast.success("Imagem enviada — clique em Salvar para aplicar.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingLanc(false);
      e.target.value = "";
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl">Site & Branding</h1>
        <p className="text-sm text-muted-foreground mt-1">Edite a logo, os textos da home e os dados de contato.</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="branding">Logo & Marca</TabsTrigger>
          <TabsTrigger value="branding_v2">Branding Dinâmico</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
          <TabsTrigger value="seo">SEO Global</TabsTrigger>
          <TabsTrigger value="hero">Home — Hero</TabsTrigger>
          <TabsTrigger value="secoes">Home — Seções</TabsTrigger>
          <TabsTrigger value="diferenciais">Home — Diferenciais</TabsTrigger>
          <TabsTrigger value="depoimentos">Home — Depoimentos</TabsTrigger>
          <TabsTrigger value="sobre">Página Sobre</TabsTrigger>
          <TabsTrigger value="pag_contato">Página Contato</TabsTrigger>
          <TabsTrigger value="anuncie">Página Anuncie</TabsTrigger>
          <TabsTrigger value="lancamentos">Página Lançamentos</TabsTrigger>
          <TabsTrigger value="contato">Contato (global)</TabsTrigger>
          <TabsTrigger value="meta">Integrações Meta</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa"><CmsEmpresaTab data={data} /></TabsContent>
        <TabsContent value="branding_v2"><CmsBrandingDinamicoTab data={data} /></TabsContent>
        <TabsContent value="menu"><CmsMenuTab /></TabsContent>
        <TabsContent value="footer"><CmsRodapeTab data={data} /></TabsContent>
        <TabsContent value="seo"><CmsSeoGlobalTab data={data} /></TabsContent>
        <TabsContent value="diferenciais"><CmsHomeDiferenciaisTab data={data} /></TabsContent>
        <TabsContent value="depoimentos"><CmsHomeDepoimentosTab data={data} /></TabsContent>
        <TabsContent value="sobre"><CmsPaginaSobreTab data={data} /></TabsContent>
        <TabsContent value="pag_contato"><CmsPaginaContatoTab data={data} /></TabsContent>
        <TabsContent value="anuncie"><CmsPaginaAnuncieTab data={data} /></TabsContent>



        <TabsContent value="branding" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <div><Label>Nome da empresa</Label><Input value={branding.site_name} onChange={(e) => setBranding({ ...branding, site_name: e.target.value })} /></div>
          <div>
            <Label>Logomarca</Label>
            <div className="flex items-center gap-4 mt-2">
              {logoPreview && <img src={logoPreview} alt="Logo atual" className="h-16 w-auto bg-petroleum p-2 rounded" />}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
                <Upload className="size-4" /> {uploading ? "Enviando…" : "Trocar logo"}
                <input type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={uploadLogo} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado: PNG transparente, 500×500px ou maior.</p>
          </div>
          <div>
            <Label>Favicon</Label>
            <div className="flex items-center gap-4 mt-2">
              {faviconPreview && <img src={faviconPreview} alt="Favicon atual" className="h-12 w-12 rounded border border-foreground/10 object-cover" />}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
                <Upload className="size-4" /> {uploadingFav ? "Enviando…" : "Trocar favicon"}
                <input type="file" accept="image/png,image/x-icon,image/svg+xml" className="hidden" onChange={uploadFavicon} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Ícone exibido na aba do navegador. Recomendado: PNG quadrado 512×512px (fundo sólido).</p>
          </div>
          <Button onClick={() => salvar.mutate({ key: "branding", value: branding })} disabled={salvar.isPending}>Salvar branding</Button>
        </TabsContent>

        <TabsContent value="hero" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <div>
            <Label>Imagem de fundo do Hero</Label>
            <div className="flex items-center gap-4 mt-2">
              {heroImgPreview && <img src={heroImgPreview} alt="Hero atual" className="h-24 w-40 object-cover rounded border border-foreground/10" />}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
                <Upload className="size-4" /> {uploadingHero ? "Enviando…" : "Trocar imagem"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadHeroImage} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado: JPG/WebP em 1920×1080px ou maior (proporção 16:9). A imagem aparece em tela cheia na home.</p>
          </div>
          <div><Label>Eyebrow (texto pequeno acima)</Label><Input value={hero.eyebrow} onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })} /></div>
          <div>
            <Label>Título principal (uma linha por entrada)</Label>
            <Textarea
              rows={3}
              value={(hero.title_lines as string[]).join("\n")}
              onChange={(e) => setHero({ ...hero, title_lines: e.target.value.split("\n") })}
              placeholder={"Excelência em\nimóveis premium"}
            />
            <p className="text-xs text-muted-foreground mt-1">Cada linha quebra uma frase. Recomendamos no máximo 2 ou 3 linhas.</p>
          </div>
          <div><Label>Subtítulo</Label><Textarea rows={2} value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Botão primário</Label><Input value={hero.cta_primary} onChange={(e) => setHero({ ...hero, cta_primary: e.target.value })} /></div>
            <div><Label>Botão secundário</Label><Input value={hero.cta_secondary} onChange={(e) => setHero({ ...hero, cta_secondary: e.target.value })} /></div>
          </div>
          <div>
            <Label>Opções do campo "Tipo" (uma por linha)</Label>
            <Textarea
              rows={4}
              value={(hero.search_tipos as string[] ?? []).join("\n")}
              onChange={(e) => setHero({ ...hero, search_tipos: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              placeholder={"Coberturas & Garden\nApartamentos de luxo\nCasas em condomínio\nTerrenos premium"}
            />
            <p className="text-xs text-muted-foreground mt-1">Aparecem no combo "Tipo" da busca da home. Uma opção por linha.</p>
          </div>
          <Button onClick={() => salvar.mutate({ key: "home_hero", value: hero })} disabled={salvar.isPending}>Salvar hero</Button>
        </TabsContent>

        <TabsContent value="secoes" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-xl">Seção Destaques</h3>
            <p className="text-xs text-muted-foreground">Exibe os imóveis marcados como <strong>Destaque</strong> no cadastro. Ordene-os pelo cadastro do imóvel.</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Eyebrow</Label><Input value={secoes.destaques_eyebrow} onChange={(e) => setSecoes({ ...secoes, destaques_eyebrow: e.target.value })} /></div>
              <div><Label>Título</Label><Input value={secoes.destaques_titulo} onChange={(e) => setSecoes({ ...secoes, destaques_titulo: e.target.value })} /></div>
              <div><Label>Quantidade de imóveis</Label><Input type="number" min={1} max={12} value={secoes.destaques_qtd} onChange={(e) => setSecoes({ ...secoes, destaques_qtd: Number(e.target.value) || 3 })} /></div>
            </div>
          </div>
          <div className="border-t border-foreground/5 pt-6 space-y-4">
            <h3 className="font-display text-xl">Seção Bairros</h3>
            <p className="text-xs text-muted-foreground">Exibe os bairros cadastrados, priorizando os marcados como destaque e respeitando a ordem.</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Eyebrow</Label><Input value={secoes.bairros_eyebrow} onChange={(e) => setSecoes({ ...secoes, bairros_eyebrow: e.target.value })} /></div>
              <div><Label>Título</Label><Input value={secoes.bairros_titulo} onChange={(e) => setSecoes({ ...secoes, bairros_titulo: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={secoes.bairros_descricao} onChange={(e) => setSecoes({ ...secoes, bairros_descricao: e.target.value })} /></div>
              <div><Label>Quantidade de bairros</Label><Input type="number" min={1} max={12} value={secoes.bairros_qtd} onChange={(e) => setSecoes({ ...secoes, bairros_qtd: Number(e.target.value) || 4 })} /></div>
            </div>
          </div>
          <Button onClick={() => salvar.mutate({ key: "home_secoes", value: secoes })} disabled={salvar.isPending}>Salvar seções</Button>
        </TabsContent>

        <TabsContent value="lancamentos" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Edita o topo da página <strong>/lancamentos</strong>. Os cards exibidos abaixo do hero são os imóveis cadastrados com finalidade <strong>Lançamento</strong> (preencha em Imóveis › Novo). Marcando-os também como <strong>Destaque</strong>, eles aparecem na seção Destaques da Home.
          </p>
          <div>
            <Label>Imagem de fundo do Hero</Label>
            <div className="flex items-center gap-4 mt-2">
              {lancImgPreview && <img src={lancImgPreview} alt="Hero lançamentos" className="h-24 w-40 object-cover rounded border border-foreground/10" />}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-petroleum text-linen px-4 py-2 rounded text-sm">
                <Upload className="size-4" /> {uploadingLanc ? "Enviando…" : "Trocar imagem"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadLancImage} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">JPG/WebP em 1920×1080px ou maior.</p>
          </div>
          <div><Label>Eyebrow</Label><Input value={lanc.eyebrow} onChange={(e) => setLanc({ ...lanc, eyebrow: e.target.value })} /></div>
          <div>
            <Label>Título principal (uma linha por entrada)</Label>
            <Textarea
              rows={3}
              value={(lanc.title_lines as string[]).join("\n")}
              onChange={(e) => setLanc({ ...lanc, title_lines: e.target.value.split("\n") })}
              placeholder={"Empreendimentos\nexclusivos"}
            />
          </div>
          <div><Label>Subtítulo</Label><Textarea rows={2} value={lanc.subtitle} onChange={(e) => setLanc({ ...lanc, subtitle: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Botão primário</Label><Input value={lanc.cta_primary} onChange={(e) => setLanc({ ...lanc, cta_primary: e.target.value })} placeholder="Falar com especialista" /></div>
            <div><Label>Botão secundário</Label><Input value={lanc.cta_secondary} onChange={(e) => setLanc({ ...lanc, cta_secondary: e.target.value })} placeholder="Ver imóveis prontos" /></div>
          </div>
          <div>
            <Label>Mensagem quando não houver lançamentos</Label>
            <Textarea rows={2} value={lanc.empty_message} onChange={(e) => setLanc({ ...lanc, empty_message: e.target.value })} placeholder="Em breve novos lançamentos…" />
          </div>
          <div className="grid md:grid-cols-2 gap-3 border-t border-foreground/5 pt-4">
            <div><Label>Meta title (SEO)</Label><Input value={lanc.meta_title} onChange={(e) => setLanc({ ...lanc, meta_title: e.target.value })} /></div>
            <div><Label>Meta description (SEO)</Label><Input value={lanc.meta_description} onChange={(e) => setLanc({ ...lanc, meta_description: e.target.value })} /></div>
          </div>
          <Button onClick={() => salvar.mutate({ key: "pagina_lancamentos", value: lanc })} disabled={salvar.isPending}>Salvar página Lançamentos</Button>
        </TabsContent>

        <TabsContent value="contato" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} /></div>
            <div><Label>WhatsApp (com DDI)</Label><Input value={contato.whatsapp} onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })} placeholder="5531999990000" /></div>
            <div><Label>E-mail</Label><Input type="email" value={contato.email} onChange={(e) => setContato({ ...contato, email: e.target.value })} /></div>
            <div><Label>Instagram</Label><Input value={contato.instagram} onChange={(e) => setContato({ ...contato, instagram: e.target.value })} placeholder="@rmprime_imoveis ou URL" /></div>
            <div><Label>Facebook</Label><Input value={contato.facebook} onChange={(e) => setContato({ ...contato, facebook: e.target.value })} placeholder="https://facebook.com/suapagina" /></div>
            <div><Label>LinkedIn</Label><Input value={contato.linkedin} onChange={(e) => setContato({ ...contato, linkedin: e.target.value })} placeholder="https://linkedin.com/company/sua-empresa" /></div>
            <div><Label>CRECI (rodapé)</Label><Input value={contato.creci} onChange={(e) => setContato({ ...contato, creci: e.target.value })} placeholder="CRECI-MG J0000" /></div>
            <div><Label>Localização (rodapé)</Label><Input value={contato.localizacao} onChange={(e) => setContato({ ...contato, localizacao: e.target.value })} placeholder="Lourdes · Belo Horizonte / MG" /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={contato.endereco} onChange={(e) => setContato({ ...contato, endereco: e.target.value })} /></div>
          </div>
          <Button onClick={() => salvar.mutate({ key: "contato", value: contato })} disabled={salvar.isPending}>Salvar contato</Button>
        </TabsContent>
        <TabsContent value="meta" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <MetaIntegracaoForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetaIntegracaoForm() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["meta-config-admin"],
    queryFn: () => obterMetaConfigAdmin(),
  });
  const [pixelId, setPixelId] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (data) setPixelId(data.pixel_id ?? "");
  }, [data]);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarMetaConfigAdmin({
        data: {
          pixel_id: pixelId.trim(),
          conversions_api_token: token.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Configurações Meta salvas.");
      setToken("");
      qc.invalidateQueries({ queryKey: ["meta-config-admin"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl">Meta Pixel & Conversions API</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configurações do Meta Pixel (rastreamento no navegador) e da Conversions API (envio server-side de eventos para a Meta).
        </p>
      </div>

      <div>
        <Label>Pixel ID</Label>
        <Input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="985976432441241"
        />
        <p className="text-xs text-muted-foreground mt-1">
          ID do Meta Pixel utilizado em todas as páginas do site.
        </p>
      </div>

      <div>
        <Label>Access Token da Conversions API</Label>
        <PasswordInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={data?.token_set ? "•••••••••• (token configurado — preencha para substituir)" : "Insira o Token de Acesso da API de Conversões da Meta."}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {data?.token_set
            ? "Token salvo. Deixe em branco para manter o atual ou digite um novo para substituir."
            : "Token armazenado de forma segura. Necessário para enviar eventos server-side à Meta."}
        </p>
      </div>

      <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !pixelId.trim()}>
        Salvar configurações
      </Button>
    </div>
  );
}
