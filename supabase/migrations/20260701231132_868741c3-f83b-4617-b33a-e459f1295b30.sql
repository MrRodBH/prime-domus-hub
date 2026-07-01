-- Phase 4A step 1: add 'publicar' action and new CMS modules
ALTER TYPE public.rbac_action ADD VALUE IF NOT EXISTS 'publicar';

INSERT INTO public.rbac_modules (codigo, nome, descricao) VALUES
  ('cms.paginas',       'CMS · Páginas',       'Gestão de páginas dinâmicas do site'),
  ('cms.campanhas',     'CMS · Banners & Popups','Banners, popups e campanhas'),
  ('cms.formularios',   'CMS · Formulários',   'Formulários customizados'),
  ('cms.midias',        'CMS · Biblioteca de Mídias','Biblioteca de imagens e arquivos'),
  ('cms.menu',          'CMS · Menu',          'Itens do menu de navegação'),
  ('cms.branding',      'CMS · Branding',      'Logo, cores, tipografia e favicon'),
  ('cms.versoes',       'CMS · Versionamento', 'Rascunho, publicação e histórico'),
  ('cms.configuracoes', 'CMS · Configurações', 'SEO, rodapé, contato, integrações, empresa')
ON CONFLICT (codigo) DO NOTHING;