ALTER TABLE public.imoveis ADD COLUMN IF NOT EXISTS campanha boolean NOT NULL DEFAULT false;
CREATE TABLE public.tenant_social_campaigns (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), imovel_id uuid NOT NULL REFERENCES public.imoveis(id), codigo text NOT NULL DEFAULT ('CMP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))), destino text NOT NULL CHECK(destino IN ('instagram','facebook','google','tiktok','linkedin')), formato text NOT NULL, fotos text[] NOT NULL DEFAULT '{}', prompt text, finalidade text NOT NULL DEFAULT 'anuncio_pago' CHECK(finalidade IN ('anuncio_pago','post_organico')), roteiro jsonb NOT NULL DEFAULT '[]', roteiro_aprovado boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','aprovada')), copy_principal text, legenda text, cta text, hashtags text, video_url text, video_origem text, video_mime text, video_ia_job text, revision integer NOT NULL DEFAULT 1, criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(), aprovada_em timestamptz, UNIQUE(tenant_id,codigo), UNIQUE(tenant_id,id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_social_campaigns TO authenticated;
GRANT ALL ON public.tenant_social_campaigns TO service_role;
ALTER TABLE public.tenant_social_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_campaign_tenant_access ON public.tenant_social_campaigns FOR ALL TO authenticated USING (public.is_active_tenant_admin(tenant_id)) WITH CHECK(public.is_active_tenant_admin(tenant_id));
CREATE POLICY social_campaign_tenant_isolation ON public.tenant_social_campaigns AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.get_current_tenant_id()) WITH CHECK(tenant_id = public.get_current_tenant_id());
CREATE TABLE public.tenant_social_campaign_creatives (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), campanha_id uuid NOT NULL, ordem integer NOT NULL CHECK(ordem >= 0 AND ordem < 10), caminho text NOT NULL, largura integer NOT NULL, altura integer NOT NULL, foto_origem text NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,campanha_id,ordem), FOREIGN KEY(tenant_id,campanha_id) REFERENCES public.tenant_social_campaigns(tenant_id,id) ON DELETE CASCADE);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_social_campaign_creatives TO authenticated;
GRANT ALL ON public.tenant_social_campaign_creatives TO service_role;
ALTER TABLE public.tenant_social_campaign_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_creative_tenant_access ON public.tenant_social_campaign_creatives FOR ALL TO authenticated USING(public.is_active_tenant_admin(tenant_id)) WITH CHECK(public.is_active_tenant_admin(tenant_id));
CREATE POLICY social_creative_tenant_isolation ON public.tenant_social_campaign_creatives AS RESTRICTIVE FOR ALL TO authenticated USING(tenant_id=public.get_current_tenant_id()) WITH CHECK(tenant_id=public.get_current_tenant_id());
CREATE FUNCTION public.guard_tenant_social_campaign() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE p public.imoveis; lim integer;
BEGIN
SELECT * INTO p FROM public.imoveis WHERE id=NEW.imovel_id AND tenant_id=NEW.tenant_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Imóvel fora da empresa.'; END IF;
IF TG_OP='UPDATE' AND (NEW.tenant_id<>OLD.tenant_id OR NEW.imovel_id<>OLD.imovel_id) THEN RAISE EXCEPTION 'Referência da campanha não pode mudar.'; END IF;
IF current_user <> 'postgres' AND (p.status::text<>'ativo' OR NOT p.campanha) THEN RAISE EXCEPTION 'Imóvel vendido, inativo ou indisponível para campanha.'; END IF;
IF NOT ((NEW.destino IN ('instagram','facebook') AND NEW.formato IN ('feed_1x1','feed_4x5','carrossel','stories','reels')) OR (NEW.destino='tiktok' AND NEW.formato='video_9x16') OR (NEW.destino='linkedin' AND NEW.formato IN ('feed_1x1','feed_191x1','carrossel')) OR (NEW.destino='google' AND NEW.formato IN ('display_1x1','display_191x1','display_4x5'))) THEN RAISE EXCEPTION 'Formato inválido para o destino.'; END IF;
lim := CASE WHEN NEW.formato IN ('carrossel','reels','video_9x16') THEN 10 ELSE 1 END;
IF cardinality(NEW.fotos)<1 OR cardinality(NEW.fotos)>lim OR cardinality(NEW.fotos)<>(SELECT count(DISTINCT f) FROM unnest(NEW.fotos) f) THEN RAISE EXCEPTION 'Quantidade de fotos inválida.'; END IF;
IF EXISTS(SELECT 1 FROM unnest(NEW.fotos) f WHERE NOT EXISTS(SELECT 1 FROM public.imovel_imagens i WHERE i.tenant_id=NEW.tenant_id AND i.imovel_id=NEW.imovel_id AND i.url=f)) THEN RAISE EXCEPTION 'Foto não pertence ao imóvel.'; END IF;
IF TG_OP='UPDATE' THEN
IF NEW.formato<>OLD.formato OR NEW.destino<>OLD.destino OR NEW.fotos<>OLD.fotos THEN NEW.roteiro:='[]'; NEW.roteiro_aprovado:=false; NEW.status:='rascunho'; NEW.aprovada_em:=NULL; END IF;
IF NEW.roteiro<>OLD.roteiro AND NEW.status='aprovada' THEN NEW.status:='rascunho'; NEW.aprovada_em:=NULL; END IF;
NEW.revision:=OLD.revision+1;
END IF;
IF NEW.roteiro_aprovado AND (jsonb_array_length(NEW.roteiro)<>cardinality(NEW.fotos) OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.roteiro) r WHERE length(trim(r->>'texto'))=0 OR length(r->>'texto')>90)) THEN RAISE EXCEPTION 'Revise todos os textos do roteiro.'; END IF;
IF NEW.status='aprovada' THEN
IF (SELECT count(*) FROM public.tenant_social_campaign_creatives c WHERE c.tenant_id=NEW.tenant_id AND c.campanha_id=NEW.id AND c.foto_origem=NEW.fotos[c.ordem+1])<>cardinality(NEW.fotos) THEN RAISE EXCEPTION 'Gere todos os criativos antes de aprovar.'; END IF;
IF NEW.formato='carrossel' AND cardinality(NEW.fotos)>1 AND NOT NEW.roteiro_aprovado THEN RAISE EXCEPTION 'Revise o roteiro antes de aprovar.'; END IF;
IF NEW.formato IN ('reels','video_9x16') AND NEW.video_url IS NULL THEN RAISE EXCEPTION 'Adicione o vídeo antes de aprovar.'; END IF;
NEW.aprovada_em:=now();
END IF;
NEW.atualizado_em:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_tenant_social_campaign() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tenant_social_campaign_guard BEFORE INSERT OR UPDATE ON public.tenant_social_campaigns FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_social_campaign();