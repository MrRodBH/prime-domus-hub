-- UTM/attribution columns + normalize legacy origens to match registered nomes
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_url text;

-- Normaliza origens antigas para os nomes cadastrados em lead_origens
UPDATE public.leads SET origem = 'Site'
  WHERE origem IS NULL OR origem = '' OR origem ILIKE 'site' OR origem ILIKE 'ficha-imovel';
UPDATE public.leads SET origem = 'Site' WHERE origem ILIKE 'lancamento%';
UPDATE public.leads SET origem = 'WhatsApp' WHERE origem ILIKE 'whatsapp%';
UPDATE public.leads SET origem = 'Cadastro Manual' WHERE origem ILIKE 'cadastro%manual' OR origem ILIKE 'manual';