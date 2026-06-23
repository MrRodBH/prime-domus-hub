
-- ============================================================
-- LANÇAMENTOS — Fase 1: schema, storage, RLS, seeds
-- ============================================================

-- Enums
CREATE TYPE public.launch_unit_tipo AS ENUM (
  '1_quarto','2_quartos','3_quartos','4_quartos_mais','cobertura','garden'
);
CREATE TYPE public.launch_unit_status AS ENUM (
  'disponivel','reservada','vendida','indisponivel'
);
CREATE TYPE public.launch_pdf_kind AS ENUM ('tabela_precos','manual');

-- ============================================================
-- Status (lista editável)
-- ============================================================
CREATE TABLE public.launch_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launch_statuses TO anon, authenticated;
GRANT ALL ON public.launch_statuses TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.launch_statuses TO authenticated;
ALTER TABLE public.launch_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_select_all" ON public.launch_statuses FOR SELECT USING (true);
CREATE POLICY "status_admin_write" ON public.launch_statuses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_launch_statuses_updated BEFORE UPDATE ON public.launch_statuses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.launch_statuses (slug, nome, ordem) VALUES
  ('pre_lancamento','Pré-Lançamento',10),
  ('lancamento','Lançamento',20),
  ('em_obras','Em Obras',30),
  ('obras_avancadas','Obras Avançadas',40),
  ('entrega_proxima','Entrega Próxima',50),
  ('pronto_para_morar','Pronto para Morar',60);

-- ============================================================
-- Amenities (lazer)
-- ============================================================
CREATE TABLE public.launch_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  icone TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launch_amenities TO anon, authenticated;
GRANT ALL ON public.launch_amenities TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.launch_amenities TO authenticated;
ALTER TABLE public.launch_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amenities_select_all" ON public.launch_amenities FOR SELECT USING (true);
CREATE POLICY "amenities_admin_write" ON public.launch_amenities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_launch_amenities_updated BEFORE UPDATE ON public.launch_amenities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.launch_amenities (slug, nome, ordem) VALUES
  ('piscina_adulto','Piscina Adulto',10),
  ('piscina_infantil','Piscina Infantil',20),
  ('piscina_aquecida','Piscina Aquecida',30),
  ('sauna','Sauna',40),
  ('academia','Academia',50),
  ('espaco_gourmet','Espaço Gourmet',60),
  ('salao_festas','Salão de Festas',70),
  ('espaco_kids','Espaço Kids',80),
  ('playground','Playground',90),
  ('coworking','Coworking',100),
  ('pet_place','Pet Place',110),
  ('quadra','Quadra',120),
  ('quadra_tenis','Quadra de Tênis',130),
  ('quadra_poliesportiva','Quadra Poliesportiva',140),
  ('beach_tennis','Beach Tennis',150),
  ('espaco_fitness','Espaço Fitness',160),
  ('spa','Spa',170),
  ('lounge','Lounge',180),
  ('rooftop','Rooftop',190),
  ('fire_place','Fire Place',200),
  ('cinema','Cinema',210),
  ('wine_bar','Wine Bar',220),
  ('sports_bar','Sports Bar',230),
  ('market_place','Market Place',240),
  ('espaco_delivery','Espaço Delivery',250),
  ('bicicletario','Bicicletário',260),
  ('carregador_eletrico','Carregador Veículo Elétrico',270),
  ('mini_mercado','Mini Mercado',280),
  ('espaco_beauty','Espaço Beauty',290),
  ('sala_massagem','Sala de Massagem',300),
  ('espaco_zen','Espaço Zen',310),
  ('horta_compartilhada','Horta Compartilhada',320);

-- ============================================================
-- Empreendimento
-- ============================================================
CREATE TABLE public.launch_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,                       -- HTML do rich text
  status_id UUID REFERENCES public.launch_statuses(id) ON DELETE SET NULL,
  quartos INTEGER,
  suites INTEGER,
  vagas INTEGER,
  area_apartamentos NUMERIC(10,2),      -- referência geral; unidades têm sua área
  construtora TEXT,
  entrega DATE,                          -- mes/ano (dia=01)
  endereco TEXT,
  cidade_id UUID REFERENCES public.cidades(id) ON DELETE SET NULL,
  bairro_id UUID REFERENCES public.bairros(id) ON DELETE SET NULL,
  arquitetura TEXT,
  numero_unidades INTEGER,
  numero_torres INTEGER,
  unidades_por_andar INTEGER,
  numero_andares INTEGER,
  elevadores INTEGER,
  corretor_id UUID REFERENCES public.corretores(id) ON DELETE SET NULL,
  imagem_capa TEXT,
  video_url TEXT,
  publicado BOOLEAN NOT NULL DEFAULT FALSE,
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX launch_projects_publicado_idx ON public.launch_projects (publicado);
CREATE INDEX launch_projects_status_idx ON public.launch_projects (status_id);

