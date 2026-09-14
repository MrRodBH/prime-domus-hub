import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getTenantWebsitePreviewTarget } from '@/lib/api/tenant-configuration.functions';
import { Button } from '@/components/ui/button';

export function WebsitePreview({ viewport, savedVersion, unsaved }: { viewport: string; savedVersion: number; unsaved: boolean }) {
  const getTarget = useServerFn(getTenantWebsitePreviewTarget);
  const target = useQuery({ queryKey: ['website-preview-target'], queryFn: () => getTarget(), retry: false });
  const [origin, setOrigin] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = target.data?.url;
  const sameOrigin = !!url && !!origin && new URL(url).origin === origin;
  const viewportWidth = viewport === 'mobile' ? 375 : viewport === 'tablet' ? 768 : 1280;
  const scale = Math.min(1, width / viewportWidth);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [sameOrigin]);

  return <section className="space-y-3" aria-label="Prévia real do website">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Prévia real do website</h2>
      <Button type="button" size="sm" variant="outline" onClick={() => { setReload(n => n + 1); void target.refetch(); }}>Atualizar prévia</Button>
    </div>
    <p className="text-xs text-muted-foreground">{unsaved ? 'Há alterações não salvas. Salve o rascunho para atualizar a prévia.' : 'A mesma página do site, com a configuração salva. Esta prévia não publica alterações.'}</p>
    {target.isPending ? <p role="status">Preparando prévia…</p> : target.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível localizar o website. Tente atualizar a prévia.</p> : !url ? <p className="text-sm text-muted-foreground">A prévia da página completa estará disponível quando o domínio da empresa estiver conectado. Seu rascunho pode ser salvo normalmente.</p> : <>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Abrir prévia em outra aba</a>
      {sameOrigin ? <div ref={container} className="overflow-hidden rounded-xl border bg-white" style={{ height: 900 * scale }}>
        <iframe key={`${savedVersion}:${reload}`} title="Website da empresa — prévia privada da configuração salva" src={url} className="border-0" style={{ width: viewportWidth, height: 900, transform: `scale(${scale})`, transformOrigin: "top left" }} />
      </div> : <p className="text-xs text-muted-foreground">Abra a prévia no domínio da empresa e entre com sua conta, se solicitado.</p>}
    </>}
  </section>;
}
