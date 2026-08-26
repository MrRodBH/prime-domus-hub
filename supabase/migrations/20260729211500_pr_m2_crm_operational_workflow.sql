-- PR-M2 — CRM Operational Workflow Functional Completion
-- Server-only tenant authority, closed lifecycle, scopes, OCC, idempotency,
-- pipeline/stages, assignments, tasks, timeline, tags and exact duplicate diagnostics.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.rbac_modules (codigo, nome, descricao, ordem)
SELECT 'crm', 'CRM', 'Leads, pipeline, tarefas e atividades comerciais', 30
WHERE NOT EXISTS (SELECT 1 FROM public.rbac_modules WHERE codigo = 'crm');

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_key text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_pipeline_key_format CHECK (pipeline_key ~ '^[a-z0-9_]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_pipelines_tenant_key
  ON public.crm_pipelines (tenant_id, pipeline_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_pipelines_one_default
  ON public.crm_pipelines (tenant_id) WHERE is_default = true AND ativo = true;

CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  status_key text NOT NULL,
  nome text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  ativo boolean NOT NULL DEFAULT true,
  terminal boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_stage_status_check CHECK (
    status_key IN ('novo','conversando','visita','proposta','ganho','perdido','descartado')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_pipeline_stages_status
  ON public.crm_pipeline_stages (tenant_id, pipeline_id, status_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_pipeline_stages_position
  ON public.crm_pipeline_stages (tenant_id, pipeline_id, position);

INSERT INTO public.crm_pipelines (tenant_id, pipeline_key, nome, ativo, is_default)
SELECT t.id, 'sales_default', 'Pipeline comercial', true, true
FROM public.tenants t
JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = t.id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.crm_pipelines p
  WHERE p.tenant_id = t.id AND p.is_default = true AND p.ativo = true
);

INSERT INTO public.crm_pipeline_stages (
  tenant_id, pipeline_id, status_key, nome, position, terminal
)
SELECT p.tenant_id, p.id, s.status_key, s.nome, s.position, s.terminal
FROM public.crm_pipelines p
CROSS JOIN (VALUES
  ('novo','Novo',0,false),
  ('conversando','Conversando',1,false),
  ('visita','Visita',2,false),
  ('proposta','Proposta',3,false),
  ('ganho','Ganho',4,true),
  ('perdido','Perdido',5,true),
  ('descartado','Descartado',6,true)
) AS s(status_key,nome,position,terminal)
WHERE p.is_default = true
  AND p.ativo = true
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = p.tenant_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.crm_pipeline_stages ps
    WHERE ps.pipeline_id = p.id AND ps.status_key = s.status_key
  );

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS assigned_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qualification_key text NOT NULL DEFAULT 'nao_qualificado',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS normalized_email text,
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS original_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS latest_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS merged_into_lead_id uuid REFERENCES public.leads(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS merge_state text NOT NULL DEFAULT 'active';

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_qualification_key_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_qualification_key_check
  CHECK (qualification_key IN ('nao_qualificado','contatado','qualificado','desqualificado'));
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_merge_state_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_merge_state_check
  CHECK (merge_state IN ('active','merged'));

UPDATE public.leads l
SET pipeline_id = p.id,
    stage_id = s.id,
    normalized_email = CASE WHEN l.email IS NULL THEN NULL ELSE lower(btrim(l.email)) END,
    normalized_phone = CASE
      WHEN l.telefone IS NULL THEN NULL
      ELSE NULLIF(regexp_replace(l.telefone, '[^0-9]+', '', 'g'), '')
    END,
    original_attribution = jsonb_strip_nulls(jsonb_build_object(
      'origem', l.origem,
      'utm_source', l.utm_source,
      'utm_medium', l.utm_medium,
      'utm_campaign', l.utm_campaign,
      'utm_content', l.utm_content,
      'utm_term', l.utm_term,
      'gclid', l.gclid,
      'fbclid', l.fbclid,
      'referrer', l.referrer,
      'landing_url', l.landing_url
    )),
    latest_attribution = jsonb_strip_nulls(jsonb_build_object(
      'origem', l.origem,
      'utm_source', l.utm_source,
      'utm_medium', l.utm_medium,
      'utm_campaign', l.utm_campaign,
      'utm_content', l.utm_content,
      'utm_term', l.utm_term,
      'gclid', l.gclid,
      'fbclid', l.fbclid,
      'referrer', l.referrer,
      'landing_url', l.landing_url
    ))
FROM public.crm_pipelines p
JOIN public.crm_pipeline_stages s ON s.pipeline_id = p.id
WHERE p.tenant_id = l.tenant_id
  AND p.is_default = true
  AND p.ativo = true
  AND s.ativo = true
  AND s.status_key = l.status
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = l.tenant_id
  )
  AND (
    l.pipeline_id IS NULL
    OR l.stage_id IS NULL
    OR l.normalized_email IS NULL
    OR l.normalized_phone IS NULL
  );

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leads l
    JOIN prm2_rebaseline.authorized_tenant_ids() authorized
      ON authorized.tenant_id = l.tenant_id
    WHERE pipeline_id IS NULL OR stage_id IS NULL
  ) THEN
    RAISE EXCEPTION 'crm_pipeline_backfill_incomplete';
  END IF;
END;
$block$;

CREATE OR REPLACE FUNCTION public.crm_bind_lead_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_count integer;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'crm_tenant_required' USING ERRCODE = '23502';
  END IF;
  IF NEW.status NOT IN ('novo','conversando','visita','proposta','ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'crm_unknown_status' USING ERRCODE = '22023';
  END IF;

  IF NEW.pipeline_id IS NULL THEN
    SELECT count(*), min(id)
      INTO v_count, v_pipeline_id
    FROM public.crm_pipelines
    WHERE tenant_id = NEW.tenant_id AND is_default = true AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_ambiguous_state:default_pipeline' USING ERRCODE = 'P0001';
    END IF;
    NEW.pipeline_id := v_pipeline_id;
  ELSE
    SELECT count(*) INTO v_count
    FROM public.crm_pipelines
    WHERE id = NEW.pipeline_id AND tenant_id = NEW.tenant_id AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_cross_tenant_reference:pipeline' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.stage_id IS NULL
     OR TG_OP = 'INSERT'
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.pipeline_id IS DISTINCT FROM OLD.pipeline_id THEN
    SELECT count(*), min(id)
      INTO v_count, v_stage_id
    FROM public.crm_pipeline_stages
    WHERE tenant_id = NEW.tenant_id
      AND pipeline_id = NEW.pipeline_id
      AND status_key = NEW.status
      AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_ambiguous_state:status_stage' USING ERRCODE = 'P0001';
    END IF;
    NEW.stage_id := v_stage_id;
  ELSE
    SELECT count(*) INTO v_count
    FROM public.crm_pipeline_stages
    WHERE id = NEW.stage_id
      AND tenant_id = NEW.tenant_id
      AND pipeline_id = NEW.pipeline_id
      AND status_key = NEW.status
      AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_cross_tenant_reference:stage' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.normalized_email := CASE
    WHEN NEW.email IS NULL THEN NULL
    ELSE NULLIF(lower(btrim(NEW.email)), '')
  END;
  NEW.normalized_phone := CASE
    WHEN NEW.telefone IS NULL THEN NULL
    ELSE NULLIF(regexp_replace(NEW.telefone, '[^0-9]+', '', 'g'), '')
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS crm_bind_lead_pipeline_trigger ON public.leads;
CREATE TRIGGER crm_bind_lead_pipeline_trigger
BEFORE INSERT OR UPDATE OF tenant_id, status, pipeline_id, stage_id, email, telefone
ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_bind_lead_pipeline();

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_pipeline_required,
  DROP CONSTRAINT IF EXISTS leads_stage_required;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_pipeline_required CHECK (pipeline_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT leads_stage_required CHECK (stage_id IS NOT NULL) NOT VALID;

CREATE INDEX IF NOT EXISTS ix_leads_tenant_pipeline_stage
  ON public.leads (tenant_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS ix_leads_tenant_assigned
  ON public.leads (tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS ix_leads_tenant_team
  ON public.leads (tenant_id, assigned_team_id);
CREATE INDEX IF NOT EXISTS ix_leads_tenant_normalized_email
  ON public.leads (tenant_id, normalized_email) WHERE normalized_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_leads_tenant_normalized_phone
  ON public.leads (tenant_id, normalized_phone) WHERE normalized_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_event_type_check CHECK (event_type IN (
    'lead_created','lead_updated','lead_assigned','lead_reassigned','lead_unassigned',
    'stage_changed','status_changed','qualification_changed','task_created','task_started',
    'task_completed','task_cancelled','task_reopened','note_added','contact_attempt_recorded',
    'tags_changed','source_corrected','won','lost','reopened','archived'
  ))
);
CREATE INDEX IF NOT EXISTS ix_crm_lead_events_tenant_lead_created
  ON public.crm_lead_events (tenant_id, lead_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.crm_lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL,
  from_user_id uuid,
  to_user_id uuid,
  from_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  strategy text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_assignment_strategy_check
    CHECK (strategy IN ('manual_member','manual_team','unassigned'))
);
CREATE INDEX IF NOT EXISTS ix_crm_lead_assignments_tenant_lead
  ON public.crm_lead_assignments (tenant_id, lead_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.crm_lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  description text,
  due_at timestamptz,
  assigned_to uuid,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_task_type_check
    CHECK (task_type IN ('follow_up','call','meeting','visit','proposal_review','other')),
  CONSTRAINT crm_task_status_check
    CHECK (status IN ('open','in_progress','completed','cancelled')),
  CONSTRAINT crm_task_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
  CONSTRAINT crm_task_description_check CHECK (description IS NULL OR char_length(description) <= 4000)
);
CREATE INDEX IF NOT EXISTS ix_crm_lead_tasks_tenant_lead
  ON public.crm_lead_tasks (tenant_id, lead_id, status, due_at, id);
CREATE INDEX IF NOT EXISTS ix_crm_lead_tasks_assignee
  ON public.crm_lead_tasks (tenant_id, assigned_to, status, due_at, id);

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tag_key text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_tag_key_format CHECK (tag_key ~ '^[a-z0-9_]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_tags_tenant_key
  ON public.crm_tags (tenant_id, tag_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_tags_tenant_name
  ON public.crm_tags (tenant_id, lower(nome));

CREATE TABLE IF NOT EXISTS public.crm_lead_tags (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.crm_idempotency (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  operation text NOT NULL,
  resource_id uuid,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, actor_user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS ix_crm_idempotency_created
  ON public.crm_idempotency (created_at);

CREATE OR REPLACE FUNCTION public.crm_protect_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RAISE EXCEPTION 'crm_append_only_violation' USING ERRCODE = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS crm_lead_events_append_only ON public.crm_lead_events;
CREATE TRIGGER crm_lead_events_append_only
BEFORE UPDATE OR DELETE ON public.crm_lead_events
FOR EACH ROW EXECUTE FUNCTION public.crm_protect_append_only();

DROP TRIGGER IF EXISTS crm_lead_assignments_append_only ON public.crm_lead_assignments;
CREATE TRIGGER crm_lead_assignments_append_only
BEFORE UPDATE OR DELETE ON public.crm_lead_assignments
FOR EACH ROW EXECUTE FUNCTION public.crm_protect_append_only();

CREATE OR REPLACE FUNCTION public.crm_resolve_scope(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _action public.rbac_action
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
BEGIN
  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'crm',
    _action
  );
  IF COALESCE((v_decision->>'allowed')::boolean, false) <> true THEN
    RAISE EXCEPTION 'tenant_crm_permission_denied' USING ERRCODE = '42501';
  END IF;
  IF v_decision->>'scope' NOT IN ('proprio','equipe','global') THEN
    RAISE EXCEPTION 'tenant_crm_permission_scope_missing' USING ERRCODE = '42501';
  END IF;
  RETURN v_decision->>'scope';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.crm_scope_allows_lead(
  _tenant_id uuid,
  _actor_user_id uuid,
  _scope text,
  _lead_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT CASE
    WHEN _scope = 'global' THEN EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = _lead_id AND l.tenant_id = _tenant_id
    )
    WHEN _scope = 'proprio' THEN EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = _lead_id
        AND l.tenant_id = _tenant_id
        AND l.assigned_to = _actor_user_id
    )
    WHEN _scope = 'equipe' THEN EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = _lead_id
        AND l.tenant_id = _tenant_id
        AND (
          l.assigned_to = _actor_user_id
          OR EXISTS (
            SELECT 1
            FROM public.team_members actor_tm
            JOIN public.team_members target_tm
              ON target_tm.tenant_id = actor_tm.tenant_id
             AND target_tm.team_id = actor_tm.team_id
             AND target_tm.user_id = l.assigned_to
            JOIN public.teams t
              ON t.id = actor_tm.team_id
             AND t.tenant_id = actor_tm.tenant_id
             AND t.ativo = true
            WHERE actor_tm.tenant_id = _tenant_id
              AND actor_tm.user_id = _actor_user_id
          )
          OR EXISTS (
            SELECT 1
            FROM public.team_members actor_tm
            JOIN public.teams t
              ON t.id = actor_tm.team_id
             AND t.tenant_id = actor_tm.tenant_id
             AND t.ativo = true
            WHERE actor_tm.tenant_id = _tenant_id
              AND actor_tm.user_id = _actor_user_id
              AND l.assigned_team_id = actor_tm.team_id
          )
        )
    )
    ELSE false
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.crm_scope_allows_user_target(
  _tenant_id uuid,
  _actor_user_id uuid,
  _scope text,
  _target_user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT CASE
    WHEN _scope = 'global' THEN EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = _tenant_id
        AND tm.user_id = _target_user_id
        AND tm.membership_status = 'active'
    )
    WHEN _scope = 'proprio' THEN
      _target_user_id = _actor_user_id
      AND EXISTS (
        SELECT 1 FROM public.tenant_members tm
        WHERE tm.tenant_id = _tenant_id
          AND tm.user_id = _actor_user_id
          AND tm.membership_status = 'active'
      )
    WHEN _scope = 'equipe' THEN EXISTS (
      SELECT 1
      FROM public.team_members actor_tm
      JOIN public.team_members target_tm
        ON target_tm.tenant_id = actor_tm.tenant_id
       AND target_tm.team_id = actor_tm.team_id
       AND target_tm.user_id = _target_user_id
      JOIN public.teams t
        ON t.id = actor_tm.team_id
       AND t.tenant_id = actor_tm.tenant_id
       AND t.ativo = true
      JOIN public.tenant_members target_membership
        ON target_membership.tenant_id = target_tm.tenant_id
       AND target_membership.user_id = target_tm.user_id
       AND target_membership.membership_status = 'active'
      WHERE actor_tm.tenant_id = _tenant_id
        AND actor_tm.user_id = _actor_user_id
    )
    ELSE false
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.crm_scope_allows_team_target(
  _tenant_id uuid,
  _actor_user_id uuid,
  _scope text,
  _target_team_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT CASE
    WHEN _scope = 'global' THEN EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = _target_team_id AND t.tenant_id = _tenant_id AND t.ativo = true
    )
    WHEN _scope = 'equipe' THEN EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.teams t
        ON t.id = tm.team_id
       AND t.tenant_id = tm.tenant_id
       AND t.ativo = true
      WHERE tm.tenant_id = _tenant_id
        AND tm.user_id = _actor_user_id
        AND tm.team_id = _target_team_id
    )
    ELSE false
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.crm_idempotent_response(
  _tenant_id uuid,
  _actor_user_id uuid,
  _idempotency_key text,
  _operation text,
  _request_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_row public.crm_idempotency%ROWTYPE;
BEGIN
  IF char_length(COALESCE(_idempotency_key, '')) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'crm_idempotency_key_invalid' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _tenant_id::text || ':' || _actor_user_id::text || ':' || _idempotency_key,
      0
    )
  );
  SELECT * INTO v_row
  FROM public.crm_idempotency
  WHERE tenant_id = _tenant_id
    AND actor_user_id = _actor_user_id
    AND idempotency_key = _idempotency_key
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_row.operation <> _operation OR v_row.request_hash <> _request_hash THEN
    RAISE EXCEPTION 'crm_idempotency_conflict' USING ERRCODE = '40900';
  END IF;
  RETURN v_row.response;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.list_tenant_crm_leads(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _status text DEFAULT NULL,
  _limit integer DEFAULT 200,
  _offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'visualizar'
  );
  IF _status IS NOT NULL
     AND _status NOT IN ('novo','conversando','visita','proposta','ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'crm_unknown_status' USING ERRCODE = '22023';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC, q.id DESC)
    FROM (
      SELECT
        l.id,
        l.nome,
        l.email,
        l.telefone,
        l.mensagem,
        l.status,
        l.version,
        l.assigned_to,
        l.assigned_team_id,
        l.pipeline_id,
        l.stage_id,
        l.qualification_key,
        l.origem,
        l.original_attribution,
        l.latest_attribution,
        l.valor_estimado,
        l.imovel_id,
        l.discard_reason_id,
        l.lost_reason_id,
        l.descartado_at,
        l.perdido_at,
        l.ganho_at,
        l.created_at,
        l.updated_at,
        CASE WHEN i.id IS NULL THEN NULL ELSE jsonb_build_object(
          'titulo', i.titulo,
          'slug', i.slug,
          'preco', i.preco,
          'preco_sob_consulta', i.preco_sob_consulta
        ) END AS imovel,
        CASE WHEN dr.id IS NULL THEN NULL ELSE jsonb_build_object('nome', dr.nome) END AS discard_reason,
        CASE WHEN lr.id IS NULL THEN NULL ELSE jsonb_build_object('nome', lr.nome) END AS lost_reason
      FROM public.leads l
      LEFT JOIN public.imoveis i
        ON i.id = l.imovel_id AND i.tenant_id = l.tenant_id
      LEFT JOIN public.lead_discard_reasons dr
        ON dr.id = l.discard_reason_id AND dr.tenant_id = l.tenant_id
      LEFT JOIN public.deal_lost_reasons lr
        ON lr.id = l.lost_reason_id AND lr.tenant_id = l.tenant_id
      WHERE l.tenant_id = _tenant_id
        AND l.merge_state = 'active'
        AND (_status IS NULL OR l.status = _status)
        AND public.crm_scope_allows_lead(
          _tenant_id, _actor_user_id, v_scope, l.id
        )
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT LEAST(GREATEST(_limit, 1), 500)
      OFFSET GREATEST(_offset, 0)
    ) q
  ), '[]'::jsonb);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_tenant_crm_lead_aggregate(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'visualizar'
  );
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  SELECT to_jsonb(l) INTO v_lead
  FROM public.leads l
  WHERE l.id = _lead_id AND l.tenant_id = _tenant_id;
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'lead', v_lead,
    'pipeline', (
      SELECT to_jsonb(p)
      FROM public.crm_pipelines p
      WHERE p.id = (v_lead->>'pipeline_id')::uuid AND p.tenant_id = _tenant_id
    ),
    'stage', (
      SELECT to_jsonb(s)
      FROM public.crm_pipeline_stages s
      WHERE s.id = (v_lead->>'stage_id')::uuid AND s.tenant_id = _tenant_id
    ),
    'tasks', COALESCE((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC, t.id DESC)
      FROM public.crm_lead_tasks t
      WHERE t.tenant_id = _tenant_id AND t.lead_id = _lead_id
    ), '[]'::jsonb),
    'tags', COALESCE((
      SELECT jsonb_agg(to_jsonb(g) ORDER BY g.nome, g.id)
      FROM public.crm_lead_tags lt
      JOIN public.crm_tags g
        ON g.id = lt.tag_id AND g.tenant_id = lt.tenant_id
      WHERE lt.tenant_id = _tenant_id AND lt.lead_id = _lead_id
    ), '[]'::jsonb),
    'activities', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC, e.id DESC)
      FROM (
        SELECT *
        FROM public.crm_lead_events
        WHERE tenant_id = _tenant_id AND lead_id = _lead_id
        ORDER BY created_at DESC, id DESC
        LIMIT 200
      ) e
    ), '[]'::jsonb),
    'row_version', (v_lead->>'version')::bigint
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.create_tenant_crm_lead(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _nome text,
  _email text,
  _telefone text,
  _imovel_id uuid,
  _mensagem text,
  _assigned_to uuid,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_hash text;
  v_previous jsonb;
  v_pipeline uuid;
  v_stage uuid;
  v_lead public.leads%ROWTYPE;
  v_count integer;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'criar'
  );
  IF char_length(btrim(COALESCE(_nome,''))) < 2 OR char_length(_nome) > 200 THEN
    RAISE EXCEPTION 'crm_lead_name_invalid' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'nome', _nome,
    'email', _email,
    'telefone', _telefone,
    'imovel_id', _imovel_id,
    'mensagem', _mensagem,
    'assigned_to', _assigned_to
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'create_lead', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT count(*), min(id) INTO v_count, v_pipeline
  FROM public.crm_pipelines
  WHERE tenant_id = _tenant_id AND is_default = true AND ativo = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'crm_ambiguous_state:default_pipeline' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*), min(id) INTO v_count, v_stage
  FROM public.crm_pipeline_stages
  WHERE tenant_id = _tenant_id
    AND pipeline_id = v_pipeline
    AND status_key = 'novo'
    AND ativo = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'crm_ambiguous_state:new_stage' USING ERRCODE = 'P0001';
  END IF;

  IF _imovel_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.imoveis
    WHERE id = _imovel_id AND tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'crm_cross_tenant_reference:property' USING ERRCODE = '42501';
  END IF;

  IF v_scope IN ('proprio','equipe') AND _assigned_to IS NULL THEN
    RAISE EXCEPTION 'crm_assignee_required' USING ERRCODE = '42501';
  END IF;
  IF _assigned_to IS NOT NULL
     AND NOT public.crm_scope_allows_user_target(
       _tenant_id, _actor_user_id, v_scope, _assigned_to
     ) THEN
    RAISE EXCEPTION 'crm_assignee_invalid' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.leads (
    tenant_id,
    nome,
    email,
    telefone,
    imovel_id,
    mensagem,
    assigned_to,
    status,
    version,
    pipeline_id,
    stage_id,
    qualification_key,
    original_attribution,
    latest_attribution
  ) VALUES (
    _tenant_id,
    btrim(_nome),
    NULLIF(lower(btrim(_email)), ''),
    NULLIF(btrim(_telefone), ''),
    _imovel_id,
    NULLIF(btrim(_mensagem), ''),
    _assigned_to,
    'novo',
    1,
    v_pipeline,
    v_stage,
    'nao_qualificado',
    '{}'::jsonb,
    '{}'::jsonb
  ) RETURNING * INTO v_lead;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    v_lead.id,
    _actor_user_id,
    'lead_created',
    jsonb_build_object('scope', v_scope, 'assigned_to', _assigned_to)
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.lead_created',
    'lead',
    v_lead.id,
    to_jsonb(v_lead)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'id', v_lead.id,
    'tenantId', _tenant_id,
    'status', v_lead.status,
    'version', v_lead.version,
    'assignedTo', v_lead.assigned_to,
    'corretorId', v_lead.corretor_id,
    'imovelId', v_lead.imovel_id,
    'createdAt', v_lead.created_at
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'create_lead',
    v_lead.id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.update_tenant_crm_lead(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _expected_version bigint,
  _patch jsonb,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead public.leads%ROWTYPE;
  v_before jsonb;
  v_hash text;
  v_previous jsonb;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'editar'
  );
  IF _patch ?| ARRAY[
    'tenant_id','status','version','assigned_to','assigned_team_id',
    'pipeline_id','stage_id','created_at','original_attribution',
    'merge_state','merged_into_lead_id'
  ] THEN
    RAISE EXCEPTION 'crm_forbidden_patch_field' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(_patch) k
    WHERE k NOT IN (
      'nome','email','telefone','mensagem','valor_estimado',
      'qualification_key','origem'
    )
  ) THEN
    RAISE EXCEPTION 'crm_unknown_patch_field' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'lead_id', _lead_id,
    'expected_version', _expected_version,
    'patch', _patch
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'update_lead', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = _lead_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;
  IF v_lead.status IN ('ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'crm_terminal_lead_protected' USING ERRCODE = '22023';
  END IF;
  IF _patch ? 'qualification_key'
     AND _patch->>'qualification_key' NOT IN (
       'nao_qualificado','contatado','qualificado','desqualificado'
     ) THEN
    RAISE EXCEPTION 'crm_unknown_qualification' USING ERRCODE = '22023';
  END IF;

  v_before := to_jsonb(v_lead);
  UPDATE public.leads SET
    nome = CASE WHEN _patch ? 'nome' THEN btrim(_patch->>'nome') ELSE nome END,
    email = CASE
      WHEN _patch ? 'email' THEN NULLIF(lower(btrim(_patch->>'email')), '')
      ELSE email
    END,
    telefone = CASE
      WHEN _patch ? 'telefone' THEN NULLIF(btrim(_patch->>'telefone'), '')
      ELSE telefone
    END,
    mensagem = CASE
      WHEN _patch ? 'mensagem' THEN NULLIF(btrim(_patch->>'mensagem'), '')
      ELSE mensagem
    END,
    valor_estimado = CASE
      WHEN _patch ? 'valor_estimado' THEN NULLIF(_patch->>'valor_estimado', '')::numeric
      ELSE valor_estimado
    END,
    qualification_key = CASE
      WHEN _patch ? 'qualification_key' THEN _patch->>'qualification_key'
      ELSE qualification_key
    END,
    origem = CASE
      WHEN _patch ? 'origem' THEN NULLIF(btrim(_patch->>'origem'), '')
      ELSE origem
    END,
    latest_attribution = CASE
      WHEN _patch ? 'origem' THEN latest_attribution || jsonb_build_object(
        'origem', NULLIF(btrim(_patch->>'origem'), ''),
        'corrected_by', _actor_user_id,
        'corrected_at', now()
      )
      ELSE latest_attribution
    END,
    version = version + 1,
    updated_at = now()
  WHERE id = _lead_id AND tenant_id = _tenant_id
  RETURNING * INTO v_lead;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    CASE
      WHEN _patch ? 'qualification_key' THEN 'qualification_changed'
      WHEN _patch ? 'origem' THEN 'source_corrected'
      ELSE 'lead_updated'
    END,
    jsonb_build_object(
      'before', v_before,
      'after', to_jsonb(v_lead),
      'scope', v_scope
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.lead_updated',
    'lead',
    _lead_id,
    v_before,
    to_jsonb(v_lead)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'id', _lead_id,
    'version', v_lead.version,
    'qualificationKey', v_lead.qualification_key
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'update_lead',
    _lead_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.transition_tenant_crm_lead(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _to_status text,
  _expected_version bigint,
  _reason_id uuid,
  _note text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead public.leads%ROWTYPE;
  v_from text;
  v_stage uuid;
  v_count integer;
  v_hash text;
  v_previous jsonb;
  v_event text;
  v_reason_type text;
  v_result jsonb;
  v_action public.rbac_action;
BEGIN
  IF _to_status NOT IN (
    'novo','conversando','visita','proposta','ganho','perdido','descartado'
  ) THEN
    RAISE EXCEPTION 'crm_unknown_status' USING ERRCODE = '22023';
  END IF;
  v_action := CASE
    WHEN _to_status = 'ganho' THEN 'gerenciar'::public.rbac_action
    ELSE 'editar'::public.rbac_action
  END;
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, v_action
  );
  v_hash := encode(digest(jsonb_build_object(
    'lead_id', _lead_id,
    'to', _to_status,
    'expected', _expected_version,
    'reason', _reason_id,
    'note', _note
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'transition_lead', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = _lead_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;

  v_from := v_lead.status;
  IF v_from = _to_status THEN
    RAISE EXCEPTION 'crm_invalid_transition:noop' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    (v_from='novo' AND _to_status IN ('conversando','descartado'))
    OR (v_from='conversando' AND _to_status IN ('visita','proposta','descartado'))
    OR (v_from='visita' AND _to_status IN ('conversando','proposta','descartado'))
    OR (v_from='proposta' AND _to_status IN ('conversando','ganho','perdido'))
    OR (v_from IN ('perdido','descartado') AND _to_status='novo')
  ) THEN
    RAISE EXCEPTION 'crm_invalid_transition' USING ERRCODE = '22023';
  END IF;

  IF _to_status = 'perdido' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'crm_reason_required' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO v_count
    FROM public.deal_lost_reasons
    WHERE id = _reason_id AND tenant_id = _tenant_id AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_invalid_reason' USING ERRCODE = '22023';
    END IF;
    v_reason_type := 'lost';
    v_event := 'lost';
  ELSIF _to_status = 'descartado' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'crm_reason_required' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO v_count
    FROM public.lead_discard_reasons
    WHERE id = _reason_id AND tenant_id = _tenant_id AND ativo = true;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'crm_invalid_reason' USING ERRCODE = '22023';
    END IF;
    v_reason_type := 'discard';
    v_event := 'archived';
  ELSIF _to_status = 'novo' AND v_from IN ('perdido','descartado') THEN
    IF _note IS NULL OR char_length(btrim(_note)) = 0 THEN
      RAISE EXCEPTION 'crm_reason_required' USING ERRCODE = '22023';
    END IF;
    v_reason_type := 'reopen';
    v_event := 'reopened';
  ELSIF _to_status = 'ganho' THEN
    IF _reason_id IS NOT NULL THEN
      RAISE EXCEPTION 'crm_reason_not_allowed' USING ERRCODE = '22023';
    END IF;
    v_reason_type := 'advance';
    v_event := 'won';
  ELSE
    IF _reason_id IS NOT NULL THEN
      RAISE EXCEPTION 'crm_reason_not_allowed' USING ERRCODE = '22023';
    END IF;
    v_reason_type := 'advance';
    v_event := 'stage_changed';
  END IF;

  SELECT count(*), min(id) INTO v_count, v_stage
  FROM public.crm_pipeline_stages
  WHERE tenant_id = _tenant_id
    AND pipeline_id = v_lead.pipeline_id
    AND status_key = _to_status
    AND ativo = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'crm_ambiguous_state:target_stage' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.leads SET
    status = _to_status,
    stage_id = v_stage,
    version = version + 1,
    updated_at = now(),
    ganho_at = CASE
      WHEN _to_status='ganho' THEN now()
      WHEN v_from='ganho' THEN NULL
      ELSE ganho_at
    END,
    perdido_at = CASE
      WHEN _to_status='perdido' THEN now()
      WHEN v_from='perdido' THEN NULL
      ELSE perdido_at
    END,
    descartado_at = CASE
      WHEN _to_status='descartado' THEN now()
      WHEN v_from='descartado' THEN NULL
      ELSE descartado_at
    END,
    lost_reason_id = CASE
      WHEN _to_status='perdido' THEN _reason_id
      WHEN v_from='perdido' THEN NULL
      ELSE lost_reason_id
    END,
    discard_reason_id = CASE
      WHEN _to_status='descartado' THEN _reason_id
      WHEN v_from='descartado' THEN NULL
      ELSE discard_reason_id
    END,
    archived_at = CASE WHEN _to_status='descartado' THEN now() ELSE NULL END
  WHERE id = _lead_id AND tenant_id = _tenant_id
  RETURNING * INTO v_lead;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    v_event,
    jsonb_build_object(
      'from_status', v_from,
      'to_status', _to_status,
      'reason_id', _reason_id,
      'reason_type', v_reason_type,
      'note', _note,
      'scope', v_scope,
      'version', v_lead.version
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.lead_transition',
    'lead',
    _lead_id,
    jsonb_build_object('status', v_from, 'version', _expected_version),
    jsonb_build_object('status', _to_status, 'version', v_lead.version)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'leadId', _lead_id,
    'fromStatus', v_from,
    'toStatus', _to_status,
    'reasonType', v_reason_type,
    'version', v_lead.version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'transition_lead',
    _lead_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.assign_tenant_crm_lead(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _expected_version bigint,
  _strategy text,
  _assignee_user_id uuid,
  _team_id uuid,
  _reason text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead public.leads%ROWTYPE;
  v_from_user uuid;
  v_from_team uuid;
  v_hash text;
  v_previous jsonb;
  v_event text;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'gerenciar'
  );
  IF _strategy NOT IN ('manual_member','manual_team','unassigned') THEN
    RAISE EXCEPTION 'crm_assignment_strategy_unknown' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(COALESCE(_reason,''))) = 0 OR char_length(_reason) > 1000 THEN
    RAISE EXCEPTION 'crm_reason_required' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'lead', _lead_id,
    'expected', _expected_version,
    'strategy', _strategy,
    'assignee', _assignee_user_id,
    'team', _team_id,
    'reason', _reason
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'assign_lead', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = _lead_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) AND v_scope <> 'global' THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;

  v_from_user := v_lead.assigned_to;
  v_from_team := v_lead.assigned_team_id;

  IF _strategy = 'manual_member' THEN
    IF _assignee_user_id IS NULL OR _team_id IS NOT NULL THEN
      RAISE EXCEPTION 'crm_assignee_invalid' USING ERRCODE = '22023';
    END IF;
    IF NOT public.crm_scope_allows_user_target(
      _tenant_id, _actor_user_id, v_scope, _assignee_user_id
    ) THEN
      RAISE EXCEPTION 'crm_assignee_invalid' USING ERRCODE = '42501';
    END IF;
  ELSIF _strategy = 'manual_team' THEN
    IF _team_id IS NULL OR _assignee_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'crm_team_invalid' USING ERRCODE = '22023';
    END IF;
    IF NOT public.crm_scope_allows_team_target(
      _tenant_id, _actor_user_id, v_scope, _team_id
    ) THEN
      RAISE EXCEPTION 'crm_team_invalid' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF _assignee_user_id IS NOT NULL OR _team_id IS NOT NULL THEN
      RAISE EXCEPTION 'crm_unassign_target_forbidden' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_event := CASE
    WHEN _strategy = 'unassigned' THEN 'lead_unassigned'
    WHEN v_from_user IS NULL AND v_from_team IS NULL THEN 'lead_assigned'
    ELSE 'lead_reassigned'
  END;

  UPDATE public.leads SET
    assigned_to = _assignee_user_id,
    assigned_team_id = _team_id,
    version = version + 1,
    updated_at = now()
  WHERE id = _lead_id AND tenant_id = _tenant_id
  RETURNING * INTO v_lead;

  INSERT INTO public.crm_lead_assignments (
    tenant_id, lead_id, actor_user_id,
    from_user_id, to_user_id, from_team_id, to_team_id,
    strategy, reason
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    v_from_user,
    _assignee_user_id,
    v_from_team,
    _team_id,
    _strategy,
    btrim(_reason)
  );
  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    v_event,
    jsonb_build_object(
      'strategy', _strategy,
      'from_user_id', v_from_user,
      'to_user_id', _assignee_user_id,
      'from_team_id', v_from_team,
      'to_team_id', _team_id,
      'reason', _reason,
      'scope', v_scope
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.lead_assignment',
    'lead',
    _lead_id,
    jsonb_build_object(
      'assigned_to', v_from_user,
      'assigned_team_id', v_from_team,
      'version', _expected_version
    ),
    jsonb_build_object(
      'assigned_to', _assignee_user_id,
      'assigned_team_id', _team_id,
      'version', v_lead.version
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'leadId', _lead_id,
    'assignedTo', _assignee_user_id,
    'assignedTeamId', _team_id,
    'version', v_lead.version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'assign_lead',
    _lead_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.create_tenant_crm_task(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _task_type text,
  _title text,
  _description text,
  _due_at timestamptz,
  _assignee_user_id uuid,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_task public.crm_lead_tasks%ROWTYPE;
  v_hash text;
  v_previous jsonb;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'criar'
  );
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF _task_type NOT IN ('follow_up','call','meeting','visit','proposal_review','other') THEN
    RAISE EXCEPTION 'crm_unknown_task_type' USING ERRCODE = '22023';
  END IF;
  IF _task_type <> 'other' AND _due_at IS NULL THEN
    RAISE EXCEPTION 'crm_task_due_at_required' USING ERRCODE = '22023';
  END IF;
  IF _due_at IS NOT NULL AND _due_at < now() - interval '1 minute' THEN
    RAISE EXCEPTION 'crm_task_due_at_invalid' USING ERRCODE = '22023';
  END IF;
  IF _assignee_user_id IS NOT NULL
     AND NOT public.crm_scope_allows_user_target(
       _tenant_id, _actor_user_id, v_scope, _assignee_user_id
     ) THEN
    RAISE EXCEPTION 'crm_assignee_invalid' USING ERRCODE = '42501';
  END IF;

  v_hash := encode(digest(jsonb_build_object(
    'lead', _lead_id,
    'type', _task_type,
    'title', _title,
    'description', _description,
    'due', _due_at,
    'assignee', _assignee_user_id
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'create_task', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  INSERT INTO public.crm_lead_tasks (
    tenant_id, lead_id, task_type, title, description,
    due_at, assigned_to, created_by
  ) VALUES (
    _tenant_id,
    _lead_id,
    _task_type,
    btrim(_title),
    NULLIF(btrim(_description), ''),
    _due_at,
    _assignee_user_id,
    _actor_user_id
  ) RETURNING * INTO v_task;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    'task_created',
    jsonb_build_object(
      'task_id', v_task.id,
      'task_type', _task_type,
      'due_at', _due_at,
      'assigned_to', _assignee_user_id
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.task_created',
    'crm_lead_task',
    v_task.id,
    to_jsonb(v_task)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'taskId', v_task.id,
    'leadId', _lead_id,
    'status', v_task.status,
    'version', v_task.row_version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'create_task',
    v_task.id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.transition_tenant_crm_task(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _task_id uuid,
  _to_status text,
  _expected_version bigint,
  _reason text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_task public.crm_lead_tasks%ROWTYPE;
  v_hash text;
  v_previous jsonb;
  v_event text;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'editar'
  );
  IF _to_status NOT IN ('open','in_progress','completed','cancelled') THEN
    RAISE EXCEPTION 'crm_unknown_task_status' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'task', _task_id,
    'to', _to_status,
    'expected', _expected_version,
    'reason', _reason
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'transition_task', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT * INTO v_task
  FROM public.crm_lead_tasks
  WHERE id = _task_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_task_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, v_task.lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF v_task.row_version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;
  IF NOT (
    (v_task.status='open' AND _to_status IN ('in_progress','completed','cancelled'))
    OR (v_task.status='in_progress' AND _to_status IN ('completed','cancelled'))
    OR (v_task.status IN ('completed','cancelled') AND _to_status='open')
  ) THEN
    RAISE EXCEPTION 'crm_invalid_task_transition' USING ERRCODE = '22023';
  END IF;
  IF v_task.status IN ('completed','cancelled')
     AND (_reason IS NULL OR char_length(btrim(_reason)) = 0) THEN
    RAISE EXCEPTION 'crm_reason_required' USING ERRCODE = '22023';
  END IF;

  v_event := CASE _to_status
    WHEN 'in_progress' THEN 'task_started'
    WHEN 'completed' THEN 'task_completed'
    WHEN 'cancelled' THEN 'task_cancelled'
    ELSE 'task_reopened'
  END;

  UPDATE public.crm_lead_tasks SET
    status = _to_status,
    row_version = row_version + 1,
    updated_at = now(),
    completed_at = CASE WHEN _to_status='completed' THEN now() ELSE NULL END,
    cancelled_at = CASE WHEN _to_status='cancelled' THEN now() ELSE NULL END
  WHERE id = _task_id AND tenant_id = _tenant_id
  RETURNING * INTO v_task;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    v_task.lead_id,
    _actor_user_id,
    v_event,
    jsonb_build_object(
      'task_id', _task_id,
      'to_status', _to_status,
      'reason', _reason,
      'version', v_task.row_version
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.task_transition',
    'crm_lead_task',
    _task_id,
    to_jsonb(v_task)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'taskId', _task_id,
    'leadId', v_task.lead_id,
    'status', v_task.status,
    'version', v_task.row_version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'transition_task',
    _task_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.add_tenant_crm_note(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _note text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_hash text;
  v_previous jsonb;
  v_event_id uuid;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'editar'
  );
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(_note,''))) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'crm_note_invalid' USING ERRCODE = '22023';
  END IF;
  IF lower(_note) ~ '<script|javascript:|data:text/html|onerror=' THEN
    RAISE EXCEPTION 'crm_note_unsafe' USING ERRCODE = '22023';
  END IF;

  v_hash := encode(digest(jsonb_build_object(
    'lead', _lead_id,
    'note', _note
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'add_note', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    'note_added',
    jsonb_build_object('note', btrim(_note))
  ) RETURNING id INTO v_event_id;
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.note_added',
    'lead',
    _lead_id,
    jsonb_build_object('event_id', v_event_id)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'eventId', v_event_id,
    'leadId', _lead_id
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'add_note',
    _lead_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_tenant_crm_tags(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid,
  _tag_ids uuid[],
  _expected_version bigint,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead public.leads%ROWTYPE;
  v_expected_count integer;
  v_actual_count integer;
  v_hash text;
  v_previous jsonb;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'editar'
  );
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = _lead_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;

  SELECT count(DISTINCT x) INTO v_expected_count
  FROM unnest(COALESCE(_tag_ids, ARRAY[]::uuid[])) x;
  SELECT count(*) INTO v_actual_count
  FROM public.crm_tags
  WHERE tenant_id = _tenant_id
    AND ativo = true
    AND id = ANY(COALESCE(_tag_ids, ARRAY[]::uuid[]));
  IF v_actual_count <> v_expected_count THEN
    RAISE EXCEPTION 'crm_cross_tenant_reference:tag' USING ERRCODE = '42501';
  END IF;

  v_hash := encode(digest(jsonb_build_object(
    'lead', _lead_id,
    'tags', COALESCE(_tag_ids, ARRAY[]::uuid[]),
    'expected', _expected_version
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'set_tags', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  DELETE FROM public.crm_lead_tags
  WHERE tenant_id = _tenant_id
    AND lead_id = _lead_id
    AND NOT (tag_id = ANY(COALESCE(_tag_ids, ARRAY[]::uuid[])));
  INSERT INTO public.crm_lead_tags (
    tenant_id, lead_id, tag_id, created_by
  )
  SELECT _tenant_id, _lead_id, x, _actor_user_id
  FROM unnest(COALESCE(_tag_ids, ARRAY[]::uuid[])) x
  ON CONFLICT DO NOTHING;

  UPDATE public.leads SET
    version = version + 1,
    updated_at = now()
  WHERE id = _lead_id AND tenant_id = _tenant_id
  RETURNING * INTO v_lead;

  INSERT INTO public.crm_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, payload
  ) VALUES (
    _tenant_id,
    _lead_id,
    _actor_user_id,
    'tags_changed',
    jsonb_build_object(
      'tag_ids', COALESCE(_tag_ids, ARRAY[]::uuid[]),
      'version', v_lead.version
    )
  );
  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.tags_changed',
    'lead',
    _lead_id,
    jsonb_build_object(
      'tag_ids', COALESCE(_tag_ids, ARRAY[]::uuid[]),
      'version', v_lead.version
    )
  );

  v_result := jsonb_build_object(
    'ok', true,
    'leadId', _lead_id,
    'tagIds', COALESCE(_tag_ids, ARRAY[]::uuid[]),
    'version', v_lead.version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'set_tags',
    _lead_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.find_tenant_crm_duplicates(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _lead_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_lead public.leads%ROWTYPE;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'visualizar'
  );
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = _lead_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_lead_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.crm_scope_allows_lead(
    _tenant_id, _actor_user_id, v_scope, _lead_id
  ) THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'leadId', _lead_id,
    'mergeState', 'merge_review_required',
    'automaticMerge', false,
    'candidates', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'nome', l.nome,
        'emailMatch', v_lead.normalized_email IS NOT NULL
          AND l.normalized_email = v_lead.normalized_email,
        'phoneMatch', v_lead.normalized_phone IS NOT NULL
          AND l.normalized_phone = v_lead.normalized_phone,
        'status', l.status,
        'version', l.version
      ) ORDER BY l.created_at, l.id)
      FROM public.leads l
      WHERE l.tenant_id = _tenant_id
        AND l.id <> _lead_id
        AND l.merge_state = 'active'
        AND (
          (v_lead.normalized_email IS NOT NULL
            AND l.normalized_email = v_lead.normalized_email)
          OR (v_lead.normalized_phone IS NOT NULL
            AND l.normalized_phone = v_lead.normalized_phone)
        )
    ), '[]'::jsonb)
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_tenant_crm_pipeline_state(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _pipeline_id uuid,
  _expected_version bigint,
  _active boolean,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_pipeline public.crm_pipelines%ROWTYPE;
  v_hash text;
  v_previous jsonb;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'gerenciar'
  );
  IF v_scope <> 'global' THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'pipeline', _pipeline_id,
    'expected', _expected_version,
    'active', _active
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'pipeline_state', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  SELECT * INTO v_pipeline
  FROM public.crm_pipelines
  WHERE id = _pipeline_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'crm_cross_tenant_reference:pipeline' USING ERRCODE = '42501';
  END IF;
  IF v_pipeline.row_version <> _expected_version THEN
    RAISE EXCEPTION 'crm_version_conflict' USING ERRCODE = '40001';
  END IF;
  IF _active = false AND v_pipeline.is_default = true THEN
    RAISE EXCEPTION 'crm_default_pipeline_deactivation_forbidden' USING ERRCODE = '22023';
  END IF;
  IF _active = false AND EXISTS (
    SELECT 1 FROM public.leads
    WHERE tenant_id = _tenant_id AND pipeline_id = _pipeline_id AND merge_state = 'active'
  ) THEN
    RAISE EXCEPTION 'crm_pipeline_has_active_leads' USING ERRCODE = '22023';
  END IF;

  UPDATE public.crm_pipelines SET
    ativo = _active,
    row_version = row_version + 1,
    updated_at = now()
  WHERE id = _pipeline_id AND tenant_id = _tenant_id
  RETURNING * INTO v_pipeline;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.pipeline_state_changed',
    'crm_pipeline',
    _pipeline_id,
    to_jsonb(v_pipeline)
  );
  v_result := jsonb_build_object(
    'ok', true,
    'id', _pipeline_id,
    'active', v_pipeline.ativo,
    'version', v_pipeline.row_version
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'pipeline_state',
    _pipeline_id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.create_tenant_crm_tag(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _tag_key text,
  _nome text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
  v_tag public.crm_tags%ROWTYPE;
  v_hash text;
  v_previous jsonb;
  v_result jsonb;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'gerenciar'
  );
  IF v_scope <> 'global' THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  IF _tag_key !~ '^[a-z0-9_]+$'
     OR char_length(_tag_key) > 80
     OR char_length(btrim(COALESCE(_nome,''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'crm_tag_invalid' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(jsonb_build_object(
    'tag_key', _tag_key,
    'nome', _nome
  )::text, 'sha256'), 'hex');
  v_previous := public.crm_idempotent_response(
    _tenant_id, _actor_user_id, _idempotency_key, 'create_tag', v_hash
  );
  IF v_previous IS NOT NULL THEN
    RETURN v_previous;
  END IF;

  INSERT INTO public.crm_tags (tenant_id, tag_key, nome)
  VALUES (_tenant_id, _tag_key, btrim(_nome))
  RETURNING * INTO v_tag;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, after
  ) VALUES (
    _tenant_id,
    _actor_user_id,
    'crm.tag_created',
    'crm_tag',
    v_tag.id,
    to_jsonb(v_tag)
  );
  v_result := jsonb_build_object(
    'ok', true,
    'id', v_tag.id,
    'tagKey', v_tag.tag_key,
    'name', v_tag.nome
  );
  INSERT INTO public.crm_idempotency (
    tenant_id, actor_user_id, idempotency_key, operation,
    resource_id, request_hash, response, created_at
  ) VALUES (
    _tenant_id, _actor_user_id, _idempotency_key, 'create_tag',
    v_tag.id, v_hash, v_result, now()
  );
  RETURN v_result;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_tenant_crm_diagnostics(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_scope text;
BEGIN
  v_scope := public.crm_resolve_scope(
    _actor_user_id, _tenant_id, _tenant_origin, 'gerenciar'
  );
  IF v_scope <> 'global' THEN
    RAISE EXCEPTION 'crm_scope_denied' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'tenantId', _tenant_id,
    'scope', v_scope,
    'schemaVersion', 1,
    'pipelines', (
      SELECT count(*) FROM public.crm_pipelines WHERE tenant_id = _tenant_id
    ),
    'activePipelines', (
      SELECT count(*) FROM public.crm_pipelines
      WHERE tenant_id = _tenant_id AND ativo = true
    ),
    'defaultPipelines', (
      SELECT count(*) FROM public.crm_pipelines
      WHERE tenant_id = _tenant_id AND is_default = true AND ativo = true
    ),
    'stages', (
      SELECT count(*) FROM public.crm_pipeline_stages WHERE tenant_id = _tenant_id
    ),
    'leads', (
      SELECT count(*) FROM public.leads
      WHERE tenant_id = _tenant_id AND merge_state = 'active'
    ),
    'leadsWithoutPipeline', (
      SELECT count(*) FROM public.leads
      WHERE tenant_id = _tenant_id AND (pipeline_id IS NULL OR stage_id IS NULL)
    ),
    'openTasks', (
      SELECT count(*) FROM public.crm_lead_tasks
      WHERE tenant_id = _tenant_id AND status IN ('open','in_progress')
    ),
    'overdueTasks', (
      SELECT count(*) FROM public.crm_lead_tasks
      WHERE tenant_id = _tenant_id
        AND status IN ('open','in_progress')
        AND due_at < now()
    ),
    'events', (
      SELECT count(*) FROM public.crm_lead_events WHERE tenant_id = _tenant_id
    ),
    'tags', (
      SELECT count(*) FROM public.crm_tags
      WHERE tenant_id = _tenant_id AND ativo = true
    ),
    'automaticMerge', false,
    'mergeContract', 'review_required',
    'contactsDomain', 'absent_not_invented',
    'opportunitiesDomain', 'absent_not_invented',
    'externalProviderExecution', false
  );
END;
$fn$;

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.crm_pipelines,
  public.crm_pipeline_stages,
  public.crm_lead_events,
  public.crm_lead_assignments,
  public.crm_lead_tasks,
  public.crm_tags,
  public.crm_lead_tags,
  public.crm_idempotency
FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE
  public.crm_pipelines,
  public.crm_pipeline_stages,
  public.crm_lead_events,
  public.crm_lead_assignments,
  public.crm_lead_tasks,
  public.crm_tags,
  public.crm_lead_tags,
  public.crm_idempotency
TO service_role;

REVOKE ALL ON FUNCTION public.crm_bind_lead_pipeline() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_resolve_scope(uuid,uuid,text,public.rbac_action) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_scope_allows_lead(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_scope_allows_user_target(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_scope_allows_team_target(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_idempotent_response(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_tenant_crm_leads(uuid,uuid,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_tenant_crm_lead_aggregate(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_tenant_crm_lead(uuid,uuid,text,uuid,bigint,jsonb,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_tenant_crm_lead(uuid,uuid,text,uuid,text,bigint,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_tenant_crm_lead(uuid,uuid,text,uuid,bigint,text,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_crm_task(uuid,uuid,text,uuid,text,text,text,timestamptz,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_tenant_crm_task(uuid,uuid,text,uuid,text,bigint,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_tenant_crm_note(uuid,uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_crm_tags(uuid,uuid,text,uuid,uuid[],bigint,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_tenant_crm_duplicates(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_crm_pipeline_state(uuid,uuid,text,uuid,bigint,boolean,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_crm_tag(uuid,uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_tenant_crm_diagnostics(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.crm_bind_lead_pipeline() TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_resolve_scope(uuid,uuid,text,public.rbac_action) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_scope_allows_lead(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_scope_allows_user_target(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_scope_allows_team_target(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_idempotent_response(uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_tenant_crm_leads(uuid,uuid,text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_crm_lead_aggregate(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_tenant_crm_lead(uuid,uuid,text,uuid,bigint,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_tenant_crm_lead(uuid,uuid,text,uuid,text,bigint,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_tenant_crm_lead(uuid,uuid,text,uuid,bigint,text,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_crm_task(uuid,uuid,text,uuid,text,text,text,timestamptz,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_tenant_crm_task(uuid,uuid,text,uuid,text,bigint,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_tenant_crm_note(uuid,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_crm_tags(uuid,uuid,text,uuid,uuid[],bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.find_tenant_crm_duplicates(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_crm_pipeline_state(uuid,uuid,text,uuid,bigint,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_crm_tag(uuid,uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tenant_crm_diagnostics(uuid,uuid,text) TO service_role;

-- Active administrative transition path is now service-role-only. PTW-01 public
-- lead creation remains untouched. The deterministic BEFORE INSERT trigger binds
-- every new PTW-01 lead to the unique explicit default pipeline and matching stage.
REVOKE EXECUTE ON FUNCTION public.transition_lead_status(uuid,text,bigint,uuid,jsonb)
FROM authenticated;

COMMIT;
