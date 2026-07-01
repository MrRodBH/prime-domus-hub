-- ============================================================================
-- FASE 3 — ONDA 1: BIBLIOTECA DE MÍDIAS
-- ============================================================================

-- Tabela principal
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  nome TEXT NOT NULL,
  arquivo TEXT NOT NULL,                -- storage path (tenant-id/media/uuid-filename.ext)
  arquivo_medium TEXT,                  -- variante medium (webp)
  arquivo_thumbnail TEXT,               -- variante thumb (webp)
  tipo TEXT NOT NULL,                   -- image | video | pdf | audio | other
  mime_type TEXT NOT NULL,
  tamanho BIGINT NOT NULL DEFAULT 0,    -- bytes do original
  width INTEGER,
  height INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  descricao TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_library_tenant ON public.media_library(tenant_id);
CREATE INDEX idx_media_library_tipo ON public.media_library(tenant_id, tipo);
CREATE INDEX idx_media_library_created ON public.media_library(tenant_id, created_at DESC);
CREATE INDEX idx_media_library_tags ON public.media_library USING GIN(tags);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- RLS: escrita restrita ao tenant + autenticado
CREATE POLICY "media_library_tenant_read" ON public.media_library
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "media_library_tenant_insert" ON public.media_library
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "media_library_tenant_update" ON public.media_library
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "media_library_tenant_delete" ON public.media_library
  FOR DELETE TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- RESTRICTIVE: hard isolation multi-tenant
CREATE POLICY "media_library_tenant_isolation" ON public.media_library
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

-- trigger updated_at
CREATE TRIGGER trg_media_library_updated_at
  BEFORE UPDATE ON public.media_library
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- Tabela de vínculos (controle de uso — evita exclusão acidental)
-- ============================================================================
CREATE TABLE public.media_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  media_id UUID NOT NULL REFERENCES public.media_library(id) ON DELETE CASCADE,
  entidade TEXT NOT NULL,               -- 'cms_page' | 'cms_campaign' | 'blog_post' | 'site_settings' | ...
  entidade_id TEXT,                     -- id do registro que usa (nullable pra chaves globais tipo site_settings)
  campo TEXT,                           -- ex.: 'hero.image', 'cover_url'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_usage_media ON public.media_usage(media_id);
CREATE INDEX idx_media_usage_tenant ON public.media_usage(tenant_id);
CREATE UNIQUE INDEX uq_media_usage_link
  ON public.media_usage(media_id, entidade, COALESCE(entidade_id, ''), COALESCE(campo, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_usage TO authenticated;
GRANT ALL ON public.media_usage TO service_role;

ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_usage_tenant_all" ON public.media_usage
  FOR ALL TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "media_usage_tenant_isolation" ON public.media_usage
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

-- ============================================================================
-- Storage policies para bucket 'site' pasta 'media/'
-- Estrutura: {tenant_id}/media/{uuid}-{filename}
-- ============================================================================

-- Leitura: qualquer membro do tenant (via server signed URLs) — mas policy garante bloqueio direto
CREATE POLICY "media_library_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'site'
    AND (storage.foldername(name))[2] = 'media'
    AND (
      public.user_belongs_to_tenant(((storage.foldername(name))[1])::uuid)
      OR public.is_super_admin()
    )
  );

CREATE POLICY "media_library_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site'
    AND (storage.foldername(name))[2] = 'media'
    AND (
      public.user_belongs_to_tenant(((storage.foldername(name))[1])::uuid)
      OR public.is_super_admin()
    )
  );

CREATE POLICY "media_library_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site'
    AND (storage.foldername(name))[2] = 'media'
    AND (
      public.user_belongs_to_tenant(((storage.foldername(name))[1])::uuid)
      OR public.is_super_admin()
    )
  );

CREATE POLICY "media_library_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'site'
    AND (storage.foldername(name))[2] = 'media'
    AND (
      public.user_belongs_to_tenant(((storage.foldername(name))[1])::uuid)
      OR public.is_super_admin()
    )
  );