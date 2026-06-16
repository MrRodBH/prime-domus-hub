
CREATE TABLE public.blog_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categorias TO authenticated;
GRANT ALL ON public.blog_categorias TO service_role;
ALTER TABLE public.blog_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias publicas" ON public.blog_categorias FOR SELECT USING (true);
CREATE POLICY "admins gerenciam categorias" ON public.blog_categorias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_categorias_updated BEFORE UPDATE ON public.blog_categorias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TYPE public.blog_post_status AS ENUM ('rascunho', 'publicado');

CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  resumo text,
  conteudo text NOT NULL DEFAULT '',
  imagem_capa text,
  categoria_id uuid REFERENCES public.blog_categorias(id) ON DELETE SET NULL,
  autor_id uuid REFERENCES public.corretores(id) ON DELETE SET NULL,
  status public.blog_post_status NOT NULL DEFAULT 'rascunho',
  meta_title text,
  meta_description text,
  publicado_em timestamptz,
  views int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts publicados sao publicos" ON public.blog_posts FOR SELECT
  USING (status = 'publicado');
CREATE POLICY "admins veem todos os posts" ON public.blog_posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins gerenciam posts" ON public.blog_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_blog_posts_updated BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_blog_posts_status_pub ON public.blog_posts(status, publicado_em DESC);
CREATE INDEX idx_blog_posts_categoria ON public.blog_posts(categoria_id);
