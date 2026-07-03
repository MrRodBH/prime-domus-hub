// SettingsContentEditor — editor de uma seção de configuração do site (Bloco 3.1).
// Renderiza os componentes existentes de tab dentro do mesmo shell — mesmo pattern
// que Blog usa RichTextEditor. Site NÃO é exceção: é apenas outra editorKind.
import { useContentSession } from "../session";
import {
  CmsEmpresaTab, CmsBrandingDinamicoTab, CmsSeoGlobalTab, CmsRodapeTab,
  CmsHomeDiferenciaisTab, CmsHomeDepoimentosTab,
  CmsPaginaSobreTab, CmsPaginaContatoTab, CmsPaginaAnuncieTab,
} from "@/components/admin/CmsFase1Tabs";
import { CmsMenuTab } from "@/components/admin/CmsMenuTab";
import { CmsPaginasTabs } from "@/components/admin/CmsPaginasTabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_COMPONENTS: Record<string, React.ComponentType<{ data: any }>> = {
  empresa: CmsEmpresaTab,
  branding_v2: CmsBrandingDinamicoTab,
  seo_global: CmsSeoGlobalTab,
  footer: CmsRodapeTab,
  home_diferenciais: CmsHomeDiferenciaisTab,
  home_depoimentos: CmsHomeDepoimentosTab,
  pagina_sobre: CmsPaginaSobreTab,
  pagina_contato: CmsPaginaContatoTab,
  pagina_anuncie: CmsPaginaAnuncieTab,
};

export function SettingsContentEditor() {
  const s = useContentSession();
  const d = s.draft.data as { value?: Record<string, unknown>; sectionKey?: string; all?: unknown };
  const key = (d.sectionKey ?? s.entityId) as string;

  // Menu tem componente próprio (não recebe `data` no formato padrão).
  if (key === "menu" as string) {
    return <div className="p-4 max-w-4xl mx-auto"><CmsMenuTab /></div>;
  }

  const Cmp = SECTION_COMPONENTS[key];
  if (Cmp && d.all) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <div className="p-4 max-w-4xl mx-auto"><Cmp data={d.all as any} /></div>;
  }

  // Fallback: para keys sem componente dedicado (branding, home_hero, home_secoes,
  // contato, pagina_lancamentos), oferecer um editor bruto de JSON com atalhos comuns.
  return <RawSectionEditor sectionKey={key} />;
}

function RawSectionEditor({ sectionKey }: { sectionKey: string }) {
  const s = useContentSession();
  const d = s.draft.data as { value?: Record<string, unknown> };
  const value = d.value ?? {};
  const setValue = (v: Record<string, unknown>) => s.updateData({ value: v });

  // Formulário genérico para seções chave-valor simples.
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-3">
      <p className="text-xs text-muted-foreground">Seção: <code>{sectionKey}</code>. Ajuste os campos abaixo — as alterações são salvas como rascunho e publicadas na aba <strong>Publicação</strong>.</p>
      {Object.entries(value).map(([k, v]) => {
        if (typeof v === "string" || typeof v === "number" || v == null) {
          const isLong = typeof v === "string" && v.length > 100;
          return (
            <div key={k}>
              <Label className="text-xs">{k}</Label>
              {isLong ? (
                <Textarea value={String(v ?? "")} onChange={(e) => setValue({ ...value, [k]: e.target.value })} rows={3} />
              ) : (
                <Input value={String(v ?? "")} onChange={(e) => setValue({ ...value, [k]: e.target.value })} />
              )}
            </div>
          );
        }
        // Objetos/arrays → JSON textarea
        return (
          <div key={k}>
            <Label className="text-xs">{k} <span className="text-[10px] text-muted-foreground">(JSON)</span></Label>
            <Textarea
              className="font-mono text-xs" rows={4}
              value={JSON.stringify(v, null, 2)}
              onChange={(e) => {
                try { setValue({ ...value, [k]: JSON.parse(e.target.value) }); } catch { /* ignore parse errors durante digitação */ }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
