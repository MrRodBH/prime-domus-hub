REVOKE SELECT ON public.corretores FROM anon;
GRANT SELECT (id, user_id, nome, sobrenome, slug, creci, cargo, bio, foto_url, ativo, ordem, created_at, updated_at) ON public.corretores TO anon;