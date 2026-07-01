/**
 * CmsFormRenderer — renderiza um formulário customizado (cms_forms) na área pública.
 * Consome `submeterFormulario` para gravar submissão, criar lead (se configurado),
 * disparar e-mail e webhook. Captura atribuição (UTMs/gclid/fbclid/referrer/landing).
 */
import { useState, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obterFormPublicoPorSlug, submeterFormulario } from "@/lib/api/forms.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { attributionPayload } from "@/lib/attribution";
import { maskPhoneBR } from "@/lib/phone-br";

interface Props {
  slug: string;
  className?: string;
}

type PublicField = {
  id: string;
  ordem: number;
  tipo: "text" | "textarea" | "email" | "phone" | "number" | "date" | "select" | "radio" | "checkbox" | "file" | "hidden";
  nome: string;
  label: string;
  placeholder?: string | null;
  ajuda?: string | null;
  obrigatorio: boolean;
  opcoes: Array<{ label: string; value: string }>;
  validacao: { min?: number; max?: number; minLength?: number; maxLength?: number; regex?: string; mascara?: string };
  valor_padrao?: string | null;
  largura: "full" | "half" | "third";
};

export function CmsFormRenderer({ slug, className }: Props) {
  const obterFn = useServerFn(obterFormPublicoPorSlug);
  const submeterFn = useServerFn(submeterFormulario);
  const { data, isLoading } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => obterFn({ data: { slug } }),
    staleTime: 60_000,
  });

  const [values, setValues] = useState<Record<string, string | boolean | string[]>>({});
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      if (!data?.form) throw new Error("Formulário não disponível");
      // normaliza payload
      const dados: Record<string, string | number | boolean | string[] | null> = {};
      for (const [k, v] of Object.entries(values)) dados[k] = v as string | boolean | string[];
      const attr = typeof window !== "undefined" ? attributionPayload() : ({} as ReturnType<typeof attributionPayload>);
      return submeterFn({
        data: {
          form_slug: slug,
          dados,
          consent_lgpd: true,
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_term: attr.utm_term,
          utm_content: attr.utm_content,
          gclid: attr.gclid,
          fbclid: attr.fbclid,
          referrer: attr.referrer,
          landing_url: attr.landing_url,
          page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : undefined,
        },
      });
    },
    onSuccess: (res) => {
      setSubmitted(true);
      toast.success(res.message);
      const redirect = (data?.form as { config?: { redirect_url?: string } } | null)?.config?.redirect_url;
      if (redirect) setTimeout(() => { window.location.href = redirect; }, 800);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) { toast.error("Aceite a Política de Privacidade."); return; }
    submit.mutate();
  }

  function setField(name: string, v: string | boolean | string[]) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  if (isLoading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!data?.form) return <div className="p-4 text-sm text-muted-foreground">Formulário não disponível.</div>;

  const form = data.form as { nome: string; descricao: string | null; config: { submit_button_label?: string } };
  const fields = (data.fields as PublicField[]) ?? [];
  const submitLabel = form.config?.submit_button_label ?? "Enviar";

  if (submitted) {
    return (
      <div className={`p-6 rounded-lg border bg-card text-center ${className ?? ""}`}>
        <p className="text-lg font-medium">Recebido!</p>
        <p className="text-sm text-muted-foreground mt-2">Retornaremos em breve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className ?? ""}`}>
      {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
      <div className="grid grid-cols-6 gap-4">
        {fields.map((f) => {
          const colSpan = f.largura === "half" ? "col-span-6 sm:col-span-3" : f.largura === "third" ? "col-span-6 sm:col-span-2" : "col-span-6";
          if (f.tipo === "hidden") return null;
          const val = values[f.nome];
          return (
            <div key={f.id} className={colSpan}>
              <Label>{f.label}{f.obrigatorio && <span className="text-destructive"> *</span>}</Label>
              {renderInput(f, val, setField)}
              {f.ajuda && <p className="text-xs text-muted-foreground mt-1">{f.ajuda}</p>}
            </div>
          );
        })}
      </div>
      <label className="flex items-start gap-2 text-xs">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
        <span>
          Li e aceito a <a href="/privacidade" target="_blank" className="underline">Política de Privacidade</a>.
        </span>
      </label>
      <Button type="submit" disabled={submit.isPending} className="w-full sm:w-auto">
        {submit.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function renderInput(
  f: PublicField,
  val: string | boolean | string[] | undefined,
  setField: (name: string, v: string | boolean | string[]) => void,
) {
  const common = {
    id: f.nome,
    name: f.nome,
    placeholder: f.placeholder ?? undefined,
    required: f.obrigatorio,
  };
  switch (f.tipo) {
    case "textarea":
      return <Textarea {...common} value={(val as string) ?? ""} onChange={(e) => setField(f.nome, e.target.value)} rows={4} />;
    case "email":
      return <Input {...common} type="email" value={(val as string) ?? ""} onChange={(e) => setField(f.nome, e.target.value)} />;
    case "phone":
      return <Input {...common} type="tel" value={(val as string) ?? ""} onChange={(e) => setField(f.nome, maskPhoneBR(e.target.value))} />;
    case "number":
      return <Input {...common} type="number" value={(val as string) ?? ""} onChange={(e) => setField(f.nome, e.target.value)} />;
    case "date":
      return <Input {...common} type="date" value={(val as string) ?? ""} onChange={(e) => setField(f.nome, e.target.value)} />;
    case "select":
      return (
        <Select value={(val as string) ?? ""} onValueChange={(v) => setField(f.nome, v)}>
          <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Selecione"} /></SelectTrigger>
          <SelectContent>
            {f.opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {f.opcoes.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={f.nome}
                value={o.value}
                checked={val === o.value}
                onChange={() => setField(f.nome, o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    case "checkbox": {
      const arr = Array.isArray(val) ? val : [];
      if (f.opcoes.length === 0) {
        return (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={val === true} onCheckedChange={(v) => setField(f.nome, v === true)} />
            {f.label}
          </label>
        );
      }
      return (
        <div className="space-y-2">
          {f.opcoes.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={arr.includes(o.value)}
                onCheckedChange={(v) => {
                  const next = v === true ? [...arr, o.value] : arr.filter((x) => x !== o.value);
                  setField(f.nome, next);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    case "file":
      return <Input {...common} type="file" onChange={(e) => setField(f.nome, e.target.files?.[0]?.name ?? "")} />;
    default:
      return <Input {...common} type="text" value={(val as string) ?? ""} onChange={(e) => setField(f.nome, e.target.value)} />;
  }
}
