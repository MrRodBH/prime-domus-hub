create table public.tenant_bank_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  banco text not null, modalidade text not null default '', sistema text not null check (sistema in ('SAC','PRICE')),
  taxa_aa numeric(6,3) not null check (taxa_aa > 0 and taxa_aa <= 30),
  fonte text not null default 'manual', data_referencia date not null default current_date,
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, banco, modalidade, sistema, fonte)
);
create table public.tenant_mcmv_faixas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  ordem int not null, nome text not null, renda_min numeric not null default 0, renda_max numeric not null default 0,
  teto_imovel numeric not null default 0, taxa_aa numeric(6,3) not null, prazo_max_meses int not null default 420,
  cota_maxima numeric not null default 80, observacao text, ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.tenant_bank_rates, public.tenant_mcmv_faixas to authenticated;
grant all on public.tenant_bank_rates, public.tenant_mcmv_faixas to service_role;
alter table public.tenant_bank_rates enable row level security;
alter table public.tenant_mcmv_faixas enable row level security;
create policy "bank_rates tenant admin all" on public.tenant_bank_rates for all to authenticated using (public.is_active_tenant_admin(tenant_id)) with check (public.is_active_tenant_admin(tenant_id));
create policy "mcmv tenant admin all" on public.tenant_mcmv_faixas for all to authenticated using (public.is_active_tenant_admin(tenant_id)) with check (public.is_active_tenant_admin(tenant_id));
insert into public.tenant_bank_rates(tenant_id,banco,modalidade,sistema,taxa_aa,fonte,data_referencia) values
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · IPCA','PRICE',4.840,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas de mercado · Prefixado','PRICE',10.760,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas de mercado · TR','SAC',12.120,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas de mercado · TR','PRICE',12.120,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · Prefixado','SAC',10.940,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · Prefixado','PRICE',10.940,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · TR','SAC',8.100,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · TR','PRICE',8.100,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas reguladas (SFH) · IPCA','SAC',4.840,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','CEF','Taxas de mercado · Prefixado','SAC',10.760,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Itaú','Taxas reguladas (SFH) · TR','SAC',11.870,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Itaú','Taxas reguladas (SFH) · TR','PRICE',11.870,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Itaú','Taxas de mercado · TR','SAC',12.060,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Itaú','Taxas de mercado · TR','PRICE',12.060,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Bradesco','Taxas reguladas (SFH) · TR','PRICE',11.770,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Bradesco','Taxas de mercado · TR','PRICE',12.300,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Bradesco','Taxas de mercado · TR','SAC',12.300,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Bradesco','Taxas reguladas (SFH) · TR','SAC',11.770,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Inter','Taxas de mercado · TR','PRICE',12.470,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Inter','Taxas reguladas (SFH) · TR','SAC',9.300,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Inter','Taxas reguladas (SFH) · TR','PRICE',9.300,'scraping','2026-08-01'),
('9664d189-4a12-4caa-8243-dc73383447e6','Inter','Taxas de mercado · TR','SAC',12.470,'scraping','2026-08-01');
insert into public.tenant_mcmv_faixas(tenant_id,ordem,nome,renda_min,renda_max,teto_imovel,taxa_aa,prazo_max_meses,cota_maxima,observacao,ativo) values
('9664d189-4a12-4caa-8243-dc73383447e6',1,'Faixa 1',0,3200,270000,4.25,420,80,'Portaria MCID 333/2026. Taxa 4,00% a.a. no Norte/Nordeste. Maior subsídio do programa.',true),
('9664d189-4a12-4caa-8243-dc73383447e6',2,'Faixa 2',3200.01,5000,275000,6.50,420,80,'Portaria MCID 333/2026. Teto do imóvel varia conforme o porte do município.',true),
('9664d189-4a12-4caa-8243-dc73383447e6',3,'Faixa 3',5000.01,9600,400000,7.66,420,80,'Portaria MCID 333/2026.',true),
('9664d189-4a12-4caa-8243-dc73383447e6',4,'Faixa 4 — Classe Média',9600.01,13000,600000,10.00,420,80,'Portaria MCID 333/2026. Faixa classe média, sem subsídio.',true);