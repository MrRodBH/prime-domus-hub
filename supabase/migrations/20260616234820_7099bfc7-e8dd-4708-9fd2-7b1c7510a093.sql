CREATE TABLE public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  legenda TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '',
  imagem_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho',
  modelo_ia TEXT,
  publicado_em TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instagram_posts_imovel ON public.instagram_posts(imovel_id);
CREATE INDEX idx_instagram_posts_status ON public.instagram_posts(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_posts TO authenticated;
GRANT ALL ON public.instagram_posts TO service_role;

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam posts instagram"
ON public.instagram_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_instagram_posts_updated_at
BEFORE UPDATE ON public.instagram_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();