-- PR-M2 — Configuration Center & White Label Functional Completion
-- Canonical authority: immutable whole-tenant snapshots in site_settings_versions.
-- Legacy site_settings and website_menu_items are backfill sources only.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.site_settings_versions
  ADD COLUMN IF NOT EXISTS revision bigint,
  ADD COLUMN IF NOT EXISTS based_on_revision bigint,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.site_settings_versions
  DROP CONSTRAINT IF EXISTS site_settings_versions_configuration_contract;
ALTER TABLE public.site_settings_versions
  ADD CONSTRAINT site_settings_versions_configuration_contract CHECK (
    key <> 'configuration'
    OR (
      revision IS NOT NULL
      AND revision > 0
      AND status IN ('draft', 'published', 'archived')
      AND content_hash IS NOT NULL
      AND content_hash ~ '^[0-9a-f]{64}$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_site_settings_versions_configuration_draft
  ON public.site_settings_versions (tenant_id)
  WHERE key = 'configuration' AND status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS ux_site_settings_versions_configuration_published
  ON public.site_settings_versions (tenant_id)
  WHERE key = 'configuration' AND status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS ux_site_settings_versions_configuration_revision
  ON public.site_settings_versions (tenant_id, revision)
  WHERE key = 'configuration' AND revision IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_site_settings_versions_configuration_history
  ON public.site_settings_versions (tenant_id, revision DESC)
  WHERE key = 'configuration';

CREATE OR REPLACE FUNCTION public.validate_tenant_configuration_snapshot(
  _tenant_id uuid,
  _snapshot jsonb
) RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_key text;
  v_value jsonb;
  v_media_id uuid;
  v_allowed_keys constant text[] := ARRAY[
    'trade_name','legal_name','short_name','tagline','institutional_description',
    'creci_or_registration','tax_document_display','technical_responsible','founded_year',
    'service_regions','languages',
    'primary_logo','secondary_logo','light_logo','dark_logo','favicon','application_icon',
    'default_social_image','watermark',
    'primary_color','secondary_color','accent_color','background_color','surface_color',
    'text_color','muted_text_color','success_color','warning_color','error_color',
    'button_color','link_color','heading_font','body_font','font_scale','border_radius_scale',
    'primary_email','commercial_email','support_email','primary_phone','whatsapp',
    'whatsapp_default_message','address','city','state','postal_code','latitude','longitude',
    'business_hours','emergency_or_after_hours_message','location_description','map_embed_url',
    'instagram','facebook','linkedin','youtube','tiktok','x_twitter','pinterest','x_twitter_handle',
    'default_meta_title','default_meta_description','default_og_image','robots_index','robots_follow',
    'organization_schema_fields','local_business_schema_fields','sitemap_visibility','seo_keywords',
    'privacy_policy_reference','terms_reference','cookie_notice_enabled','cookie_preferences_enabled',
    'data_controller_identity','legal_contact','legal_notice_text',
    'show_prices','show_exact_address','show_broker_contact','show_whatsapp_cta',
    'show_financing_cta','show_similar_properties','show_featured_properties',
    'default_property_sort','items_per_page','lead_form_required_fields','lead_consent_required',
    'lead_assignment_visibility','header_variant','footer_variant','sticky_header','show_search',
    'show_social_links','show_contact_cta','menu_locations','menu_items','footer_columns',
    'legal_links','footer_copyright',
    'ga4_measurement_id','google_tag_manager_container_id','meta_pixel_id',
    'google_ads_conversion_id','linkedin_partner_id','tiktok_pixel_id',
    'domain_activation_state','cloudflare_mode','billing_activation_state','final_visual_refinement',
    'home_hero','home_secoes','home_diferenciais','home_depoimentos','pagina_sobre',
    'pagina_contato','pagina_anuncie','pagina_lancamentos','legacy_settings_archive'
  ];
  v_boolean_keys constant text[] := ARRAY[
    'robots_index','robots_follow','sitemap_visibility','cookie_notice_enabled',
    'cookie_preferences_enabled','show_prices','show_exact_address','show_broker_contact',
    'show_whatsapp_cta','show_financing_cta','show_similar_properties','show_featured_properties',
    'lead_consent_required','sticky_header','show_search','show_social_links','show_contact_cta'
  ];
  v_array_keys constant text[] := ARRAY[
    'service_regions','languages','lead_form_required_fields','menu_locations',
    'business_hours','menu_items','footer_columns','legal_links'
  ];
  v_media_keys constant text[] := ARRAY[
    'primary_logo','secondary_logo','light_logo','dark_logo','favicon','application_icon',
    'default_social_image','watermark','default_og_image'
  ];
  v_color_keys constant text[] := ARRAY[
    'primary_color','secondary_color','accent_color','background_color','surface_color',
    'text_color','muted_text_color','success_color','warning_color','error_color',
    'button_color','link_color'
  ];
BEGIN
  IF _tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023';
  END IF;
  IF _snapshot IS NULL OR jsonb_typeof(_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'configuration_snapshot_invalid' USING ERRCODE = '22023';
  END IF;
  IF octet_length(_snapshot::text) > 1048576 THEN
    RAISE EXCEPTION 'configuration_snapshot_too_large' USING ERRCODE = '22023';
  END IF;
  IF _snapshot::text ~* '<script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]*=' THEN
    RAISE EXCEPTION 'configuration_unsafe_content' USING ERRCODE = '22023';
  END IF;
  IF _snapshot::text ~* '"(client_secret|refresh_token|private_key|api_key|access_token|password)"[[:space:]]*:' THEN
    RAISE EXCEPTION 'configuration_secret_key_prohibited' USING ERRCODE = '22023';
  END IF;

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(_snapshot)
  LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'configuration_key_not_cataloged:%', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key ~* '(secret|password|private[_-]?key|refresh[_-]?token|client[_-]?secret|api[_-]?key|access[_-]?token)' THEN
      RAISE EXCEPTION 'configuration_secret_key_prohibited:%', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key = ANY(v_boolean_keys) AND jsonb_typeof(v_value) <> 'boolean' THEN
      RAISE EXCEPTION 'configuration_boolean_required:%', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key = ANY(v_array_keys) AND jsonb_typeof(v_value) <> 'array' THEN
      RAISE EXCEPTION 'configuration_array_required:%', v_key USING ERRCODE = '22023';
    END IF;
    IF v_key = ANY(v_color_keys)
       AND (jsonb_typeof(v_value) <> 'string' OR trim(both '"' from v_value::text) !~ '^#[0-9A-Fa-f]{6}$') THEN
      RAISE EXCEPTION 'configuration_invalid_color:%', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF _snapshot ? 'founded_year' AND _snapshot->'founded_year' <> 'null'::jsonb AND (
    jsonb_typeof(_snapshot->'founded_year') <> 'number'
    OR (_snapshot->>'founded_year')::integer NOT BETWEEN 1800 AND 2200
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_founded_year' USING ERRCODE = '22023';
  END IF;
  IF _snapshot ? 'items_per_page' AND (
    jsonb_typeof(_snapshot->'items_per_page') <> 'number'
    OR (_snapshot->>'items_per_page')::integer NOT BETWEEN 1 AND 100
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_items_per_page' USING ERRCODE = '22023';
  END IF;
  IF _snapshot ? 'latitude' AND _snapshot->'latitude' <> 'null'::jsonb AND (
    jsonb_typeof(_snapshot->'latitude') <> 'number'
    OR (_snapshot->>'latitude')::numeric NOT BETWEEN -90 AND 90
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_latitude' USING ERRCODE = '22023';
  END IF;
  IF _snapshot ? 'longitude' AND _snapshot->'longitude' <> 'null'::jsonb AND (
    jsonb_typeof(_snapshot->'longitude') <> 'number'
    OR (_snapshot->>'longitude')::numeric NOT BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_longitude' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(_snapshot->>'domain_activation_state', 'pending_DCA01') <> 'pending_DCA01'
     OR COALESCE(_snapshot->>'cloudflare_mode', 'HYBRID_pending_DCA01') <> 'HYBRID_pending_DCA01'
     OR COALESCE(_snapshot->>'billing_activation_state', 'pending_BCA01') <> 'pending_BCA01'
     OR COALESCE(_snapshot->>'final_visual_refinement', 'pending_PRM3') <> 'pending_PRM3' THEN
    RAISE EXCEPTION 'configuration_future_gate_value_invalid' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT unnest(v_media_keys)
  LOOP
    IF _snapshot ? v_key AND _snapshot->v_key <> 'null'::jsonb THEN
      IF jsonb_typeof(_snapshot->v_key) <> 'string'
         OR (_snapshot->>v_key) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'configuration_invalid_media_id:%', v_key USING ERRCODE = '22023';
      END IF;
      v_media_id := (_snapshot->>v_key)::uuid;
      IF NOT EXISTS (
        SELECT 1 FROM public.media_library ml
        WHERE ml.id = v_media_id AND ml.tenant_id = _tenant_id
      ) THEN
        RAISE EXCEPTION 'configuration_media_cross_tenant_or_missing:%', v_key USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;

  IF COALESCE(_snapshot->>'ga4_measurement_id', '') <> ''
     AND _snapshot->>'ga4_measurement_id' !~ '^G-[A-Z0-9]{4,20}$' THEN
    RAISE EXCEPTION 'configuration_invalid_analytics_id:ga4_measurement_id' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(_snapshot->>'google_tag_manager_container_id', '') <> ''
     AND _snapshot->>'google_tag_manager_container_id' !~ '^GTM-[A-Z0-9]{4,20}$' THEN
    RAISE EXCEPTION 'configuration_invalid_analytics_id:google_tag_manager_container_id' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each_text(_snapshot) e
    WHERE e.key = ANY(ARRAY['instagram','facebook','linkedin','youtube','tiktok','x_twitter','pinterest'])
      AND e.value <> ''
      AND e.value !~ '^https://'
  ) THEN
    RAISE EXCEPTION 'configuration_social_url_requires_https' USING ERRCODE = '22023';
  END IF;
END;
$fn$;

CREATE TEMP TABLE pr_m2_legacy_settings (
  tenant_id uuid PRIMARY KEY,
  settings jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO pr_m2_legacy_settings (tenant_id, settings)
SELECT
  t.id,
  COALESCE(
    jsonb_object_agg(ss.key, ss.value) FILTER (WHERE ss.key IS NOT NULL),
    '{}'::jsonb
  )
FROM public.tenants t
JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = t.id
LEFT JOIN public.site_settings ss ON ss.tenant_id = t.id
GROUP BY t.id;

CREATE TEMP TABLE pr_m2_legacy_menu (
  tenant_id uuid PRIMARY KEY,
  menu_items jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO pr_m2_legacy_menu (tenant_id, menu_items)
SELECT
  t.id,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', mi.id,
        'location', mi.location,
        'label', mi.label,
        'url', mi.url,
        'order', mi.ordem,
        'visible', mi.visivel,
        'target', mi.target,
        'type', mi.tipo,
        'parent_id', mi.parent_id
      ) ORDER BY mi.location, mi.ordem, mi.id
    ) FILTER (WHERE mi.id IS NOT NULL),
    '[]'::jsonb
  )
FROM public.tenants t
JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = t.id
LEFT JOIN public.website_menu_items mi ON mi.tenant_id = t.id
GROUP BY t.id;

DO $block$
BEGIN
  IF EXISTS (
    WITH paths AS (
      SELECT ls.tenant_id, p.config_key, p.legacy_path
      FROM pr_m2_legacy_settings ls
      CROSS JOIN LATERAL (
        VALUES
          ('primary_logo', NULLIF(ls.settings->'branding'->>'logo_path', '')),
          ('secondary_logo', NULLIF(ls.settings->'branding_v2'->>'logo_mobile_path', '')),
          ('favicon', NULLIF(ls.settings->'branding'->>'favicon_path', '')),
          ('default_og_image', NULLIF(ls.settings->'seo_global'->>'default_og_image_path', ''))
      ) AS p(config_key, legacy_path)
      WHERE p.legacy_path IS NOT NULL
    )
    SELECT 1
    FROM paths p
    WHERE (
      SELECT count(*)
      FROM public.media_library ml
      WHERE ml.tenant_id = p.tenant_id
        AND p.legacy_path IN (ml.arquivo, ml.arquivo_medium, ml.arquivo_thumbnail)
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'configuration_legacy_media_ambiguous_or_missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pr_m2_legacy_settings ls
    WHERE (
      NULLIF(ls.settings->'branding'->>'logo_url', '') IS NOT NULL
      AND NULLIF(ls.settings->'branding'->>'logo_path', '') IS NULL
    ) OR (
      NULLIF(ls.settings->'branding_v2'->>'logo_mobile_url', '') IS NOT NULL
      AND NULLIF(ls.settings->'branding_v2'->>'logo_mobile_path', '') IS NULL
    ) OR (
      NULLIF(ls.settings->'branding'->>'favicon_url', '') IS NOT NULL
      AND NULLIF(ls.settings->'branding'->>'favicon_path', '') IS NULL
    ) OR (
      NULLIF(ls.settings->'seo_global'->>'default_og_image_url', '') IS NOT NULL
      AND NULLIF(ls.settings->'seo_global'->>'default_og_image_path', '') IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'configuration_legacy_signed_url_without_media_authority';
  END IF;
END;
$block$;

CREATE TEMP TABLE pr_m2_configuration_media_map (
  tenant_id uuid NOT NULL,
  config_key text NOT NULL,
  legacy_path text NOT NULL,
  media_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, config_key)
) ON COMMIT DROP;

-- Cardinality was proven to be exactly one above; select that exact row directly.
INSERT INTO pr_m2_configuration_media_map (tenant_id, config_key, legacy_path, media_id)
SELECT
  ls.tenant_id,
  p.config_key,
  p.legacy_path,
  ml.id
FROM pr_m2_legacy_settings ls
CROSS JOIN LATERAL (
  VALUES
    ('primary_logo', NULLIF(ls.settings->'branding'->>'logo_path', '')),
    ('secondary_logo', NULLIF(ls.settings->'branding_v2'->>'logo_mobile_path', '')),
    ('favicon', NULLIF(ls.settings->'branding'->>'favicon_path', '')),
    ('default_og_image', NULLIF(ls.settings->'seo_global'->>'default_og_image_path', ''))
) AS p(config_key, legacy_path)
JOIN public.media_library ml
  ON ml.tenant_id = ls.tenant_id
 AND p.legacy_path IN (ml.arquivo, ml.arquivo_medium, ml.arquivo_thumbnail)
WHERE p.legacy_path IS NOT NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pr_m2_legacy_settings ls
    CROSS JOIN LATERAL (
      VALUES
        (NULLIF(ls.settings->'branding_v2'->>'color_primary', '')),
        (NULLIF(ls.settings->'branding_v2'->>'color_secondary', '')),
        (NULLIF(ls.settings->'branding_v2'->>'color_accent', '')),
        (NULLIF(ls.settings->'branding_v2'->>'color_button', '')),
        (NULLIF(ls.settings->'branding_v2'->>'color_link', ''))
    ) AS c(value)
    WHERE c.value IS NOT NULL AND c.value !~ '^#[0-9A-Fa-f]{6}$'
  ) THEN
    RAISE EXCEPTION 'configuration_legacy_color_invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pr_m2_legacy_settings ls
    CROSS JOIN LATERAL (
      VALUES
        (NULLIF(ls.settings->'branding_v2'->>'font_primary', '')),
        (NULLIF(ls.settings->'branding_v2'->>'font_secondary', ''))
    ) AS f(value)
    WHERE f.value IS NOT NULL
      AND f.value <> ALL (ARRAY[
        'Inter','Poppins','Montserrat','Playfair Display','Cormorant Garamond',
        'Roboto','Lato','Merriweather','Source Sans 3','DM Sans'
      ])
  ) THEN
    RAISE EXCEPTION 'configuration_legacy_font_invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pr_m2_legacy_settings ls
    WHERE NULLIF(ls.settings->'empresa'->>'fundacao', '') IS NOT NULL
      AND ls.settings->'empresa'->>'fundacao' !~ '^[0-9]{4}$'
  ) THEN
    RAISE EXCEPTION 'configuration_legacy_founded_year_invalid';
  END IF;
END;
$block$;

CREATE TEMP TABLE pr_m2_configuration_snapshots (
  tenant_id uuid PRIMARY KEY,
  snapshot jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO pr_m2_configuration_snapshots (tenant_id, snapshot)
SELECT
  t.id,
  jsonb_strip_nulls(jsonb_build_object(
    'trade_name', COALESCE(NULLIF(ls.settings->'empresa'->>'nome_fantasia', ''), NULLIF(ls.settings->'branding'->>'site_name', '')),
    'legal_name', NULLIF(ls.settings->'empresa'->>'razao_social', ''),
    'short_name', NULLIF(ls.settings->'branding'->>'site_name', ''),
    'tagline', NULLIF(ls.settings->'empresa'->>'slogan', ''),
    'institutional_description', NULLIF(ls.settings->'empresa'->>'sobre_curto', ''),
    'creci_or_registration', COALESCE(NULLIF(ls.settings->'empresa'->>'creci', ''), NULLIF(ls.settings->'contato'->>'creci', '')),
    'tax_document_display', NULLIF(ls.settings->'empresa'->>'cnpj', ''),
    'technical_responsible', NULLIF(ls.settings->'empresa'->>'responsavel_tecnico', ''),
    'founded_year', CASE
      WHEN NULLIF(ls.settings->'empresa'->>'fundacao', '') IS NULL THEN NULL
      ELSE to_jsonb((ls.settings->'empresa'->>'fundacao')::integer)
    END,
    'primary_logo', (SELECT to_jsonb(mm.media_id) FROM pr_m2_configuration_media_map mm WHERE mm.tenant_id = t.id AND mm.config_key = 'primary_logo'),
    'secondary_logo', (SELECT to_jsonb(mm.media_id) FROM pr_m2_configuration_media_map mm WHERE mm.tenant_id = t.id AND mm.config_key = 'secondary_logo'),
    'favicon', (SELECT to_jsonb(mm.media_id) FROM pr_m2_configuration_media_map mm WHERE mm.tenant_id = t.id AND mm.config_key = 'favicon'),
    'default_og_image', (SELECT to_jsonb(mm.media_id) FROM pr_m2_configuration_media_map mm WHERE mm.tenant_id = t.id AND mm.config_key = 'default_og_image'),
    'primary_color', NULLIF(ls.settings->'branding_v2'->>'color_primary', ''),
    'secondary_color', NULLIF(ls.settings->'branding_v2'->>'color_secondary', ''),
    'accent_color', NULLIF(ls.settings->'branding_v2'->>'color_accent', ''),
    'button_color', NULLIF(ls.settings->'branding_v2'->>'color_button', ''),
    'link_color', NULLIF(ls.settings->'branding_v2'->>'color_link', ''),
    'body_font', NULLIF(ls.settings->'branding_v2'->>'font_primary', ''),
    'heading_font', NULLIF(ls.settings->'branding_v2'->>'font_secondary', ''),
    'primary_email', NULLIF(ls.settings->'contato'->>'email', ''),
    'primary_phone', NULLIF(ls.settings->'contato'->>'telefone', ''),
    'whatsapp', NULLIF(ls.settings->'contato'->>'whatsapp', ''),
    'address', NULLIF(ls.settings->'contato'->>'endereco', ''),
    'location_description', NULLIF(ls.settings->'contato'->>'localizacao', ''),
    'instagram', NULLIF(ls.settings->'contato'->>'instagram', ''),
    'facebook', NULLIF(ls.settings->'contato'->>'facebook', ''),
    'linkedin', NULLIF(ls.settings->'contato'->>'linkedin', ''),
    'default_meta_title', NULLIF(ls.settings->'seo_global'->>'default_title', ''),
    'default_meta_description', NULLIF(ls.settings->'seo_global'->>'default_description', ''),
    'seo_keywords', NULLIF(ls.settings->'seo_global'->>'keywords', ''),
    'x_twitter_handle', NULLIF(ls.settings->'seo_global'->>'twitter_handle', ''),
    'footer_copyright', NULLIF(ls.settings->'footer'->>'copyright', ''),
    'show_social_links', COALESCE(ls.settings->'footer'->'mostrar_redes', 'true'::jsonb),
    'legal_notice_text', NULLIF(ls.settings->'footer'->>'texto_legal', ''),
    'footer_columns', jsonb_build_array(
      jsonb_build_object(
        'title', COALESCE(ls.settings->'footer'->>'coluna1_titulo', ''),
        'links', COALESCE(ls.settings->'footer'->'coluna1_links', '[]'::jsonb)
      ),
      jsonb_build_object(
        'title', COALESCE(ls.settings->'footer'->>'coluna2_titulo', ''),
        'links', COALESCE(ls.settings->'footer'->'coluna2_links', '[]'::jsonb)
      )
    ),
    'business_hours', CASE
      WHEN jsonb_typeof(ls.settings->'pagina_contato'->'horario_atendimento') = 'array'
        THEN ls.settings->'pagina_contato'->'horario_atendimento'
      ELSE '[]'::jsonb
    END,
    'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', ''),
    'menu_locations', jsonb_build_array('header', 'footer'),
    'menu_items', lm.menu_items,
    'home_hero', COALESCE(ls.settings->'home_hero', '{}'::jsonb),
    'home_secoes', COALESCE(ls.settings->'home_secoes', '{}'::jsonb),
    'home_diferenciais', COALESCE(ls.settings->'home_diferenciais', '{}'::jsonb),
    'home_depoimentos', COALESCE(ls.settings->'home_depoimentos', '{}'::jsonb),
    'pagina_sobre', COALESCE(ls.settings->'pagina_sobre', '{}'::jsonb),
    'pagina_contato', COALESCE(ls.settings->'pagina_contato', '{}'::jsonb),
    'pagina_anuncie', COALESCE(ls.settings->'pagina_anuncie', '{}'::jsonb),
    'pagina_lancamentos', COALESCE(ls.settings->'pagina_lancamentos', '{}'::jsonb),
    'domain_activation_state', 'pending_DCA01',
    'cloudflare_mode', 'HYBRID_pending_DCA01',
    'billing_activation_state', 'pending_BCA01',
    'final_visual_refinement', 'pending_PRM3',
    'legacy_settings_archive', ls.settings
  ))
FROM public.tenants t
JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = t.id
JOIN pr_m2_legacy_settings ls ON ls.tenant_id = t.id
JOIN pr_m2_legacy_menu lm ON lm.tenant_id = t.id;

DO $block$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN SELECT tenant_id, snapshot FROM pr_m2_configuration_snapshots
  LOOP
    PERFORM public.validate_tenant_configuration_snapshot(v_row.tenant_id, v_row.snapshot);
  END LOOP;
END;
$block$;

INSERT INTO public.site_settings_versions (
  tenant_id, key, value, status, revision, based_on_revision,
  content_hash, notes, created_by, published_at
)
SELECT
  s.tenant_id,
  'configuration',
  s.snapshot,
  'published',
  1,
  0,
  encode(digest(s.snapshot::text, 'sha256'), 'hex'),
  'PR-M2 canonical configuration backfill',
  NULL,
  now()
FROM pr_m2_configuration_snapshots s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.site_settings_versions v
  WHERE v.tenant_id = s.tenant_id AND v.key = 'configuration'
);

CREATE OR REPLACE FUNCTION public.assert_tenant_configuration_authority(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _operation text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_module text;
  v_action public.rbac_action;
BEGIN
  IF _operation = 'publish' THEN
    v_module := 'cms.versoes';
    v_action := 'publicar'::public.rbac_action;
  ELSIF _operation = 'edit' THEN
    v_module := 'cms.configuracoes';
    v_action := 'editar'::public.rbac_action;
  ELSE
    RAISE EXCEPTION 'configuration_operation_invalid' USING ERRCODE = '22023';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin, v_module, v_action
  );
  IF COALESCE((v_decision->>'allowed')::boolean, false) IS NOT TRUE
     OR v_decision->>'scope' <> 'global' THEN
    RAISE EXCEPTION 'tenant_configuration_authority_denied' USING ERRCODE = '42501';
  END IF;
  RETURN v_decision->>'source';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_tenant_configuration_draft(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _snapshot jsonb,
  _expected_revision bigint,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_current_revision bigint := 0;
  v_id uuid;
  v_hash text;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.assert_tenant_configuration_authority(_actor_user_id, _tenant_id, _tenant_origin, 'edit');
  PERFORM public.validate_tenant_configuration_snapshot(_tenant_id, _snapshot);

  SELECT revision INTO v_current_revision
  FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'published';
  v_current_revision := COALESCE(v_current_revision, 0);
  IF _expected_revision IS DISTINCT FROM v_current_revision THEN
    RAISE EXCEPTION 'configuration_revision_conflict' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'draft';

  v_hash := encode(digest(_snapshot::text, 'sha256'), 'hex');
  INSERT INTO public.site_settings_versions (
    tenant_id, key, value, status, revision, based_on_revision,
    content_hash, notes, created_by, published_at
  ) VALUES (
    _tenant_id, 'configuration', _snapshot, 'draft', v_current_revision + 1,
    v_current_revision, v_hash, NULLIF(trim(_notes), ''), _actor_user_id, NULL
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (
    _tenant_id, _actor_user_id, 'tenant_configuration.draft.save',
    'site_settings_versions', v_id::text,
    jsonb_build_object('published_revision', v_current_revision),
    jsonb_build_object('draft_revision', v_current_revision + 1, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'revision', v_current_revision + 1,
    'based_on_revision', v_current_revision,
    'status', 'draft',
    'content_hash', v_hash
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.discard_tenant_configuration_draft(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_current_revision bigint := 0;
  v_deleted_id uuid;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.assert_tenant_configuration_authority(_actor_user_id, _tenant_id, _tenant_origin, 'edit');

  SELECT revision INTO v_current_revision
  FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'published';
  v_current_revision := COALESCE(v_current_revision, 0);
  IF _expected_revision IS DISTINCT FROM v_current_revision THEN
    RAISE EXCEPTION 'configuration_revision_conflict' USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'draft'
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NOT NULL THEN
    INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
    VALUES (
      _tenant_id, _actor_user_id, 'tenant_configuration.draft.discard',
      'site_settings_versions', v_deleted_id::text,
      jsonb_build_object('published_revision', v_current_revision), NULL
    );
  END IF;

  RETURN jsonb_build_object('discarded', v_deleted_id IS NOT NULL);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.publish_tenant_configuration(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_current_revision bigint := 0;
  v_current_id uuid;
  v_draft record;
  v_published_at timestamptz := now();
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.assert_tenant_configuration_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publish');

  SELECT id, revision INTO v_current_id, v_current_revision
  FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'published';
  v_current_revision := COALESCE(v_current_revision, 0);
  IF _expected_revision IS DISTINCT FROM v_current_revision THEN
    RAISE EXCEPTION 'configuration_revision_conflict' USING ERRCODE = '40001';
  END IF;

  SELECT id, revision, based_on_revision, value, content_hash
  INTO v_draft
  FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'configuration_draft_not_found' USING ERRCODE = '22023'; END IF;
  IF v_draft.based_on_revision IS DISTINCT FROM v_current_revision
     OR v_draft.revision IS DISTINCT FROM v_current_revision + 1 THEN
    RAISE EXCEPTION 'configuration_revision_conflict' USING ERRCODE = '40001';
  END IF;
  PERFORM public.validate_tenant_configuration_snapshot(_tenant_id, v_draft.value);

  IF v_current_id IS NOT NULL THEN
    UPDATE public.site_settings_versions
    SET status = 'archived', updated_at = v_published_at
    WHERE id = v_current_id AND tenant_id = _tenant_id;
  END IF;

  UPDATE public.site_settings_versions
  SET status = 'published', published_at = v_published_at, updated_at = v_published_at
  WHERE id = v_draft.id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (
    _tenant_id, _actor_user_id, 'tenant_configuration.publish',
    'site_settings_versions', v_draft.id::text,
    jsonb_build_object('published_revision', v_current_revision),
    jsonb_build_object('published_revision', v_draft.revision, 'content_hash', v_draft.content_hash)
  );

  RETURN jsonb_build_object(
    'id', v_draft.id,
    'revision', v_draft.revision,
    'status', 'published',
    'published_at', v_published_at,
    'content_hash', v_draft.content_hash
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.rollback_tenant_configuration(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _source_version_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_current_revision bigint := 0;
  v_source record;
  v_id uuid;
  v_hash text;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.assert_tenant_configuration_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publish');

  SELECT revision INTO v_current_revision
  FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'published';
  v_current_revision := COALESCE(v_current_revision, 0);
  IF _expected_revision IS DISTINCT FROM v_current_revision THEN
    RAISE EXCEPTION 'configuration_revision_conflict' USING ERRCODE = '40001';
  END IF;

  SELECT id, revision, value, content_hash
  INTO v_source
  FROM public.site_settings_versions
  WHERE id = _source_version_id
    AND tenant_id = _tenant_id
    AND key = 'configuration'
    AND status IN ('published', 'archived');
  IF NOT FOUND THEN RAISE EXCEPTION 'configuration_version_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.validate_tenant_configuration_snapshot(_tenant_id, v_source.value);

  DELETE FROM public.site_settings_versions
  WHERE tenant_id = _tenant_id AND key = 'configuration' AND status = 'draft';

  v_hash := encode(digest(v_source.value::text, 'sha256'), 'hex');
  INSERT INTO public.site_settings_versions (
    tenant_id, key, value, status, revision, based_on_revision,
    content_hash, notes, created_by, published_at
  ) VALUES (
    _tenant_id, 'configuration', v_source.value, 'draft', v_current_revision + 1,
    v_current_revision, v_hash,
    format('Rollback draft from revision %s', v_source.revision),
    _actor_user_id, NULL
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (
    _tenant_id, _actor_user_id, 'tenant_configuration.rollback.prepare',
    'site_settings_versions', v_id::text,
    jsonb_build_object('published_revision', v_current_revision, 'source_revision', v_source.revision),
    jsonb_build_object('draft_revision', v_current_revision + 1, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'revision', v_current_revision + 1,
    'based_on_revision', v_current_revision,
    'status', 'draft',
    'rollback_source_revision', v_source.revision
  );
END;
$fn$;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_menu_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.site_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.site_settings_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.website_menu_items FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.site_settings TO service_role;
GRANT ALL ON TABLE public.site_settings_versions TO service_role;
GRANT ALL ON TABLE public.website_menu_items TO service_role;

REVOKE ALL ON FUNCTION public.validate_tenant_configuration_snapshot(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_tenant_configuration_authority(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_configuration_draft(uuid, uuid, text, jsonb, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.discard_tenant_configuration_draft(uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tenant_configuration(uuid, uuid, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_tenant_configuration(uuid, uuid, text, uuid, bigint) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.validate_tenant_configuration_snapshot(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_tenant_configuration_authority(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_configuration_draft(uuid, uuid, text, jsonb, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.discard_tenant_configuration_draft(uuid, uuid, text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tenant_configuration(uuid, uuid, text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_tenant_configuration(uuid, uuid, text, uuid, bigint) TO service_role;

COMMIT;
