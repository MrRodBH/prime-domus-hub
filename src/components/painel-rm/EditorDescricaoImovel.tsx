import { useRef, useState } from "react";
import { Bold, Italic, Heading2, List, ListOrdered, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DescricaoImovel } from "@/components/painel-rm/DescricaoImovel";

export function EditorDescricaoImovel({ inicial }: { inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [previa, setPrevia] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  function formatar(antes: string, depois = "", porLinha = false) {
    const campo = ref.current;
    if (!campo) return;
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    const selecionado = texto.slice(inicio, fim);
    const trecho = porLinha
      ? selecionado.split("\n").map((linha, i) => `${antes === "1. " ? `${i + 1}. ` : antes}${linha}`).join("\n")
      : antes + selecionado + depois;
    const prefixo = porLinha && inicio > 0 && texto[inicio - 1] !== "\n" ? "\n" : "";
    setTexto(texto.slice(0, inicio) + prefixo + trecho + texto.slice(fim));
    requestAnimationFrame(() => {
      campo.focus();
      campo.setSelectionRange(inicio + prefixo.length + antes.length, fim + prefixo.length + antes.length);
    });
  }
  return <div className="mt-2 overflow-hidden rounded-md border border-input">
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1">
      {[
        { Icone: Bold, nome: "Negrito", antes: "**", depois: "**" },
        { Icone: Italic, nome: "Itálico", antes: "*", depois: "*" },
        { Icone: Heading2, nome: "Subtítulo", antes: "## ", linha: true },
        { Icone: List, nome: "Lista com marcadores", antes: "- ", linha: true },
        { Icone: ListOrdered, nome: "Lista numerada", antes: "1. ", linha: true },
      ].map(({ Icone, nome, antes, depois, linha }) => <Button key={nome} type="button" variant="ghost" size="icon" className="h-8 w-8" title={nome} aria-label={nome} disabled={previa} onClick={() => formatar(antes, depois, linha)}><Icone className="h-4 w-4" /></Button>)}
      <Button type="button" variant={previa ? "secondary" : "ghost"} size="icon" className="ml-auto h-8 w-8" title={previa ? "Editar descrição" : "Visualizar descrição"} aria-label={previa ? "Editar descrição" : "Visualizar descrição"} onClick={() => setPrevia(!previa)}>{previa ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
    </div>
    <input type="hidden" name="descricao" value={texto} />
    {previa ? <div className="min-h-40 p-3"><DescricaoImovel texto={texto} /></div> : <Textarea ref={ref} id="descricao" value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} className="rounded-none border-0 shadow-none" />}
  </div>;
}