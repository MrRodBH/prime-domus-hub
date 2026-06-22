
ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS rua text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cep text;

-- Migra o conteúdo legado de "endereco" para "rua"
UPDATE public.imoveis SET rua = endereco WHERE rua IS NULL AND endereco IS NOT NULL;
