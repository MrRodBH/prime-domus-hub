
-- M3.3 — Legacy File Migration
-- Cria a infraestrutura de auditoria e rollback para migração incremental de storage
-- legado. Não movimenta arquivo algum; apenas persiste log e classificação.

CREATE TABLE public.storage_migration_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  entity TEXT NOT NULL,              -- ex.: 'blog_posts', 'corretores', 'site_settings.home_hero'
  entity_id TEXT NOT NULL,           -- id da linha (ou chave do settings)
  bucket TEXT NOT NULL,
  old_path TEXT,                     -- path original (ou URL absoluta legada)
  new_path TEXT NOT NULL,            -- path server-authoritative resultante
  file_size BIGINT,
  action TEXT NOT NULL,              -- 'copy', 'metadata-update', 'noop', 'orphan-classify', 'inconsistency'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','success','failed','rolled_back','dry_run'
  dry_run BOOLEAN NOT NULL DEFAULT true,
  operator_id UUID,                  -- auth.uid() do super_admin que disparou o lote
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_migration_log_batch ON public.storage_migration_log(batch_id);
CREATE INDEX idx_storage_migration_log_tenant ON public.storage_migration_log(tenant_id);
CREATE INDEX idx_storage_migration_log_status ON public.storage_migration_log(status);

GRANT SELECT, INSERT, UPDATE ON public.storage_migration_log TO authenticated;
GRANT ALL ON public.storage_migration_log TO service_role;

ALTER TABLE public.storage_migration_log ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin lê/escreve o log de migração.
CREATE POLICY "storage_migration_log super admin only"
  ON public.storage_migration_log
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_storage_migration_log_updated_at
  BEFORE UPDATE ON public.storage_migration_log
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
