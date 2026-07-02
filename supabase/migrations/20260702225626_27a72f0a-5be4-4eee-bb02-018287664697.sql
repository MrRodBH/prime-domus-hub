
BEGIN;

ALTER TABLE public.lead_atividades  DISABLE TRIGGER lead_atividades_no_delete;
ALTER TABLE public.lead_descartes   DISABLE TRIGGER lead_descartes_no_delete;
ALTER TABLE public.lead_perdas      DISABLE TRIGGER trg_lead_perdas_no_delete;
ALTER TABLE public.portal_sync_logs DISABLE TRIGGER portal_sync_logs_no_delete;
ALTER TABLE public.system_events    DISABLE TRIGGER tg_system_events_no_delete;
ALTER TABLE public.portal_sync_dlq  DISABLE TRIGGER trg_psdlq_block_delete;

DELETE FROM public.lead_atividades;
DELETE FROM public.lead_descartes;
DELETE FROM public.lead_perdas;
DELETE FROM public.form_submissions;
DELETE FROM public.portal_sync_logs;
DELETE FROM public.portal_sync_dlq;
DELETE FROM public.leads;
DELETE FROM public.system_events;
DELETE FROM public.email_send_log;

ALTER TABLE public.lead_atividades  ENABLE TRIGGER lead_atividades_no_delete;
ALTER TABLE public.lead_descartes   ENABLE TRIGGER lead_descartes_no_delete;
ALTER TABLE public.lead_perdas      ENABLE TRIGGER trg_lead_perdas_no_delete;
ALTER TABLE public.portal_sync_logs ENABLE TRIGGER portal_sync_logs_no_delete;
ALTER TABLE public.system_events    ENABLE TRIGGER tg_system_events_no_delete;
ALTER TABLE public.portal_sync_dlq  ENABLE TRIGGER trg_psdlq_block_delete;

COMMIT;
