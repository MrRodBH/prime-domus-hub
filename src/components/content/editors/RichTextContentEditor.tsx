// RichTextContentEditor — editor de posts (Bloco 3.1). Rich text via RichTextEditor legacy (adapter).
import { RichTextEditor, MediaPicker } from "@/adapters/cms-legacy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContentSession } from "../session";

export function RichTextContentEditor() {
  const s = useContentSession();
  const data = s.draft.data as { conteudo?: string; imagem_capa?: string | null };

  return (
    <div className="space-y-4">
      <div>
        <Label>Resumo</Label>
        <Textarea
          value={s.draft.descricao}
          onChange={(e) => s.patch({ descricao: e.target.value })}
          rows={2}
          placeholder="Resumo curto (até 280 caracteres)"
        />
      </div>
      <div>
        <Label>Imagem de capa</Label>
        <div className="flex items-start gap-3">
          <MediaPicker
            value={data.imagem_capa ?? null}
            onChange={(v) => s.updateData({ imagem_capa: v?.url ?? null })}
            tipo="image"
          />
          {data.imagem_capa && (
            <Input
              value={data.imagem_capa}
              onChange={(e) => s.updateData({ imagem_capa: e.target.value })}
              className="text-xs font-mono flex-1"
            />
          )}
        </div>
      </div>
      <div>
        <Label>Conteúdo</Label>
        <RichTextEditor
          value={data.conteudo ?? ""}
          onChange={(v: string) => s.updateData({ conteudo: v })}
        />
      </div>
    </div>
  );
}
