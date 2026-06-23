ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS consent_lgpd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;

-- Atualiza policy de inserção pública para exigir consentimento LGPD
DROP POLICY IF EXISTS "leads public submit" ON public.leads;
CREATE POLICY "leads public submit"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(nome) >= 2 AND length(nome) <= 200
    AND (email IS NULL OR (length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    AND (telefone IS NULL OR (length(telefone) >= 6 AND length(telefone) <= 40))
    AND (mensagem IS NULL OR length(mensagem) <= 4000)
    AND (origem IS NULL OR length(origem) <= 100)
    AND status = 'novo'
    AND assigned_to IS NULL
    AND consent_lgpd = true
    AND consent_at IS NOT NULL
  );