import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, Quote, Undo2, Redo2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="size-8 inline-flex items-center justify-center rounded hover:bg-foreground/5 text-foreground/70"
  >
    {children}
  </button>
);

export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function handleInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="border border-foreground/10 rounded-md overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b border-foreground/10 bg-secondary/30">
        <Btn title="Negrito" onClick={() => exec("bold")}><Bold className="size-4" /></Btn>
        <Btn title="Itálico" onClick={() => exec("italic")}><Italic className="size-4" /></Btn>
        <Btn title="Sublinhado" onClick={() => exec("underline")}><Underline className="size-4" /></Btn>
        <span className="mx-1 w-px h-5 bg-foreground/10" />
        <Btn title="Título" onClick={() => exec("formatBlock", "<h2>")}><Heading2 className="size-4" /></Btn>
        <Btn title="Subtítulo" onClick={() => exec("formatBlock", "<h3>")}><Heading3 className="size-4" /></Btn>
        <Btn title="Citação" onClick={() => exec("formatBlock", "<blockquote>")}><Quote className="size-4" /></Btn>
        <span className="mx-1 w-px h-5 bg-foreground/10" />
        <Btn title="Lista" onClick={() => exec("insertUnorderedList")}><List className="size-4" /></Btn>
        <Btn title="Lista numerada" onClick={() => exec("insertOrderedList")}><ListOrdered className="size-4" /></Btn>
        <Btn title="Link" onClick={() => { const url = prompt("URL:"); if (url) exec("createLink", url); }}><LinkIcon className="size-4" /></Btn>
        <span className="mx-1 w-px h-5 bg-foreground/10" />
        <Btn title="Desfazer" onClick={() => exec("undo")}><Undo2 className="size-4" /></Btn>
        <Btn title="Refazer" onClick={() => exec("redo")}><Redo2 className="size-4" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-3 [&_h3]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-gold [&_a]:underline"
      />
    </div>
  );
}
