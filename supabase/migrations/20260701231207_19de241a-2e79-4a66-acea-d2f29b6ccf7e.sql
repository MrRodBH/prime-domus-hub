-- Helper: retorna true se o usuário tem determinada action em determinado módulo CMS
CREATE OR REPLACE FUNCTION public.has_cms_permission(_user_id uuid, _module_codigo text, _action rbac_action)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_profiles up
      JOIN public.rbac_permissions p ON p.profile_id = up.profile_id
      JOIN public.rbac_modules m ON m.id = p.module_id
     WHERE up.user_id = _user_id
       AND m.codigo = _module_codigo
       AND p.action = _action
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_cms_permission(uuid, text, rbac_action) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_cms_permission(uuid, text, rbac_action) TO authenticated, service_role;

-- Seed: Admin recebe TODAS as actions em todos os módulos CMS novos
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT prof.id, m.id, a.action, 'global'::rbac_scope
  FROM public.rbac_profiles prof
 CROSS JOIN public.rbac_modules m
 CROSS JOIN (VALUES
    ('visualizar'::rbac_action),
    ('criar'::rbac_action),
    ('editar'::rbac_action),
    ('excluir'::rbac_action),
    ('publicar'::rbac_action)
 ) AS a(action)
 WHERE prof.codigo = 'admin'
   AND m.codigo IN ('cms.paginas','cms.campanhas','cms.formularios','cms.midias','cms.menu','cms.branding','cms.versoes','cms.configuracoes')
ON CONFLICT DO NOTHING;

-- Seed: Gerente recebe visualizar/criar/editar/publicar (sem excluir)
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT prof.id, m.id, a.action, 'global'::rbac_scope
  FROM public.rbac_profiles prof
 CROSS JOIN public.rbac_modules m
 CROSS JOIN (VALUES
    ('visualizar'::rbac_action),
    ('criar'::rbac_action),
    ('editar'::rbac_action),
    ('publicar'::rbac_action)
 ) AS a(action)
 WHERE prof.codigo = 'gerente'
   AND m.codigo IN ('cms.paginas','cms.campanhas','cms.formularios','cms.midias','cms.menu','cms.branding','cms.versoes','cms.configuracoes')
ON CONFLICT DO NOTHING;

-- Adiciona também 'publicar' nos módulos legados (site, configuracoes) para admin/gerente
INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
SELECT prof.id, m.id, 'publicar'::rbac_action, 'global'::rbac_scope
  FROM public.rbac_profiles prof
 CROSS JOIN public.rbac_modules m
 WHERE prof.codigo IN ('admin','gerente')
   AND m.codigo IN ('site','configuracoes')
ON CONFLICT DO NOTHING;