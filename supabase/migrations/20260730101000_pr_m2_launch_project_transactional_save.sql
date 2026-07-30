-- PR-M2 consolidated corrective — transactional Launch project and amenities save.
BEGIN;

CREATE OR REPLACE FUNCTION public.save_tenant_launch_project(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _project_id uuid,
  _project jsonb,
  _amenity_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_project_id uuid;
  v_action public.rbac_action;
  v_status_id uuid;
  v_city_id uuid;
  v_neighborhood_id uuid;
  v_broker_id uuid;
  v_amenity_ids uuid[] := COALESCE(_amenity_ids, ARRAY[]::uuid[]);
  v_published boolean;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _project IS NULL THEN
    RAISE EXCEPTION 'launch_save_invalid_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(_project) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'launch_save_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_object_keys(_project) AS key
     WHERE key NOT IN (
       'slug','nome','descricao','status_id','quartos','suites','vagas',
       'area_apartamentos','construtora','entrega','endereco','cidade_id',
       'bairro_id','arquitetura','numero_unidades','numero_torres',
       'unidades_por_andar','numero_andares','elevadores','corretor_id',
       'video_url','publicado','destaque','meta_title','meta_description'
     )
  ) THEN
    RAISE EXCEPTION 'launch_save_payload_key_not_allowed' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(_project->>'slug'), '') IS NULL
     OR length(trim(_project->>'slug')) > 200
     OR NULLIF(trim(_project->>'nome'), '') IS NULL
     OR length(trim(_project->>'nome')) > 300
     OR length(COALESCE(_project->>'descricao', '')) > 200000
     OR length(COALESCE(_project->>'construtora', '')) > 300
     OR length(COALESCE(_project->>'endereco', '')) > 1000
     OR length(COALESCE(_project->>'arquitetura', '')) > 300
     OR length(COALESCE(_project->>'video_url', '')) > 1000
     OR length(COALESCE(_project->>'meta_title', '')) > 60
     OR length(COALESCE(_project->>'meta_description', '')) > 160 THEN
    RAISE EXCEPTION 'launch_save_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_amenity_ids) > 100
     OR cardinality(v_amenity_ids) IS DISTINCT FROM (
       SELECT count(DISTINCT value)::integer FROM unnest(v_amenity_ids) AS value
     ) THEN
    RAISE EXCEPTION 'launch_amenity_ids_invalid' USING ERRCODE = '22023';
  END IF;

  v_published := COALESCE((_project->>'publicado')::boolean, false);
  v_action := CASE
    WHEN v_published THEN 'publicar'::public.rbac_action
    WHEN _project_id IS NULL THEN 'criar'::public.rbac_action
    ELSE 'editar'::public.rbac_action
  END;
  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'cms.paginas',
    v_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'launch_save_permission_denied' USING ERRCODE = '42501';
  END IF;

  v_status_id := NULLIF(_project->>'status_id', '')::uuid;
  v_city_id := NULLIF(_project->>'cidade_id', '')::uuid;
  v_neighborhood_id := NULLIF(_project->>'bairro_id', '')::uuid;
  v_broker_id := NULLIF(_project->>'corretor_id', '')::uuid;

  IF v_status_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.launch_statuses
     WHERE tenant_id = _tenant_id AND id = v_status_id
  ) THEN
    RAISE EXCEPTION 'launch_status_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;
  IF v_city_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cidades
     WHERE tenant_id = _tenant_id AND id = v_city_id
  ) THEN
    RAISE EXCEPTION 'launch_city_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;
  IF v_neighborhood_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bairros
     WHERE tenant_id = _tenant_id AND id = v_neighborhood_id
  ) THEN
    RAISE EXCEPTION 'launch_neighborhood_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;
  IF v_broker_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.corretores
     WHERE tenant_id = _tenant_id AND id = v_broker_id
  ) THEN
    RAISE EXCEPTION 'launch_broker_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;
  IF cardinality(v_amenity_ids) > 0 AND cardinality(v_amenity_ids) IS DISTINCT FROM (
    SELECT count(*)::integer
      FROM public.launch_amenities
     WHERE tenant_id = _tenant_id
       AND id = ANY(v_amenity_ids)
  ) THEN
    RAISE EXCEPTION 'launch_amenity_cross_tenant_or_missing' USING ERRCODE = '42501';
  END IF;

  IF _project_id IS NULL THEN
    INSERT INTO public.launch_projects (
      tenant_id, slug, nome, descricao, status_id, quartos, suites, vagas,
      area_apartamentos, construtora, entrega, endereco, cidade_id, bairro_id,
      arquitetura, numero_unidades, numero_torres, unidades_por_andar,
      numero_andares, elevadores, corretor_id, video_url, publicado, destaque,
      meta_title, meta_description
    ) VALUES (
      _tenant_id,
      trim(_project->>'slug'),
      trim(_project->>'nome'),
      NULLIF(_project->>'descricao', ''),
      v_status_id,
      NULLIF(_project->>'quartos', '')::integer,
      NULLIF(_project->>'suites', '')::integer,
      NULLIF(_project->>'vagas', '')::integer,
      NULLIF(_project->>'area_apartamentos', '')::numeric,
      NULLIF(_project->>'construtora', ''),
      NULLIF(_project->>'entrega', '')::date,
      NULLIF(_project->>'endereco', ''),
      v_city_id,
      v_neighborhood_id,
      NULLIF(_project->>'arquitetura', ''),
      NULLIF(_project->>'numero_unidades', '')::integer,
      NULLIF(_project->>'numero_torres', '')::integer,
      NULLIF(_project->>'unidades_por_andar', '')::integer,
      NULLIF(_project->>'numero_andares', '')::integer,
      NULLIF(_project->>'elevadores', '')::integer,
      v_broker_id,
      NULLIF(_project->>'video_url', ''),
      v_published,
      COALESCE((_project->>'destaque')::boolean, false),
      NULLIF(_project->>'meta_title', ''),
      NULLIF(_project->>'meta_description', '')
    ) RETURNING id INTO v_project_id;
  ELSE
    UPDATE public.launch_projects
       SET slug = trim(_project->>'slug'),
           nome = trim(_project->>'nome'),
           descricao = NULLIF(_project->>'descricao', ''),
           status_id = v_status_id,
           quartos = NULLIF(_project->>'quartos', '')::integer,
           suites = NULLIF(_project->>'suites', '')::integer,
           vagas = NULLIF(_project->>'vagas', '')::integer,
           area_apartamentos = NULLIF(_project->>'area_apartamentos', '')::numeric,
           construtora = NULLIF(_project->>'construtora', ''),
           entrega = NULLIF(_project->>'entrega', '')::date,
           endereco = NULLIF(_project->>'endereco', ''),
           cidade_id = v_city_id,
           bairro_id = v_neighborhood_id,
           arquitetura = NULLIF(_project->>'arquitetura', ''),
           numero_unidades = NULLIF(_project->>'numero_unidades', '')::integer,
           numero_torres = NULLIF(_project->>'numero_torres', '')::integer,
           unidades_por_andar = NULLIF(_project->>'unidades_por_andar', '')::integer,
           numero_andares = NULLIF(_project->>'numero_andares', '')::integer,
           elevadores = NULLIF(_project->>'elevadores', '')::integer,
           corretor_id = v_broker_id,
           video_url = NULLIF(_project->>'video_url', ''),
           publicado = v_published,
           destaque = COALESCE((_project->>'destaque')::boolean, false),
           meta_title = NULLIF(_project->>'meta_title', ''),
           meta_description = NULLIF(_project->>'meta_description', ''),
           updated_at = now()
     WHERE tenant_id = _tenant_id AND id = _project_id
     RETURNING id INTO v_project_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'launch_project_cross_tenant_or_missing' USING ERRCODE = '22023';
    END IF;
  END IF;

  DELETE FROM public.launch_project_amenities
   WHERE tenant_id = _tenant_id AND project_id = v_project_id;
  IF cardinality(v_amenity_ids) > 0 THEN
    INSERT INTO public.launch_project_amenities (tenant_id, project_id, amenity_id)
    SELECT _tenant_id, v_project_id, amenity_id
      FROM unnest(v_amenity_ids) AS amenity_id;
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'launch.project.save',
    'launch_projects',
    v_project_id::text,
    jsonb_build_object(
      'published', v_published,
      'amenityCount', cardinality(v_amenity_ids),
      'transactional', true
    )
  );

  RETURN jsonb_build_object(
    'id', v_project_id::text,
    'ok', true,
    'amenityCount', cardinality(v_amenity_ids),
    'transactional', true
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.save_tenant_launch_project(uuid,uuid,text,uuid,jsonb,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_tenant_launch_project(uuid,uuid,text,uuid,jsonb,uuid[]) TO service_role;

COMMIT;
