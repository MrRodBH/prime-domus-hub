/**
 * CmsPageRenderer — renderiza blocos de uma página dinâmica do CMS.
 */
import { CmsFormRenderer } from "./CmsFormRenderer";
import type { CmsBlock } from "@/lib/api/pages.functions";

interface Props {
  blocks: CmsBlock[];
}

export function CmsPageRenderer({ blocks }: Props) {
  return (
    <div className="cms-page">
      {blocks.map((b) => <BlockRenderer key={b.id} block={b} />)}
    </div>
  );
}

function BlockRenderer({ block }: { block: CmsBlock }) {
  switch (block.type) {
    case "hero": {
      const d = block.data;
      const h = d.altura === "lg" ? "min-h-[70vh]" : d.altura === "sm" ? "min-h-[30vh]" : "min-h-[50vh]";
      return (
        <section
          className={`relative ${h} flex items-center justify-center text-center px-4 py-16 bg-cover bg-center`}
          style={d.imagem_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url(${d.imagem_url})` } : undefined}
        >
          <div className={`max-w-3xl mx-auto ${d.imagem_url ? "text-white" : ""}`}>
            {d.eyebrow && <p className="text-sm uppercase tracking-widest mb-3 opacity-80">{d.eyebrow}</p>}
            <h1 className="text-4xl md:text-5xl font-serif mb-4">{d.titulo}</h1>
            {d.subtitulo && <p className="text-lg opacity-90 mb-6">{d.subtitulo}</p>}
            {d.cta_label && d.cta_href && (
              <a href={d.cta_href} className="inline-block px-6 py-3 rounded bg-primary text-primary-foreground font-medium hover:opacity-90">{d.cta_label}</a>
            )}
          </div>
        </section>
      );
    }
    case "richtext": {
      const d = block.data;
      return (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <div
            className={`prose prose-neutral max-w-none ${d.align === "center" ? "text-center" : ""}`}
            dangerouslySetInnerHTML={{ __html: d.html }}
          />
        </section>
      );
    }
    case "image": {
      const d = block.data;
      return (
        <figure className="max-w-4xl mx-auto px-4 py-8">
          <img src={d.url} alt={d.alt ?? ""} loading="lazy" className="w-full h-auto rounded-lg" />
          {d.legenda && <figcaption className="text-center text-sm text-muted-foreground mt-2">{d.legenda}</figcaption>}
        </figure>
      );
    }
    case "gallery": {
      const d = block.data;
      const cols = d.colunas === 4 ? "grid-cols-2 md:grid-cols-4" : d.colunas === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3";
      return (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className={`grid ${cols} gap-3`}>
            {d.imagens.map((im, i) => (
              <img key={i} src={im.url} alt={im.alt ?? ""} loading="lazy" className="w-full h-64 object-cover rounded" />
            ))}
          </div>
        </section>
      );
    }
    case "video": {
      const d = block.data;
      return (
        <section className="max-w-4xl mx-auto px-4 py-8">
          {d.titulo && <h2 className="text-2xl font-serif mb-4 text-center">{d.titulo}</h2>}
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe src={d.embed_url} title={d.titulo ?? "Vídeo"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
          </div>
        </section>
      );
    }
    case "cta": {
      const d = block.data;
      return (
        <section className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="rounded-lg border bg-card p-8">
            <h2 className="text-2xl font-serif mb-2">{d.titulo}</h2>
            {d.descricao && <p className="text-muted-foreground mb-6">{d.descricao}</p>}
            <a
              href={d.botao_href}
              className={`inline-block px-6 py-3 rounded font-medium ${d.variante === "outline" ? "border border-primary text-primary" : "bg-primary text-primary-foreground"}`}
            >{d.botao_label}</a>
          </div>
        </section>
      );
    }
    case "form": {
      const d = block.data;
      return (
        <section className="max-w-2xl mx-auto px-4 py-12">
          {d.titulo && <h2 className="text-2xl font-serif mb-6 text-center">{d.titulo}</h2>}
          <CmsFormRenderer slug={d.form_slug} />
        </section>
      );
    }
    case "features": {
      const d = block.data;
      return (
        <section className="max-w-6xl mx-auto px-4 py-12">
          {d.titulo && <h2 className="text-2xl font-serif mb-8 text-center">{d.titulo}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {d.itens.map((it, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card">
                {it.icone && <div className="text-3xl mb-3">{it.icone}</div>}
                <h3 className="font-medium mb-2">{it.titulo}</h3>
                {it.descricao && <p className="text-sm text-muted-foreground">{it.descricao}</p>}
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "faq": {
      const d = block.data;
      return (
        <section className="max-w-3xl mx-auto px-4 py-12">
          {d.titulo && <h2 className="text-2xl font-serif mb-8 text-center">{d.titulo}</h2>}
          <div className="space-y-4">
            {d.itens.map((it, i) => (
              <details key={i} className="group p-4 rounded-lg border bg-card">
                <summary className="cursor-pointer font-medium">{it.pergunta}</summary>
                <p className="mt-3 text-muted-foreground text-sm">{it.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      );
    }
    case "spacer": {
      const d = block.data;
      const h = d.altura === "xl" ? "h-32" : d.altura === "lg" ? "h-20" : d.altura === "md" ? "h-12" : "h-6";
      return <div className={h} />;
    }
    default:
      return null;
  }
}
