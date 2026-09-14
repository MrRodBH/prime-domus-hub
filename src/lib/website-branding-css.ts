export function buildBrandingCss(
  bv2: Record<string, string | undefined | null> | undefined | null,
): string {
  if (!bv2) return "";
  const map: Record<string, string> = {
    color_primary: "--primary",
    color_secondary: "--secondary",
    color_accent: "--accent",
    color_button: "--ring",
    color_link: "--gold",
  };
  const decls: string[] = [];
  for (const [k, v] of Object.entries(map)) {
    const val = bv2[k];
    if (val && typeof val === "string" && val.trim()) decls.push(`${v}: ${val.trim()};`);
  }
  if (bv2.font_primary)
    decls.push(`--font-sans: "${bv2.font_primary}", ui-sans-serif, system-ui, sans-serif;`);
  if (bv2.font_secondary)
    decls.push(`--font-display: "${bv2.font_secondary}", ui-serif, Georgia, serif;`);
  if (!decls.length) return "";
  return `:root{${decls.join("")}}`;
}

