ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS launch_project_id uuid REFERENCES public.launch_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_launch_project_id ON public.leads(launch_project_id);