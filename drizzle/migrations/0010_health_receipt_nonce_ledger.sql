CREATE TABLE public.health_receipt_nonces (
  principal text NOT NULL,
  nonce_hash text NOT NULL CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (principal, nonce_hash)
);
GRANT ALL ON public.health_receipt_nonces TO service_role;
REVOKE ALL ON public.health_receipt_nonces FROM anon, authenticated;
ALTER TABLE public.health_receipt_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipt_service_only ON public.health_receipt_nonces FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE FUNCTION public.reserve_health_receipt_nonce(p_principal text, p_nonce_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE inserted integer;
BEGIN
  IF p_principal NOT LIKE 'key:%' OR p_nonce_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid receipt nonce context';
  END IF;
  DELETE FROM public.health_receipt_nonces WHERE retain_until <= now();
  INSERT INTO public.health_receipt_nonces (principal, nonce_hash)
  VALUES (p_principal, p_nonce_hash) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_health_receipt_nonce(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_health_receipt_nonce(text, text) TO service_role;