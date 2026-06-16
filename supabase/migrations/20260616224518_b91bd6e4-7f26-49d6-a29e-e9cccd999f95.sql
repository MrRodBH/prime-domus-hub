DROP POLICY IF EXISTS "imoveis storage public read" ON storage.objects;
DROP POLICY IF EXISTS "site storage public read" ON storage.objects;

CREATE POLICY "imoveis storage admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'imoveis' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site storage admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));