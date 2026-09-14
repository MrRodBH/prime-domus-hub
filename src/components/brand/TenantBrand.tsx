import { tenantPresentationFavicon } from '@/lib/brand-assets';

export type WorkspaceTenantIdentity = { id: string; name: string; slug: string };

// Owner-supplied presentation asset for this verified identity only.
// This does not resolve a tenant or replace the versioned website CMS favicon.
export function workspaceTenantMark(tenant?: WorkspaceTenantIdentity | null): string | null {
  return tenantPresentationFavicon(tenant?.id);
}

export function TenantBrand({ tenant, collapsed = false }: { tenant?: WorkspaceTenantIdentity | null; collapsed?: boolean }) {
  const name = tenant?.name || 'Sua empresa';
  const mark = workspaceTenantMark(tenant);
  return <div className={collapsed ? 'px-2 py-3' : 'px-3 py-4'} data-tenant-brand="workspace">
    <div className={`flex items-center rounded-xl bg-white text-[#123f47] shadow-sm ${collapsed ? 'size-12 justify-center' : 'min-h-24 gap-3 px-3 py-3'}`} title={name}>
      {mark ? <img src={mark} alt={collapsed ? name : ''} className={collapsed ? 'size-10 object-contain' : 'size-14 shrink-0 object-contain'} />
        : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#123f47]/10 text-lg font-semibold" aria-hidden="true">{tenant ? name.trim().slice(0,2).toUpperCase() : '—'}</span>}
      <div className={collapsed ? 'sr-only' : 'min-w-0'}>
        <p className="break-words text-base font-semibold leading-snug">{name}</p>
        <p className="mt-1 text-xs text-[#123f47]/75">Painel da empresa</p>
      </div>
    </div>
  </div>;
}
