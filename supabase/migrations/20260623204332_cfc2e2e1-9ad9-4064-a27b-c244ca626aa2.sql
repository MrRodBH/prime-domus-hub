
-- Permite que instagram_posts referenciem um lançamento, além de imóvel.
ALTER TABLE public.instagram_posts ALTER COLUMN imovel_id DROP NOT NULL;
ALTER TABLE public.instagram_posts ADD COLUMN IF NOT EXISTS launch_project_id uuid REFERENCES public.launch_projects(id) ON DELETE CASCADE;
ALTER TABLE public.instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_target_check;
ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_target_check
  CHECK ((imovel_id IS NOT NULL)::int + (launch_project_id IS NOT NULL)::int = 1);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_launch ON public.instagram_posts(launch_project_id);
