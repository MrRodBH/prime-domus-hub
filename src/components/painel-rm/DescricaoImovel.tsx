import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DescricaoImovel({ texto }: { texto: string }) {
  return <div className="space-y-4 break-words leading-relaxed text-muted-foreground [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_p]:whitespace-pre-line">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{texto}</ReactMarkdown>
  </div>;
}