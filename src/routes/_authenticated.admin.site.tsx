import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { obterSiteSettings, atualizarSiteSettings } from "@/lib/api/site.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/site")({
  component: AdminSite,
});

function AdminSite() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["site-settings"], queryFn: () => obterSiteSettings() });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [branding, setBranding] = useState<any>({ site_name: "RM Prime Imóveis", logo_path: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hero, setHero] = useState<any>({ title_lines: [], cta_primary: "", cta_secondary: "", eyebrow: "", subtitle: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contato, setContato] = useState<any>({ telefone: "", whatsapp: "", email: "", endereco: "", instagram: "", facebook: "", linkedin: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setBranding({ site_name: data.branding.site_name ?? "", logo_path: data.branding.logo_path ?? null });
    setHero({
      eyebrow: data.home_hero.eyebrow ?? "",
      title_lines: data.home_hero.title_lines ?? [],
      subtitle: data.home_hero.subtitle ?? "",
      cta_primary: data.home_hero.cta_primary ?? "",
      cta_secondary: data.home_hero.cta_secondary ?? "",
    });
    setContato({
      telefone: data.contato.telefone ?? "",
      whatsapp: data.contato.whatsapp ?? "",
      email: data.contato.email ?? "",
      endereco: data.contato.endereco ?? "",
      instagram: data.contato.instagram ?? "",
      facebook: data.contato.facebook ?? "",
      linkedin: data.contato.linkedin ?? "",
    });
    setLogoPreview(data.branding.logo_url ?? null);
  }, [data]);

  const salvar = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ key, value }: { key: "branding" | "home_hero" | "contato"; value: any }) =>
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
      const path = `logo-${Date.now()}.${ext}`;
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

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl">Site & Branding</h1>
        <p className="text-sm text-muted-foreground mt-1">Edite a logo, os textos da home e os dados de contato.</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Logo & Marca</TabsTrigger>
          <TabsTrigger value="hero">Home — Hero</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
        </TabsList>

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
          <Button onClick={() => salvar.mutate({ key: "branding", value: branding })} disabled={salvar.isPending}>Salvar branding</Button>
        </TabsContent>

        <TabsContent value="hero" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
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
          <Button onClick={() => salvar.mutate({ key: "home_hero", value: hero })} disabled={salvar.isPending}>Salvar hero</Button>
        </TabsContent>

        <TabsContent value="contato" className="bg-card border border-foreground/5 rounded-lg p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} /></div>
            <div><Label>WhatsApp (com DDI)</Label><Input value={contato.whatsapp} onChange={(e) => setContato({ ...contato, whatsapp: e.target.value })} placeholder="5531999990000" /></div>
            <div><Label>E-mail</Label><Input type="email" value={contato.email} onChange={(e) => setContato({ ...contato, email: e.target.value })} /></div>
            <div><Label>Instagram</Label><Input value={contato.instagram} onChange={(e) => setContato({ ...contato, instagram: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={contato.endereco} onChange={(e) => setContato({ ...contato, endereco: e.target.value })} /></div>
          </div>
          <Button onClick={() => salvar.mutate({ key: "contato", value: contato })} disabled={salvar.isPending}>Salvar contato</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