GRANT SELECT ON public.launch_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_projects TO authenticated;
GRANT ALL ON public.launch_projects TO service_role;
ALTER TABLE public.launch_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_public_select" ON public.launch_projects FOR SELECT USING (publicado = true);
CREATE POLICY "projects_admin_all" ON public.launch_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_launch_projects_updated BEFORE UPDATE ON public.launch_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Relacionamento projeto ↔ amenities
-- ============================================================
CREATE TABLE public.launch_project_amenities (
  project_id UUID NOT NULL REFERENCES public.launch_projects(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.launch_amenities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, amenity_id)
);
GRANT SELECT ON public.launch_project_amenities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_project_amenities TO authenticated;
GRANT ALL ON public.launch_project_amenities TO service_role;
ALTER TABLE public.launch_project_amenities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_select_all" ON public.launch_project_amenities FOR SELECT USING (true);
CREATE POLICY "pa_admin_write" ON public.launch_project_amenities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Imagens da galeria
-- ============================================================
CREATE TABLE public.launch_project_imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.launch_projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  legenda TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX launch_project_imagens_project_idx ON public.launch_project_imagens(project_id, ordem);
GRANT SELECT ON public.launch_project_imagens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_project_imagens TO authenticated;
GRANT ALL ON public.launch_project_imagens TO service_role;
ALTER TABLE public.launch_project_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "img_select_all" ON public.launch_project_imagens FOR SELECT USING (true);
CREATE POLICY "img_admin_write" ON public.launch_project_imagens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Unidades
-- ============================================================
CREATE TABLE public.launch_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.launch_projects(id) ON DELETE CASCADE,
  unidade INTEGER NOT NULL,
  bloco TEXT,                            -- armazenar UPPERCASE
  area NUMERIC(10,2),
  tipo public.launch_unit_tipo,
  vagas INTEGER,
  valor NUMERIC(14,2),
  status public.launch_unit_status NOT NULL DEFAULT 'disponivel',
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX launch_units_project_idx ON public.launch_units(project_id);
CREATE UNIQUE INDEX launch_units_unique_per_project ON public.launch_units(project_id, COALESCE(bloco,''), unidade);
GRANT SELECT ON public.launch_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_units TO authenticated;
GRANT ALL ON public.launch_units TO service_role;
ALTER TABLE public.launch_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_public_select" ON public.launch_units FOR SELECT USING (
  ativa = true AND EXISTS (SELECT 1 FROM public.launch_projects p WHERE p.id = project_id AND p.publicado = true)
);
CREATE POLICY "units_admin_all" ON public.launch_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_launch_units_updated BEFORE UPDATE ON public.launch_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Condições de pagamento (1 por projeto)
-- ============================================================
CREATE TABLE public.launch_payment_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.launch_projects(id) ON DELETE CASCADE,
  entrada NUMERIC(14,2),
  sinal NUMERIC(14,2) NOT NULL,
  parcela_30 NUMERIC(14,2),
  parcela_60 NUMERIC(14,2),
  parcela_90 NUMERIC(14,2),
  num_parcelas INTEGER NOT NULL,
  valor_parcela NUMERIC(14,2) NOT NULL,
  qtd_anuais INTEGER,
  valor_anual NUMERIC(14,2),
  qtd_semestrais INTEGER,
  valor_semestral NUMERIC(14,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.launch_payment_conditions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_payment_conditions TO authenticated;
GRANT ALL ON public.launch_payment_conditions TO service_role;
ALTER TABLE public.launch_payment_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_public_select" ON public.launch_payment_conditions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.launch_projects p WHERE p.id = project_id AND p.publicado = true)
);
CREATE POLICY "pc_admin_all" ON public.launch_payment_conditions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_launch_pc_updated BEFORE UPDATE ON public.launch_payment_conditions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- PDFs (tabela de preços e manuais) — rotação automática
-- ============================================================
CREATE TABLE public.launch_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.launch_projects(id) ON DELETE CASCADE,
  kind public.launch_pdf_kind NOT NULL,
  titulo TEXT,
  storage_path TEXT NOT NULL,
  tamanho_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX launch_pdfs_project_kind_idx ON public.launch_pdfs(project_id, kind, created_at DESC);
GRANT SELECT ON public.launch_pdfs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_pdfs TO authenticated;
GRANT ALL ON public.launch_pdfs TO service_role;
ALTER TABLE public.launch_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdfs_public_select" ON public.launch_pdfs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.launch_projects p WHERE p.id = project_id AND p.publicado = true)
);
CREATE POLICY "pdfs_admin_all" ON public.launch_pdfs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Storage RLS (bucket 'lancamentos' será criado pelo agente)
-- Admin pode tudo; público lê (paths assinados via API)
-- ============================================================
CREATE POLICY "lancamentos_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lancamentos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'lancamentos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lancamentos_anon_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'lancamentos');
