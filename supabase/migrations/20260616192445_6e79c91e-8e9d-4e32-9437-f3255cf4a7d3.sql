
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'corretor');
CREATE TYPE public.imovel_finalidade AS ENUM ('venda', 'aluguel', 'lancamento');
CREATE TYPE public.imovel_status AS ENUM ('rascunho', 'ativo', 'vendido', 'reservado', 'inativo');
CREATE TYPE public.imovel_tipo AS ENUM ('apartamento', 'cobertura', 'casa', 'casa_condominio', 'terreno', 'comercial', 'garden');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bairros
CREATE TABLE public.bairros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  cidade text NOT NULL DEFAULT 'Belo Horizonte',
  estado text NOT NULL DEFAULT 'MG',
  descricao text,
  imagem_url text,
  destaque boolean NOT NULL DEFAULT false,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bairros TO anon, authenticated;
GRANT ALL ON public.bairros TO service_role;
ALTER TABLE public.bairros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bairros public read" ON public.bairros FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "bairros admin write" ON public.bairros FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER bairros_updated BEFORE UPDATE ON public.bairros FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- corretores
CREATE TABLE public.corretores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  creci text,
  email text,
  telefone text,
  whatsapp text,
  foto_url text,
  bio text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.corretores TO anon, authenticated;
GRANT ALL ON public.corretores TO service_role;
ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "corretores public read" ON public.corretores FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "corretores admin all" ON public.corretores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER corretores_updated BEFORE UPDATE ON public.corretores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- imoveis
CREATE TABLE public.imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  finalidade public.imovel_finalidade NOT NULL DEFAULT 'venda',
  tipo public.imovel_tipo NOT NULL DEFAULT 'apartamento',
  status public.imovel_status NOT NULL DEFAULT 'rascunho',
  preco numeric(14,2),
  preco_sob_consulta boolean NOT NULL DEFAULT false,
  condominio numeric(12,2),
  iptu numeric(12,2),
  area_total numeric(10,2),
  area_util numeric(10,2),
  quartos int,
  suites int,
  banheiros int,
  vagas int,
  endereco text,
  bairro_id uuid REFERENCES public.bairros(id) ON DELETE SET NULL,
  corretor_id uuid REFERENCES public.corretores(id) ON DELETE SET NULL,
  imagem_capa text,
  destaque boolean NOT NULL DEFAULT false,
  exclusivo boolean NOT NULL DEFAULT false,
  badge text,
  caracteristicas text[] DEFAULT '{}',
  latitude numeric(10,7),
  longitude numeric(10,7),
  views int NOT NULL DEFAULT 0,
  publicado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.imoveis TO anon, authenticated;
GRANT ALL ON public.imoveis TO service_role;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imoveis public read" ON public.imoveis FOR SELECT TO anon, authenticated USING (status = 'ativo');
CREATE POLICY "imoveis admin all" ON public.imoveis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER imoveis_updated BEFORE UPDATE ON public.imoveis FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_imoveis_status ON public.imoveis(status);
CREATE INDEX idx_imoveis_bairro ON public.imoveis(bairro_id);
CREATE INDEX idx_imoveis_finalidade ON public.imoveis(finalidade);
CREATE INDEX idx_imoveis_destaque ON public.imoveis(destaque) WHERE destaque = true;

-- imovel_imagens
CREATE TABLE public.imovel_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.imovel_imagens TO anon, authenticated;
GRANT ALL ON public.imovel_imagens TO service_role;
ALTER TABLE public.imovel_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imovel_imagens public read" ON public.imovel_imagens FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = imovel_id AND i.status = 'ativo'));
CREATE POLICY "imovel_imagens admin all" ON public.imovel_imagens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_imovel_imagens_imovel ON public.imovel_imagens(imovel_id);

-- leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  mensagem text,
  origem text,
  imovel_id uuid REFERENCES public.imoveis(id) ON DELETE SET NULL,
  corretor_id uuid REFERENCES public.corretores(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads anyone create" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "leads admin read" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leads admin update" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "leads admin delete" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
