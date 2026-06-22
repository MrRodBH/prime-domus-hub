
-- 1) Tabela cidades
CREATE TABLE public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'MG',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cidades TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cidades TO authenticated;
GRANT ALL ON public.cidades TO service_role;

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cidades public read" ON public.cidades
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "cidades admin write" ON public.cidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cidades_updated BEFORE UPDATE ON public.cidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) Seed das cidades existentes
INSERT INTO public.cidades (nome, slug, estado) VALUES
  ('Belo Horizonte', 'belo-horizonte', 'MG'),
  ('Nova Lima', 'nova-lima', 'MG')
ON CONFLICT (slug) DO NOTHING;

-- 3) Vincula bairros à cidade
ALTER TABLE public.bairros ADD COLUMN cidade_id uuid REFERENCES public.cidades(id) ON DELETE SET NULL;
UPDATE public.bairros b SET cidade_id = c.id FROM public.cidades c WHERE c.nome = b.cidade;
CREATE INDEX idx_bairros_cidade ON public.bairros(cidade_id);

-- 4) Remove campos obsoletos
ALTER TABLE public.bairros DROP COLUMN ordem;
ALTER TABLE public.bairros DROP COLUMN cidade;
ALTER TABLE public.bairros DROP COLUMN estado;
