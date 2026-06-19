ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS mostrar_rua boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mostrar_endereco_completo boolean NOT NULL DEFAULT false;