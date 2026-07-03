// CampaignContentEditor — conteúdo textual da campanha (Bloco 3.1).
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useContentSession } from "../session";

type Conteudo = {
  titulo?: string; mensagem?: string; imagem_url?: string;
  cta_label?: string; cta_url?: string; cor_fundo?: string; cor_texto?: string;
  dismissible?: boolean;
};

export function CampaignContentEditor() {
  const s = useContentSession();
  const d = s.draft.data as { tipo?: string; prioridade?: number; conteudo?: Conteudo };
  const c = d.conteudo ?? {};
  const patchC = (p: Partial<Conteudo>) => s.updateData({ conteudo: { ...c, ...p } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select value={d.tipo ?? "banner_top"} onValueChange={(v) => s.updateData({ tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="banner_top">Banner (topo)</SelectItem>
              <SelectItem value="banner_bottom">Banner (rodapé)</SelectItem>
              <SelectItem value="popup_center">Popup</SelectItem>
              <SelectItem value="modal">Modal</SelectItem>
              <SelectItem value="floating">Flutuante</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridade</Label>
          <Input type="number" value={d.prioridade ?? 0} onChange={(e) => s.updateData({ prioridade: Number(e.target.value) })} />
        </div>
      </div>
      <div><Label>Título</Label><Input value={c.titulo ?? ""} onChange={(e) => patchC({ titulo: e.target.value })} /></div>
      <div><Label>Mensagem</Label><Textarea value={c.mensagem ?? ""} onChange={(e) => patchC({ mensagem: e.target.value })} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Texto do botão (CTA)</Label><Input value={c.cta_label ?? ""} onChange={(e) => patchC({ cta_label: e.target.value })} /></div>
        <div><Label>URL do botão</Label><Input value={c.cta_url ?? ""} onChange={(e) => patchC({ cta_url: e.target.value })} /></div>
      </div>
      <div><Label>Imagem (URL)</Label><Input value={c.imagem_url ?? ""} onChange={(e) => patchC({ imagem_url: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Cor de fundo</Label><Input value={c.cor_fundo ?? ""} onChange={(e) => patchC({ cor_fundo: e.target.value })} placeholder="#0b3a3a" /></div>
        <div><Label>Cor do texto</Label><Input value={c.cor_texto ?? ""} onChange={(e) => patchC({ cor_texto: e.target.value })} placeholder="#ffffff" /></div>
      </div>
      <label className="flex items-center gap-3">
        <Switch checked={!!c.dismissible} onCheckedChange={(v) => patchC({ dismissible: v })} />
        <span className="text-sm">Usuário pode fechar</span>
      </label>
    </div>
  );
}
