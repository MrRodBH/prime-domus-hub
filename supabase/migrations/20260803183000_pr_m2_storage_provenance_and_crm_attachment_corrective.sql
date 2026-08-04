BEGIN;
ALTER TABLE public.tenant_upload_targets ADD COLUMN IF NOT EXISTS tenant_origin text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_corretores_tenant_id_id ON public.corretores(tenant_id,id);
CREATE OR REPLACE FUNCTION public.prm2_lock_upload_target(_actor uuid,_tenant uuid,_origin text,_id uuid,_domain text,_entity uuid) RETURNS public.tenant_upload_targets LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tenant_upload_targets%ROWTYPE;
BEGIN
 IF _actor IS NULL OR _tenant IS NULL OR _id IS NULL OR _origin NOT IN('impersonation','selection','single-membership') THEN RAISE EXCEPTION 'upload_target_invalid_context'; END IF;
 SELECT * INTO t FROM public.tenant_upload_targets WHERE tenant_id=_tenant AND id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'upload_target_not_found'; END IF;
 IF t.actor_user_id<>_actor THEN RAISE EXCEPTION 'upload_target_actor_mismatch'; END IF;
 IF t.tenant_origin IS DISTINCT FROM _origin THEN RAISE EXCEPTION 'upload_target_origin_mismatch'; END IF;
 IF t.domain<>_domain OR t.entity_id IS DISTINCT FROM _entity THEN RAISE EXCEPTION 'upload_target_contract_mismatch'; END IF;
 IF t.status<>'pending' THEN RAISE EXCEPTION 'upload_target_not_pending'; END IF;
 IF t.expires_at<=now() THEN RAISE EXCEPTION 'upload_target_expired'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=t.bucket AND o.name=t.path) THEN RAISE EXCEPTION 'upload_target_object_not_found'; END IF;
 RETURN t;
END$$;
CREATE OR REPLACE FUNCTION public.register_tenant_upload_target(_actor_user_id uuid,_tenant_id uuid,_tenant_origin text,_domain text,_entity_id uuid,_bucket text,_path text,_storage_file_name text,_mime_type text,_size bigint,_expires_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d jsonb; i uuid; p text;
BEGIN
 IF _tenant_origin NOT IN('impersonation','selection','single-membership') OR _expires_at<=now() OR _expires_at>now()+interval '30 minutes' THEN RAISE EXCEPTION 'upload_target_invalid_context'; END IF;
 IF _domain NOT IN('imoveis','lancamento-capa','lancamento-galeria','lancamento-pdf','blog-cover','blog-inline','cms-page','corretor-foto','media','crm-attachment') THEN RAISE EXCEPTION 'upload_target_invalid_domain'; END IF;
 d:=public.resolve_tenant_permission(_actor_user_id,_tenant_id,_tenant_origin,CASE WHEN _domain='crm-attachment' THEN 'crm' WHEN _domain='corretor-foto' THEN 'access_control' ELSE 'cms.midias' END,CASE WHEN _domain='corretor-foto' THEN 'gerenciar'::public.rbac_action ELSE 'criar'::public.rbac_action END);
 IF d IS NULL OR d->>'allowed'<>'true' THEN RAISE EXCEPTION 'upload_target_permission_denied'; END IF;
 IF _domain='corretor-foto' THEN IF _bucket<>'site' OR _entity_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.corretores WHERE tenant_id=_tenant_id AND id=_entity_id) THEN RAISE EXCEPTION 'upload_target_broker_contract_invalid'; END IF; p:=_tenant_id||'/corretores/'||_entity_id||'/';
 ELSIF _domain='crm-attachment' THEN IF _bucket<>'site' OR _entity_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.leads WHERE tenant_id=_tenant_id AND id=_entity_id) OR NOT public.crm_scope_allows_lead(_tenant_id,_actor_user_id,d->>'scope',_entity_id) THEN RAISE EXCEPTION 'upload_target_crm_attachment_contract_invalid'; END IF; p:=_tenant_id||'/crm/'||_entity_id||'/';
 ELSIF _domain='media' THEN IF _bucket<>'site' OR _entity_id IS NOT NULL THEN RAISE EXCEPTION 'upload_target_media_contract_invalid'; END IF; p:=_tenant_id||'/media/';
 ELSE p:=_tenant_id||'/'; END IF;
 IF left(_path,length(p))<>p OR _path LIKE '%..%' OR reverse(split_part(reverse(_path),'/',1))<>_storage_file_name THEN RAISE EXCEPTION 'upload_target_path_not_server_scoped'; END IF;
 INSERT INTO public.tenant_upload_targets(tenant_id,actor_user_id,tenant_origin,domain,entity_id,bucket,path,storage_file_name,mime_type,size,expires_at) VALUES(_tenant_id,_actor_user_id,_tenant_origin,_domain,_entity_id,_bucket,_path,_storage_file_name,_mime_type,_size,_expires_at) RETURNING id INTO i;
 RETURN jsonb_build_object('targetId',i,'tenantId',_tenant_id,'domain',_domain,'entityId',_entity_id,'bucket',_bucket,'path',_path,'storageFileName',_storage_file_name,'expiresAt',_expires_at,'status','pending');
