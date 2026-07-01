-- M3: Storage multi-tenant. RM Prime tenant = 9664d189-4a12-4caa-8243-dc73383447e6.
DO $$
DECLARE
  rm uuid := '9664d189-4a12-4caa-8243-dc73383447e6';
  prefix text := rm::text || '/';
BEGIN
  -- 1. Renomeia objetos em storage.objects (prepend tenant prefix) se ainda não estiver prefixado.
  UPDATE storage.objects
     SET name = prefix || name
   WHERE bucket_id IN ('imoveis','lancamentos','site')
     AND position(prefix in name) <> 1;

  -- 2. Atualiza colunas de path no BD (só quando não é URL http e ainda não prefixado).
  UPDATE public.imovel_imagens
     SET url = prefix || url
   WHERE url IS NOT NULL
     AND url NOT LIKE 'http%'
     AND position(prefix in url) <> 1;

  UPDATE public.launch_project_imagens
     SET storage_path = prefix || storage_path
   WHERE storage_path IS NOT NULL
     AND storage_path NOT LIKE 'http%'
     AND position(prefix in storage_path) <> 1;

  UPDATE public.launch_pdfs
     SET storage_path = prefix || storage_path
   WHERE storage_path IS NOT NULL
     AND storage_path NOT LIKE 'http%'
     AND position(prefix in storage_path) <> 1;

  UPDATE public.blog_posts
     SET imagem_capa = prefix || imagem_capa
   WHERE imagem_capa IS NOT NULL
     AND imagem_capa NOT LIKE 'http%'
     AND position(prefix in imagem_capa) <> 1;

  UPDATE public.corretores
     SET foto_url = prefix || foto_url
   WHERE foto_url IS NOT NULL
     AND foto_url NOT LIKE 'http%'
     AND position(prefix in foto_url) <> 1;

  -- 3. Também no launch_projects (imagem_capa é bucket path)
  BEGIN
    EXECUTE format(
      $q$UPDATE public.launch_projects SET imagem_capa = %L || imagem_capa
         WHERE imagem_capa IS NOT NULL AND imagem_capa NOT LIKE 'http%%'
         AND position(%L in imagem_capa) <> 1$q$, prefix, prefix
    );
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  -- 4. site_settings: JSONB walker — prefixa strings que parecem bucket paths.
  UPDATE public.site_settings s
     SET value = (
       SELECT jsonb_object_agg(k, CASE
         WHEN jsonb_typeof(v) = 'string'
              AND v #>> '{}' NOT LIKE 'http%'
              AND v #>> '{}' LIKE '%/%'
              AND position(prefix in (v #>> '{}')) <> 1
           THEN to_jsonb(prefix || (v #>> '{}'))
         ELSE v END)
       FROM jsonb_each(s.value) AS t(k, v)
     )
   WHERE jsonb_typeof(value) = 'object';
END $$;

-- 5. Drop policies antigas de storage.
DROP POLICY IF EXISTS "imoveis storage admin delete" ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage admin read"   ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage admin update" ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage admin write"  ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage corretor delete" ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage corretor insert" ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage corretor read"   ON storage.objects;
DROP POLICY IF EXISTS "imoveis storage corretor update" ON storage.objects;
DROP POLICY IF EXISTS "lancamentos_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "site storage admin delete" ON storage.objects;
DROP POLICY IF EXISTS "site storage admin read"   ON storage.objects;
DROP POLICY IF EXISTS "site storage admin update" ON storage.objects;
DROP POLICY IF EXISTS "site storage admin write"  ON storage.objects;

-- 6. Novas policies: tenant folder check + super_admin bypass.
-- Leitura: qualquer authenticated do tenant OU service role (admin service).
CREATE POLICY tenant_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('imoveis','lancamentos','site')
    AND (
      public.is_super_admin()
      OR ( (storage.foldername(name))[1]::text = public.get_current_tenant_id()::text )
    )
  );

CREATE POLICY tenant_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('imoveis','lancamentos','site')
    AND (
      public.is_super_admin()
      OR ( (storage.foldername(name))[1]::text = public.get_current_tenant_id()::text )
    )
  );

CREATE POLICY tenant_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('imoveis','lancamentos','site')
    AND (
      public.is_super_admin()
      OR ( (storage.foldername(name))[1]::text = public.get_current_tenant_id()::text )
    )
  );

CREATE POLICY tenant_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('imoveis','lancamentos','site')
    AND (
      public.is_super_admin()
      OR ( (storage.foldername(name))[1]::text = public.get_current_tenant_id()::text )
    )
  );