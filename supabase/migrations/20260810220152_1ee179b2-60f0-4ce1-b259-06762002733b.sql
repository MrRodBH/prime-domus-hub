CREATE TABLE public.spr02_managed_secret_ceremonies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ceremony_id text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'executing' CHECK (state IN ('executing','reconciling','completed','failed')),
  expected_git_head text NOT NULL,
  expected_worker_id text NOT NULL,
  expected_source_version_id text,
  expected_source_digest text,
  canary_version_id text,
  final_version_id text,
  classification text,
  annotation text,
  lease_started_at timestamp with time zone NOT NULL DEFAULT now(),
  lease_expires_at timestamp with time zone NOT NULL DEFAULT now() + interval '15 minutes',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM PUBLIC;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM anon;
REVOKE ALL ON public.spr02_managed_secret_ceremonies FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spr02_managed_secret_ceremonies TO service_role;

ALTER TABLE public.spr02_managed_secret_ceremonies ENABLE ROW LEVEL SECURITY;