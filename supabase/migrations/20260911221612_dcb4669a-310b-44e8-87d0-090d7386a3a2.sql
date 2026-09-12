CREATE OR REPLACE FUNCTION public.validate_tenant_configuration_snapshot(_tenant_id uuid, _snapshot jsonb)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_key text;
  v_value jsonb;
  v_media_id uuid;
  v_element jsonb;
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
    'pagina_contato','pagina_anuncie','pagina_lancamentos','legacy_settings_archive',
    'website_setup_status','website_setup_step','website_theme','logo_alignment',
    'website_selected_pages','website_preview_viewport'
  ];
  v_boolean_keys constant text[] := ARRAY[
    'robots_index','robots_follow','sitemap_visibility','cookie_notice_enabled',
    'cookie_preferences_enabled','show_prices','show_exact_address','show_broker_contact',
    'show_whatsapp_cta','show_financing_cta','show_similar_properties','show_featured_properties',
    'lead_consent_required','sticky_header','show_search','show_social_links','show_contact_cta'
  ];
  v_array_keys constant text[] := ARRAY[
    'service_regions','languages','lead_form_required_fields','menu_locations',
    'business_hours','menu_items','footer_columns','legal_links',
    'website_selected_pages'
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
  v_website_pages constant text[] := ARRAY['inicio','imoveis','lancamentos','sobre','contato'];
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

  IF _snapshot ? 'website_setup_status' AND (
    jsonb_typeof(_snapshot->'website_setup_status') <> 'string'
    OR (_snapshot->>'website_setup_status') NOT IN ('not_started','deferred','in_progress','draft_ready')
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_website_setup_status' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'website_setup_step' AND (
    jsonb_typeof(_snapshot->'website_setup_step') <> 'number'
    OR (_snapshot->'website_setup_step')::text ~ '[.eE]'
    OR (_snapshot->>'website_setup_step')::numeric NOT BETWEEN 0 AND 6
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_website_setup_step' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'website_theme' AND (
    jsonb_typeof(_snapshot->'website_theme') <> 'string'
    OR (_snapshot->>'website_theme') NOT IN ('prime_classic','prime_minimal','prime_editorial')
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_website_theme' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'logo_alignment' AND (
    jsonb_typeof(_snapshot->'logo_alignment') <> 'string'
    OR (_snapshot->>'logo_alignment') NOT IN ('left','center','right')
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_logo_alignment' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'website_preview_viewport' AND (
    jsonb_typeof(_snapshot->'website_preview_viewport') <> 'string'
    OR (_snapshot->>'website_preview_viewport') NOT IN ('desktop','tablet','mobile')
  ) THEN
    RAISE EXCEPTION 'configuration_invalid_website_preview_viewport' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'website_selected_pages' THEN
    IF jsonb_typeof(_snapshot->'website_selected_pages') <> 'array' THEN
      RAISE EXCEPTION 'configuration_array_required:website_selected_pages' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(_snapshot->'website_selected_pages') > 5 THEN
      RAISE EXCEPTION 'configuration_invalid_website_selected_pages' USING ERRCODE = '22023';
    END IF;
    FOR v_element IN SELECT e FROM jsonb_array_elements(_snapshot->'website_selected_pages') e
    LOOP
      IF jsonb_typeof(v_element) <> 'string'
         OR NOT ((v_element #>> '{}') = ANY(v_website_pages)) THEN
        RAISE EXCEPTION 'configuration_invalid_website_selected_pages' USING ERRCODE = '22023';
      END IF;
    END LOOP;
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
$function$;
