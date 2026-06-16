ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS tour_url text;
COMMENT ON COLUMN public.imoveis.video_url IS 'URL de vídeo (YouTube/Vimeo) — embed na ficha do imóvel';
COMMENT ON COLUMN public.imoveis.tour_url IS 'URL de tour virtual 360° (Matterport/Kuula/etc) — embed iframe';