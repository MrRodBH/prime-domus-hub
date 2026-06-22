DROP POLICY IF EXISTS "leads anyone create" ON public.leads;

CREATE POLICY "leads public submit" ON public.leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(nome) BETWEEN 2 AND 200
  AND (email IS NULL OR (length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
  AND (telefone IS NULL OR length(telefone) BETWEEN 6 AND 40)
  AND (mensagem IS NULL OR length(mensagem) <= 4000)
  AND (origem IS NULL OR length(origem) <= 100)
  AND status = 'novo'
  AND assigned_to IS NULL
);