const pageDefinitions: Record<string, { label: string; url: string }> = {
  inicio: { label: 'Início', url: '/' }, imoveis: { label: 'Imóveis', url: '/imoveis' },
  lancamentos: { label: 'Lançamentos', url: '/lancamentos' }, sobre: { label: 'Sobre', url: '/sobre' }, contato: { label: 'Contato', url: '/contato' },
};

// Preserve custom entries, footer entries, identities and unknown approved fields.
export function updateWebsiteStarterMenu(input: unknown, selected: string[]) {
  const existing = Array.isArray(input) ? input as Record<string, unknown>[] : [];
  const selectedUrls = new Set(selected.map(key => pageDefinitions[key]?.url).filter(Boolean));
  const managedUrls = new Set(Object.values(pageDefinitions).map(page => page.url));
  const result = existing.filter(item => item.location !== 'header' || !managedUrls.has(String(item.url)) || selectedUrls.has(String(item.url)));
  for (const key of selected) {
    const page = pageDefinitions[key];
    if (!page || result.some(item => item.location === 'header' && item.url === page.url)) continue;
    const maxOrder = Math.max(0, ...result.map(item => Number(item.order ?? item.ordem) || 0));
    let id = `website-${key}`;
    let suffix = 1;
    while (result.some(item => item.id === id)) id = `website-${key}-${suffix++}`;
    result.push({ id, location: 'header', label: page.label, url: page.url, order: maxOrder + 10, visible: true, target: '_self', type: 'internal' });
  }
  return result;
}

export function websiteHeroTitle(hero: unknown): string {
  const h = hero && typeof hero === 'object' ? hero as Record<string, unknown> : {};
  return Array.isArray(h.title_lines) ? h.title_lines.join('\n') : typeof h.titulo === 'string' ? h.titulo : '';
}
