
-- Enums
CREATE TYPE public.lead_atividade_tipo AS ENUM (
  'ligacao','whatsapp','email','visita','video_chamada','reuniao_presencial','outros','descarte','ia_analise'
);

CREATE TYPE public.lead_descarte_motivo AS ENUM (
  'sem_contato','nao_e_lead','financeiro','desistiu','aluguel','outros'
);

-- lead_atividades
CREATE TABLE public.lead_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome text NOT NULL,
  user_perfil text NOT NULL,
  tipo public.lead_atividade_tipo NOT NULL,
  descricao text NOT NULL CHECK (length(btrim(descricao)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_atividades_lead_id_idx ON public.lead_atividades(lead_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.lead_atividades TO authenticated;
GRANT ALL ON public.lead_atividades TO service_role;

ALTER TABLE public.lead_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_atividades admin all" ON public.lead_atividades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lead_atividades dono select" ON public.lead_atividades
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid()));

CREATE POLICY "lead_atividades dono insert" ON public.lead_atividades
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "lead_atividades autor update" ON public.lead_atividades
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid())
  );

CREATE TRIGGER lead_atividades_updated BEFORE UPDATE ON public.lead_atividades
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Bloqueia exclusão física (auditoria)
CREATE OR REPLACE FUNCTION public.tg_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão não permitida nesta tabela (auditoria).';
END;
$$;

CREATE TRIGGER lead_atividades_no_delete BEFORE DELETE ON public.lead_atividades
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();

-- Garante que campos de auditoria não mudam em UPDATE
CREATE OR REPLACE FUNCTION public.tg_lead_atividades_lock_audit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.lead_id <> OLD.lead_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.user_nome <> OLD.user_nome
     OR NEW.user_perfil <> OLD.user_perfil
     OR NEW.tipo <> OLD.tipo
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Campos de auditoria não podem ser alterados.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lead_atividades_lock_audit BEFORE UPDATE ON public.lead_atividades
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_atividades_lock_audit();

-- lead_descartes
CREATE TABLE public.lead_descartes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome text NOT NULL,
  user_perfil text NOT NULL,
  motivo public.lead_descarte_motivo NOT NULL,
  detalhes text NOT NULL CHECK (length(btrim(detalhes)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_descartes_lead_id_idx ON public.lead_descartes(lead_id);

GRANT SELECT, INSERT ON public.lead_descartes TO authenticated;
GRANT ALL ON public.lead_descartes TO service_role;

ALTER TABLE public.lead_descartes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_descartes admin all" ON public.lead_descartes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lead_descartes dono select" ON public.lead_descartes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid()));

CREATE POLICY "lead_descartes dono insert" ON public.lead_descartes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.assigned_to = auth.uid())
    AND user_id = auth.uid()
  );

CREATE TRIGGER lead_descartes_no_delete BEFORE DELETE ON public.lead_descartes
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();