END$$;
CREATE OR REPLACE FUNCTION public.consume_tenant_media_upload_target(_actor_user_id uuid,_tenant_id uuid,_tenant_origin text,_target_id uuid,_derivative_target_ids uuid[],_name text,_type text,_mime_type text,_size bigint,_width integer,_height integer,_tags text[],_description text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tenant_upload_targets%ROWTYPE; x uuid; a uuid[]:=ARRAY[_target_id]||coalesce(_derivative_target_ids,ARRAY[]::uuid[]); n int:=0; mid uuid; main text; med text; thumb text;
BEGIN
 IF cardinality(a)>3 OR cardinality(a)<>(SELECT count(DISTINCT q) FROM unnest(a) q) THEN RAISE EXCEPTION 'media_upload_target_duplicate'; END IF;
 FOREACH x IN ARRAY a LOOP n:=n+1;t:=public.prm2_lock_upload_target(_actor_user_id,_tenant_id,_tenant_origin,x,'media',NULL);IF t.bucket<>'site' OR left(t.path,length(_tenant_id||'/media/'))<>_tenant_id||'/media/' THEN RAISE EXCEPTION 'media_upload_target_mismatch';END IF;IF n=1 THEN main:=t.path;ELSIF n=2 THEN med:=t.path;ELSE thumb:=t.path;END IF;END LOOP;
 INSERT INTO public.media_library(tenant_id,nome,arquivo,arquivo_medium,arquivo_thumbnail,tipo,mime_type,tamanho,width,height,tags,descricao,created_by) VALUES(_tenant_id,_name,main,med,thumb,_type,_mime_type,_size,_width,_height,coalesce(_tags,ARRAY[]::text[]),_description,_actor_user_id) RETURNING id INTO mid;
 UPDATE public.tenant_upload_targets SET status='consumed',consumed_at=now(),updated_at=now() WHERE tenant_id=_tenant_id AND id=ANY(a) AND status='pending';IF NOT FOUND THEN RAISE EXCEPTION 'upload_target_concurrent_consumption';END IF;
 RETURN jsonb_build_object('id',mid,'tenant_id',_tenant_id,'arquivo',main,'arquivo_medium',med,'arquivo_thumbnail',thumb,'status','consumed');
END$$;
CREATE OR REPLACE FUNCTION public.consume_tenant_broker_photo_upload_target(_actor_user_id uuid,_tenant_id uuid,_tenant_origin text,_target_id uuid,_broker_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tenant_upload_targets%ROWTYPE; d jsonb;
BEGIN
 t:=public.prm2_lock_upload_target(_actor_user_id,_tenant_id,_tenant_origin,_target_id,'corretor-foto',_broker_id);IF t.bucket<>'site' OR left(t.path,length(_tenant_id||'/corretores/'||_broker_id||'/'))<>_tenant_id||'/corretores/'||_broker_id||'/' THEN RAISE EXCEPTION 'broker_photo_target_mismatch';END IF;
 d:=public.resolve_tenant_permission(_actor_user_id,_tenant_id,_tenant_origin,'access_control','gerenciar'::public.rbac_action);IF d IS NULL OR d->>'allowed'<>'true' OR d->>'scope'<>'global' THEN RAISE EXCEPTION 'broker_photo_permission_denied';END IF;
 UPDATE public.corretores SET foto_url=t.path WHERE tenant_id=_tenant_id AND id=_broker_id;IF NOT FOUND THEN RAISE EXCEPTION 'broker_not_found';END IF;
 UPDATE public.tenant_upload_targets SET status='consumed',consumed_at=now(),updated_at=now() WHERE tenant_id=_tenant_id AND id=t.id AND status='pending';IF NOT FOUND THEN RAISE EXCEPTION 'upload_target_concurrent_consumption';END IF;
 RETURN jsonb_build_object('brokerId',_broker_id,'path',t.path,'status','consumed');
END$$;
CREATE OR REPLACE FUNCTION public.consume_tenant_crm_attachment_upload_target(_actor_user_id uuid,_tenant_id uuid,_tenant_origin text,_target_id uuid,_lead_id uuid,_display_name text,_mime_type text,_size bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tenant_upload_targets%ROWTYPE; d jsonb; i uuid;
BEGIN
 t:=public.prm2_lock_upload_target(_actor_user_id,_tenant_id,_tenant_origin,_target_id,'crm-attachment',_lead_id);IF t.bucket<>'site' OR left(t.path,length(_tenant_id||'/crm/'||_lead_id||'/'))<>_tenant_id||'/crm/'||_lead_id||'/' THEN RAISE EXCEPTION 'crm_attachment_target_mismatch';END IF;
 d:=public.resolve_tenant_permission(_actor_user_id,_tenant_id,_tenant_origin,'crm','editar'::public.rbac_action);IF d IS NULL OR d->>'allowed'<>'true' OR NOT public.crm_scope_allows_lead(_tenant_id,_actor_user_id,d->>'scope',_lead_id) THEN RAISE EXCEPTION 'crm_scope_denied';END IF;
 IF t.mime_type IS NOT NULL AND t.mime_type IS DISTINCT FROM _mime_type OR t.size IS NOT NULL AND t.size IS DISTINCT FROM _size THEN RAISE EXCEPTION 'crm_attachment_metadata_mismatch';END IF;
 INSERT INTO public.crm_attachments(tenant_id,lead_id,upload_target_id,bucket,path,display_name,mime_type,size,created_by) VALUES(_tenant_id,_lead_id,t.id,t.bucket,t.path,_display_name,coalesce(_mime_type,t.mime_type),coalesce(_size,t.size),_actor_user_id) RETURNING id INTO i;
 UPDATE public.tenant_upload_targets SET status='consumed',consumed_at=now(),updated_at=now() WHERE tenant_id=_tenant_id AND id=t.id AND status='pending';IF NOT FOUND THEN RAISE EXCEPTION 'upload_target_concurrent_consumption';END IF;
 RETURN jsonb_build_object('id',i,'leadId',_lead_id,'displayName',_display_name,'mimeType',coalesce(_mime_type,t.mime_type),'size',coalesce(_size,t.size),'status','consumed');
END$$;
CREATE OR REPLACE FUNCTION public.delete_tenant_crm_attachment(_actor_user_id uuid,_tenant_id uuid,_tenant_origin text,_attachment_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.crm_attachments%ROWTYPE; d jsonb;
BEGIN
 SELECT * INTO a FROM public.crm_attachments WHERE tenant_id=_tenant_id AND id=_attachment_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'crm_attachment_not_found';END IF;
 d:=public.resolve_tenant_permission(_actor_user_id,_tenant_id,_tenant_origin,'crm','editar'::public.rbac_action);IF d IS NULL OR d->>'allowed'<>'true' OR NOT public.crm_scope_allows_lead(_tenant_id,_actor_user_id,d->>'scope',a.lead_id) THEN RAISE EXCEPTION 'crm_scope_denied';END IF;
 DELETE FROM public.crm_attachments WHERE tenant_id=_tenant_id AND id=_attachment_id;IF NOT FOUND THEN RAISE EXCEPTION 'crm_attachment_concurrent_delete';END IF;
 RETURN jsonb_build_object('id',_attachment_id,'leadId',a.lead_id,'bucket',a.bucket,'path',a.path,'deleted',true);
END$$;
REVOKE ALL ON FUNCTION public.prm2_lock_upload_target(uuid,uuid,text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.register_tenant_upload_target(uuid,uuid,text,text,uuid,text,text,text,text,bigint,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.consume_tenant_media_upload_target(uuid,uuid,text,uuid,uuid[],text,text,text,bigint,integer,integer,text[],text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.consume_tenant_broker_photo_upload_target(uuid,uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.consume_tenant_crm_attachment_upload_target(uuid,uuid,text,uuid,uuid,text,text,bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.delete_tenant_crm_attachment(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_tenant_upload_target(uuid,uuid,text,text,uuid,text,text,text,text,bigint,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tenant_media_upload_target(uuid,uuid,text,uuid,uuid[],text,text,text,bigint,integer,integer,text[],text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tenant_broker_photo_upload_target(uuid,uuid,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tenant_crm_attachment_upload_target(uuid,uuid,text,uuid,uuid,text,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_tenant_crm_attachment(uuid,uuid,text,uuid) TO service_role;
COMMIT;
