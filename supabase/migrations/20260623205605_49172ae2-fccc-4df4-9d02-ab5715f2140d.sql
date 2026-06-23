-- 1) CORRETORES: remover leitura pública para 'authenticated' (mantém só 'anon')
DROP POLICY IF EXISTS "corretores public read" ON public.corretores;

CREATE POLICY "corretores public read anon"
  ON public.corretores
  FOR SELECT
  TO anon
  USING (ativo = true);

-- (admin, secretaria e self update já cobrem usuários autenticados privilegiados)

-- Garantia adicional: revogar colunas sensíveis de anon, caso ainda estejam acessíveis
REVOKE SELECT (email, telefone, whatsapp) ON public.corretores FROM anon;

-- 2) IMÓVEIS: revogar do papel anon o acesso direto a campos de localização precisa.
-- A página pública continua exibindo esses dados via cliente admin no servidor,
-- respeitando as flags mostrar_rua / mostrar_endereco_completo na aplicação.
REVOKE SELECT (rua, numero, complemento, cep, latitude, longitude)
  ON public.imoveis FROM anon;