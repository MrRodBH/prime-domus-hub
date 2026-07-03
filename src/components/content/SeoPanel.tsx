// SeoPanel — tab de SEO dentro do editor (Bloco 3 §7 dividido por CONTEXTO, não tecnologia).
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useContentSession } from "./session";

export function SeoPanel() {
  const { draft, updateSeo } = useContentSession();
  const seo = draft.seo as {
    meta_title?: string; meta_description?: string; og_image?: string; canonical?: string; noindex?: boolean;
  };
  const patch = (p: Partial<typeof seo>) => updateSeo({ ...seo, ...p });

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Label>Meta title <span className="text-xs text-muted-foreground">({(seo.meta_title ?? "").length}/60)</span></Label>
        <Input value={seo.meta_title ?? ""} onChange={(e) => patch({ meta_title: e.target.value })} maxLength={70} />
      </div>
      <div>
        <Label>Meta description <span className="text-xs text-muted-foreground">({(seo.meta_description ?? "").length}/160)</span></Label>
        <Textarea value={seo.meta_description ?? ""} onChange={(e) => patch({ meta_description: e.target.value })} maxLength={180} rows={3} />
      </div>
      <div>
        <Label>Imagem OG (URL absoluta https)</Label>
        <Input value={seo.og_image ?? ""} onChange={(e) => patch({ og_image: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <Label>Canonical URL</Label>
        <Input value={seo.canonical ?? ""} onChange={(e) => patch({ canonical: e.target.value })} />
      </div>
      <label className="flex items-center gap-3">
        <Switch checked={!!seo.noindex} onCheckedChange={(v) => patch({ noindex: v })} />
        <span className="text-sm">Bloquear indexação (noindex)</span>
      </label>
    </div>
  );
}
