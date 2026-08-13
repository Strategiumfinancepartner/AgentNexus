GRANT SELECT ON public.entries TO anon;

CREATE POLICY "Anyone can read approved entries"
ON public.entries
FOR SELECT
TO anon
USING (status = 'approved');