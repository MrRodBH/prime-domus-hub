import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo2,
  Redo2,
  Palette,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createUploadTarget } from "@/lib/api/uploads.functions";
import { adminAssinarUrl } from "@/lib/api/admin.functions";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const BRAND_COLORS: { name: string; value: string; hex: string }[] = [
  { name: "Dourado", value: "gold", hex: "#C9A961" },
  { name: "Petróleo", value: "petroleum", hex: "#1F3A44" },
  { name: "Tiffany", value: "tiffany", hex: "#5FBFB3" },
  { name: "Preto", value: "black", hex: "#0F0F0F" },
  { name: "Cinza", value: "muted", hex: "#6B6B6B" },
];

const Btn = ({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`size-8 inline-flex items-center justify-center rounded hover:bg-foreground/5 text-foreground/70 ${
      active ? "bg-foreground/5 text-foreground" : ""
    }`}
  >
    {children}
  </button>
);

export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedRange.current) {
      ref.current?.focus();
      return;
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function handleInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function applyColor(hex: string) {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, hex);
    if (ref.current) onChange(ref.current.innerHTML);
    setShowColors(false);
  }

  function insertImageUrl(url: string) {
    restoreSelection();
    // Insere uma figura num bloco separado (entre parágrafos)
    const html = `<p></p><figure class="my-6"><img src="${url}" alt="" /></figure><p></p>`;
    document.execCommand("insertHTML", false, html);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      // M3.2 — path server-authoritative.
      const target = await createUploadTarget({
        data: {
          domain: "blog-inline",
          originalFileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
      const { error: upErr } = await supabase.storage
        .from(target.bucket)
        .upload(target.path, file, { upsert: false });
      if (upErr) throw upErr;
      const { url } = await adminAssinarUrl({
        data: { bucket: target.bucket, path: target.path, width: 1600, quality: 80 },
      });
      insertImageUrl(url);
      toast.success("Imagem inserida");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border border-foreground/10 rounded-md overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b border-foreground/10 bg-secondary/30">
        <Btn title="Negrito" onClick={() => exec("bold")}><Bold className="size-4" /></Btn>
        <Btn title="Itálico" onClick={() => exec("italic")}><Italic className="size-4" /></Btn>
        <Btn title="Sublinhado" onClick={() => exec("underline")}><Underline className="size-4" /></Btn>

        <span className="mx-1 w-px h-5 bg-foreground/10" />

        {/* Cores */}
        <div className="relative">
          <Btn
            title="Cor do texto"
            active={showColors}
            onClick={() => {
              saveSelection();
              setShowColors((s) => !s);
            }}
          >
            <Palette className="size-4" />
          </Btn>
          {showColors && (
            <div className="absolute z-20 top-full left-0 mt-1 bg-card border border-foreground/10 rounded-md shadow-lg p-2 flex gap-1.5">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(c.hex)}
                  className="size-6 rounded-full border border-foreground/20 hover:scale-110 transition"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <button
                type="button"
                title="Remover cor"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  restoreSelection();
                  document.execCommand("removeFormat");
                  if (ref.current) onChange(ref.current.innerHTML);
                  setShowColors(false);
                }}
                className="size-6 rounded-full border border-foreground/20 bg-background text-[10px]"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <span className="mx-1 w-px h-5 bg-foreground/10" />

        <Btn title="Título" onClick={() => exec("formatBlock", "<h2>")}><Heading2 className="size-4" /></Btn>
        <Btn title="Subtítulo" onClick={() => exec("formatBlock", "<h3>")}><Heading3 className="size-4" /></Btn>
        <Btn title="Citação" onClick={() => exec("formatBlock", "<blockquote>")}><Quote className="size-4" /></Btn>

        <span className="mx-1 w-px h-5 bg-foreground/10" />

        <Btn title="Lista" onClick={() => exec("insertUnorderedList")}><List className="size-4" /></Btn>
        <Btn title="Lista numerada" onClick={() => exec("insertOrderedList")}><ListOrdered className="size-4" /></Btn>
        <Btn
          title="Link"
          onClick={() => {
            const url = prompt("URL:");
            if (url) exec("createLink", url);
          }}
        >
          <LinkIcon className="size-4" />
        </Btn>

        {/* Imagem inline */}
        <Btn
          title={uploadingImg ? "Enviando imagem..." : "Inserir imagem"}
          onClick={() => {
            saveSelection();
            fileRef.current?.click();
          }}
        >
          {uploadingImg ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadImage}
        />

        <span className="mx-1 w-px h-5 bg-foreground/10" />

        <Btn title="Desfazer" onClick={() => exec("undo")}><Undo2 className="size-4" /></Btn>
        <Btn title="Refazer" onClick={() => exec("redo")}><Redo2 className="size-4" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-xl [&_h3]:mt-3 [&_h3]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-gold [&_a]:underline [&_img]:rounded-md [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto [&_figure]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-foreground/15 [&_th]:bg-secondary/40 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-foreground/15 [&_td]:p-2 [&_td]:align-top"
      />
    </div>
  );
}
