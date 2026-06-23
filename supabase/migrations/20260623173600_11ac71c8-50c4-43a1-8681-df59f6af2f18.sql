-- Storage policies on imoveis bucket for corretores (own imovel folders only)
CREATE POLICY "imoveis storage corretor read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'imoveis'
  AND public.has_role(auth.uid(), 'corretor')
  AND EXISTS (
    SELECT 1 FROM public.imoveis i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.created_by = auth.uid()
  )
);

CREATE POLICY "imoveis storage corretor insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'imoveis'
  AND public.has_role(auth.uid(), 'corretor')
  AND EXISTS (
    SELECT 1 FROM public.imoveis i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.created_by = auth.uid()
  )
);

CREATE POLICY "imoveis storage corretor update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'imoveis'
  AND public.has_role(auth.uid(), 'corretor')
  AND EXISTS (
    SELECT 1 FROM public.imoveis i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.created_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'imoveis'
  AND public.has_role(auth.uid(), 'corretor')
  AND EXISTS (
    SELECT 1 FROM public.imoveis i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.created_by = auth.uid()
  )
);

CREATE POLICY "imoveis storage corretor delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'imoveis'
  AND public.has_role(auth.uid(), 'corretor')
  AND EXISTS (
    SELECT 1 FROM public.imoveis i
    WHERE i.id::text = (storage.foldername(name))[1]
      AND i.created_by = auth.uid()
  )
);