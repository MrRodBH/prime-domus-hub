
DROP POLICY IF EXISTS "audit_log insert auth" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated, anon;

REVOKE SELECT ON public.imoveis FROM anon;
GRANT SELECT (
  id, codigo, titulo, slug, descricao, finalidade, tipo, status,
  preco, preco_sob_consulta, condominio, iptu,
  area_total, area_util, quartos, suites, banheiros, vagas,
  bairro_id, corretor_id, imagem_capa, destaque, exclusivo, badge,
  caracteristicas, views, publicado_em, created_at, updated_at,
  video_url, tour_url, mostrar_rua, mostrar_endereco_completo,
  cidade, estado, created_by
) ON public.imoveis TO anon;

DROP POLICY IF EXISTS "lancamentos_anon_read" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, public.rbac_action) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_team_ids(uuid) FROM PUBLIC, anon;
