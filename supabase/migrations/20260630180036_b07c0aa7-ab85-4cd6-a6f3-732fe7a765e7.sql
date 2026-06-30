ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS valor_estimado numeric;
COMMENT ON COLUMN public.leads.valor_estimado IS 'Valor estimado do negócio (proposta/venda) para cálculo de VGV';

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_corretor_id ON public.leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_origem ON public.leads(origem);
CREATE INDEX IF NOT EXISTS idx_lead_atividades_lead_created ON public.lead_atividades(lead_id, created_at DESC);