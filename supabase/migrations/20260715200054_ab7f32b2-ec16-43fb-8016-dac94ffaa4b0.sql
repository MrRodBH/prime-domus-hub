-- PR-M1 § 3.2 — Remove direct INSERT grant on lead_stage_history from service_role.
-- The RPC transition_lead_status (SECURITY DEFINER) is the only authorized writer.
-- No caller inserts directly; keeping the grant would violate least-privilege.

REVOKE INSERT ON public.lead_stage_history FROM service_role;
REVOKE SELECT ON public.lead_stage_history FROM service_role;

-- Retain SELECT for authenticated (subject to RLS); no direct write privileges.
-- RPC remains sole INSERT authority via SECURITY DEFINER.