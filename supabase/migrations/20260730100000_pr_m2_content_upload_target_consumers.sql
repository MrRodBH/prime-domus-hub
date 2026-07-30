-- PR-M2 consolidated corrective — atomic consumers for Blog and Launch media.
-- Client paths, buckets and filenames are transport-only and never final metadata authority.
BEGIN;

CREATE OR REPLACE FUNCTION public.save_tenant_blog_post(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _post_id uuid,
  _title text,
  _slug text,
  _summary text,
  _content text,
  _cover_upload_target_id uuid,
  _category_id uuid,
  _author_id uuid,
  _status text,
  _meta_title text,
  _meta_description text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_target public.tenant_upload_targets%ROWTYPE;
  v_existing_cover text;
  v_cover_path text;
  v_post_id uuid;
  v_action public.rbac_action;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'blog_invalid_authority_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;
  IF _status NOT IN ('rascunho','publicado') THEN
    RAISE EXCEPTION 'blog_invalid_status' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(_title), '') IS NULL OR length(trim(_title)) > 300
     OR NULLIF(trim(_slug), '') IS NULL OR length(trim(_slug)) > 200
     OR length(COALESCE(_summary, '')) > 2000
     OR length(COALESCE(_content, '')) > 200000
     OR length(COALESCE(_meta_title, '')) > 60
     OR length(COALESCE(_meta_description, '')) > 160 THEN
    RAISE EXCEPTION 'blog_input_invalid' USING ERRCODE = '22023';
  END IF;

  v_action := CASE
    WHEN _status = 'publicado' THEN 'publicar'::public.rbac_action
    WHEN _post_id IS NULL THEN 'criar'::public.rbac_action
    ELSE 'editar'::public.rbac_action
  END;
  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin, 'cms.paginas', v_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'blog_permission_denied' USING ERRCODE = '42501';
  END IF;

  IF _category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.blog_categorias
    WHERE tenant_id = _tenant_id AND id = _category_id
  ) THEN
    RAISE EXCEPTION 'blog_category_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;
  IF _author_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.corretores
    WHERE tenant_id = _tenant_id AND id = _author_id
  ) THEN
    RAISE EXCEPTION 'blog_author_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;

  IF _post_id IS NOT NULL THEN
    SELECT imagem_capa INTO v_existing_cover
      FROM public.blog_posts
     WHERE tenant_id = _tenant_id AND id = _post_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'blog_post_cross_tenant_or_missing' USING ERRCODE = '22023';
    END IF;
  END IF;
  v_cover_path := v_existing_cover;

  IF _cover_upload_target_id IS NOT NULL THEN
    SELECT * INTO v_target
      FROM public.tenant_upload_targets
     WHERE tenant_id = _tenant_id AND id = _cover_upload_target_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'upload_target_not_found' USING ERRCODE = '22023';
    END IF;
    IF v_target.actor_user_id <> _actor_user_id THEN
      RAISE EXCEPTION 'upload_target_actor_mismatch' USING ERRCODE = '42501';
    END IF;
    IF v_target.domain <> 'blog-cover'
       OR v_target.bucket <> 'site'
       OR v_target.entity_id IS NOT NULL
       OR v_target.path NOT LIKE _tenant_id::text || '/blog/%' THEN
      RAISE EXCEPTION 'blog_cover_target_mismatch' USING ERRCODE = '42501';
    END IF;
    IF v_target.status <> 'pending' THEN
      RAISE EXCEPTION 'upload_target_not_pending' USING ERRCODE = '22023';
    END IF;
    IF v_target.expires_at <= now() THEN
      UPDATE public.tenant_upload_targets
         SET status = 'expired', updated_at = now()
       WHERE id = v_target.id;
      RAISE EXCEPTION 'upload_target_expired' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = v_target.bucket AND name = v_target.path
    ) THEN
      RAISE EXCEPTION 'upload_target_object_not_found' USING ERRCODE = '22023';
    END IF;
    v_cover_path := v_target.path;
  END IF;

  IF _post_id IS NULL THEN
    INSERT INTO public.blog_posts (
      tenant_id, titulo, slug, resumo, conteudo, imagem_capa,
      categoria_id, autor_id, status, publicado_em, meta_title, meta_description
    ) VALUES (
      _tenant_id, trim(_title), trim(_slug), NULLIF(_summary, ''), COALESCE(_content, ''), v_cover_path,
      _category_id, _author_id, _status::public.blog_post_status,
      CASE WHEN _status = 'publicado' THEN now() ELSE NULL END,
      NULLIF(_meta_title, ''), NULLIF(_meta_description, '')
    ) RETURNING id INTO v_post_id;
  ELSE
    UPDATE public.blog_posts
       SET titulo = trim(_title),
           slug = trim(_slug),
           resumo = NULLIF(_summary, ''),
           conteudo = COALESCE(_content, ''),
           imagem_capa = v_cover_path,
           categoria_id = _category_id,
           autor_id = _author_id,
           status = _status::public.blog_post_status,
           publicado_em = CASE WHEN _status = 'publicado' THEN COALESCE(publicado_em, now()) ELSE NULL END,
           meta_title = NULLIF(_meta_title, ''),
           meta_description = NULLIF(_meta_description, ''),
           updated_at = now()
     WHERE tenant_id = _tenant_id AND id = _post_id
     RETURNING id INTO v_post_id;
  END IF;

  IF _cover_upload_target_id IS NOT NULL THEN
    UPDATE public.tenant_upload_targets
       SET status = 'consumed', consumed_at = now(), updated_at = now()
     WHERE id = v_target.id AND status = 'pending';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'upload_target_concurrent_consumption' USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id, _actor_user_id, 'blog.post.save', 'blog_posts', v_post_id::text,
    jsonb_build_object(
      'status', _status,
      'coverUploadTargetId', _cover_upload_target_id,
      'coverPath', v_cover_path
    )
  );

  RETURN jsonb_build_object(
    'id', v_post_id::text,
    'coverPath', v_cover_path,
    'coverTargetConsumed', _cover_upload_target_id IS NOT NULL
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.consume_tenant_launch_upload_target(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _target_id uuid,
  _project_id uuid,
  _operation text,
  _kind text DEFAULT NULL,
  _title text DEFAULT NULL,
  _legend text DEFAULT NULL,
  _order integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_target public.tenant_upload_targets%ROWTYPE;
  v_slug text;
  v_expected_domain text;
  v_resource_id uuid;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _target_id IS NULL OR _project_id IS NULL THEN
    RAISE EXCEPTION 'launch_upload_invalid_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;
  IF _operation NOT IN ('cover','gallery','pdf') THEN
    RAISE EXCEPTION 'launch_upload_invalid_operation' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(_title, '')) > 300 OR length(COALESCE(_legend, '')) > 500 OR _order < 0 THEN
    RAISE EXCEPTION 'launch_upload_invalid_metadata' USING ERRCODE = '22023';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin, 'cms.midias', 'editar'::public.rbac_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'launch_media_permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT slug INTO v_slug
    FROM public.launch_projects
   WHERE tenant_id = _tenant_id AND id = _project_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'launch_project_cross_tenant_or_missing' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target
    FROM public.tenant_upload_targets
   WHERE tenant_id = _tenant_id AND id = _target_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'upload_target_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_target.actor_user_id <> _actor_user_id THEN
    RAISE EXCEPTION 'upload_target_actor_mismatch' USING ERRCODE = '42501';
  END IF;
  v_expected_domain := CASE _operation
    WHEN 'cover' THEN 'lancamento-capa'
    WHEN 'gallery' THEN 'lancamento-galeria'
    ELSE 'lancamento-pdf'
  END;
  IF v_target.domain <> v_expected_domain
     OR v_target.bucket <> 'lancamentos'
     OR v_target.entity_id IS DISTINCT FROM _project_id THEN
    RAISE EXCEPTION 'launch_upload_target_mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_target.status <> 'pending' THEN
    RAISE EXCEPTION 'upload_target_not_pending' USING ERRCODE = '22023';
  END IF;
  IF v_target.expires_at <= now() THEN
    UPDATE public.tenant_upload_targets
       SET status = 'expired', updated_at = now()
     WHERE id = v_target.id;
    RAISE EXCEPTION 'upload_target_expired' USING ERRCODE = '22023';
  END IF;
  IF _operation = 'cover' AND v_target.path NOT LIKE _tenant_id::text || '/' || v_slug || '/capa/%' THEN
    RAISE EXCEPTION 'launch_cover_path_mismatch' USING ERRCODE = '42501';
  ELSIF _operation = 'gallery' AND v_target.path NOT LIKE _tenant_id::text || '/' || v_slug || '/galeria/%' THEN
    RAISE EXCEPTION 'launch_gallery_path_mismatch' USING ERRCODE = '42501';
  ELSIF _operation = 'pdf' THEN
    IF _kind NOT IN ('tabela_precos','manual') THEN
      RAISE EXCEPTION 'launch_pdf_kind_invalid' USING ERRCODE = '22023';
    END IF;
    IF v_target.path NOT LIKE _tenant_id::text || '/' || v_slug || '/' || _kind || '/%' THEN
      RAISE EXCEPTION 'launch_pdf_path_mismatch' USING ERRCODE = '42501';
    END IF;
    IF _kind = 'tabela_precos' AND (
      SELECT count(*) FROM public.launch_pdfs
      WHERE tenant_id = _tenant_id AND project_id = _project_id AND kind = 'tabela_precos'
    ) >= 3 THEN
      RAISE EXCEPTION 'launch_price_table_limit_reached' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = v_target.bucket AND name = v_target.path
  ) THEN
    RAISE EXCEPTION 'upload_target_object_not_found' USING ERRCODE = '22023';
  END IF;

  IF _operation = 'cover' THEN
    UPDATE public.launch_projects
       SET imagem_capa = v_target.path, updated_at = now()
     WHERE tenant_id = _tenant_id AND id = _project_id;
    v_resource_id := _project_id;
  ELSIF _operation = 'gallery' THEN
    INSERT INTO public.launch_project_imagens (
      tenant_id, project_id, storage_path, legenda, ordem
    ) VALUES (
      _tenant_id, _project_id, v_target.path, NULLIF(trim(_legend), ''), _order
    ) RETURNING id INTO v_resource_id;
  ELSE
    INSERT INTO public.launch_pdfs (
      tenant_id, project_id, kind, titulo, storage_path, tamanho_bytes
    ) VALUES (
      _tenant_id, _project_id, _kind, NULLIF(trim(_title), ''), v_target.path, v_target.size
    ) RETURNING id INTO v_resource_id;
  END IF;

  UPDATE public.tenant_upload_targets
     SET status = 'consumed', consumed_at = now(), updated_at = now()
   WHERE id = v_target.id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'upload_target_concurrent_consumption' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id, _actor_user_id, 'launch.media.upload_target_consumed',
    CASE _operation WHEN 'cover' THEN 'launch_projects' WHEN 'gallery' THEN 'launch_project_imagens' ELSE 'launch_pdfs' END,
    v_resource_id::text,
    jsonb_build_object(
      'projectId', _project_id,
      'operation', _operation,
      'uploadTargetId', v_target.id,
      'path', v_target.path
    )
  );

  RETURN jsonb_build_object(
    'resourceId', v_resource_id::text,
    'projectId', _project_id::text,
    'operation', _operation,
    'path', v_target.path,
    'status', 'consumed'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.save_tenant_blog_post(uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_tenant_launch_upload_target(uuid,uuid,text,uuid,uuid,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tenant_blog_post(uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tenant_launch_upload_target(uuid,uuid,text,uuid,uuid,text,text,text,text,integer) TO service_role;

COMMIT;
