// Registry de entidades CMS — Bloco 3 §7 (editor preparado p/ crescimento).
// Cada entidade declara: adapters de CRUD + blocos suportados + slug público.
// Neste bloco: "pagina" está totalmente implementada. Blog/Form/Campanha registrados p/ evolução.
import type { CmsBlock } from "@/adapters/cms-legacy";

export type EntityKind = "pagina" | "post" | "form" | "campanha";
export type ContentStatus = "draft" | "published" | "archived";

export type ContentEntityRecord = {
  id: string;
  titulo: string;
  slug: string | null;
  status: ContentStatus;
  updated_at: string;
  published_at: string | null;
};

export type ContentEntityDetail = ContentEntityRecord & {
  descricao: string | null;
  seo: Record<string, unknown>;
  blocks: CmsBlock[];
};

export type BlockKind = CmsBlock["type"];

export type EntityDescriptor = {
  kind: EntityKind;
  singular: string;   // "Página"
  plural: string;     // "Páginas"
  route: string;      // "/admin/paginas"
  publicPathPrefix: string; // "/p/"
  supportedBlocks: BlockKind[];
  tabs: Array<"conteudo" | "seo" | "preview" | "versoes" | "publicacao">;
  ready: boolean;     // se false, mostra "em breve" no workspace
};

export const ENTITIES: Record<EntityKind, EntityDescriptor> = {
  pagina: {
    kind: "pagina",
    singular: "Página",
    plural: "Páginas",
    route: "/admin/paginas",
    publicPathPrefix: "/p/",
    supportedBlocks: ["hero","richtext","image","gallery","video","cta","form","features","faq","spacer"],
    tabs: ["conteudo","seo","preview","versoes","publicacao"],
    ready: true,
  },
  post: {
    kind: "post",
    singular: "Post",
    plural: "Posts",
    route: "/admin/blog",
    publicPathPrefix: "/blog/",
    supportedBlocks: ["richtext","image","gallery","video","cta","spacer"],
    tabs: ["conteudo","seo","preview","versoes","publicacao"],
    ready: false,
  },
  form: {
    kind: "form",
    singular: "Formulário",
    plural: "Formulários",
    route: "/admin/formularios",
    publicPathPrefix: "/f/",
    supportedBlocks: [],
    tabs: ["conteudo","publicacao"],
    ready: false,
  },
  campanha: {
    kind: "campanha",
    singular: "Campanha",
    plural: "Campanhas",
    route: "/admin/campanhas",
    publicPathPrefix: "/c/",
    supportedBlocks: ["hero","richtext","image","gallery","cta","form","features","faq","spacer"],
    tabs: ["conteudo","seo","preview","versoes","publicacao"],
    ready: false,
  },
};
