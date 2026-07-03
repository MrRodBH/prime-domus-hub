// StructuredContentEditor — editor declarativo dirigido por
// `descriptor.recordSections` (Etapa 4.1.a · 4.1.c).
//
// REGRA: não conhece entidade. Apenas lê recordSections e edita
// `draft.data[field.id]`. Nenhum switch por kind.
import { useContentSession } from "../session";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function resolveLink(template: string, value: string): string {
  return template.replace("{value}", encodeURIComponent(value));
}

export function StructuredContentEditor() {
  const s = useContentSession();
  const sections = s.descriptor.recordSections ?? [];
  const data = (s.draft.data ?? {}) as Record<string, unknown>;

  function updateField(id: string, v: unknown) {
    s.updateData({ ...data, [id]: v });
  }

  if (sections.length === 0) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Descriptor sem seções declaradas.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      {sections.map((sec) => (
        <section key={sec.id} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {sec.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sec.fields.map((f) => {
              const raw = data[f.id];
              const value = raw == null ? "" : String(raw);
              const commonId = `field-${sec.id}-${f.id}`;

              if (f.kind === "readonly") {
                return (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <div className="text-sm px-3 py-2 rounded-md border bg-muted/30 min-h-[36px]">
                      {value || <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                );
              }

              if (f.kind === "textarea") {
                return (
                  <div key={f.id} className="space-y-1 sm:col-span-2">
                    <Label htmlFor={commonId} className="text-xs text-muted-foreground">{f.label}</Label>
                    <Textarea
                      id={commonId}
                      value={value}
                      onChange={(e) => updateField(f.id, e.target.value)}
                      rows={4}
                    />
                  </div>
                );
              }

              if ((f.kind === "email" || f.kind === "phone" || f.kind === "link") && f.linkTemplate && value) {
                return (
                  <div key={f.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <a
                      href={resolveLink(f.linkTemplate, value)}
                      className="text-sm text-primary underline underline-offset-2 truncate block"
                    >
                      {value}
                    </a>
                  </div>
                );
              }

              return (
                <div key={f.id} className="space-y-1">
                  <Label htmlFor={commonId} className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    id={commonId}
                    value={value}
                    type={f.kind === "money" ? "number" : "text"}
                    onChange={(e) => updateField(f.id, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
