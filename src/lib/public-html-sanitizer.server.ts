import sanitizeHtml from "sanitize-html";
import {
  normalizePublicLinkPresentation,
  normalizePublicMediaUrl,
  normalizePublicNavigationUrl,
} from "@/lib/public-content-security";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "b", "i", "u",
  "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote",
  "pre", "code", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption",
  "img", "a", "span", "sup", "sub",
] as const;

function numericDimension(value: string | undefined): string | undefined {
  return value && /^\d{1,5}$/.test(value) ? value : undefined;
}

export function sanitizePublicHtml(input: string | null | undefined): string {
  const value = typeof input === "string" ? input : "";
  return sanitizeHtml(value, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
    },
    disallowedTagsMode: "discard",
    allowProtocolRelative: false,
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesByTag: {
      a: ["https", "mailto", "tel"],
      img: ["https"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    parser: {
      lowerCaseAttributeNames: true,
      lowerCaseTags: true,
    },
    transformTags: {
      a: (_tagName, attribs) => {
        const href = normalizePublicNavigationUrl(attribs.href, "contact");
        const presentation = href
          ? normalizePublicLinkPresentation(href, attribs.target)
          : { target: "_self" as const };
        return {
          tagName: "a",
          attribs: {
            ...(href ? { href } : {}),
            ...(attribs.title ? { title: attribs.title } : {}),
            target: presentation.target,
            ...(presentation.rel ? { rel: presentation.rel } : {}),
          },
        };
      },
      img: (_tagName, attribs) => {
        const src = normalizePublicMediaUrl(attribs.src);
        return {
          tagName: "img",
          attribs: {
            ...(src ? { src } : {}),
            ...(attribs.alt ? { alt: attribs.alt } : {}),
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(numericDimension(attribs.width) ? { width: numericDimension(attribs.width)! } : {}),
            ...(numericDimension(attribs.height) ? { height: numericDimension(attribs.height)! } : {}),
          },
        };
      },
    },
  });
}
