ALTER TABLE public.commercial_entitlement_definitions
  DROP CONSTRAINT IF EXISTS commercial_entitlement_definitions_key_format_chk;

ALTER TABLE public.commercial_entitlement_definitions
  ADD CONSTRAINT commercial_entitlement_definitions_key_format_chk
    CHECK (key ~ '^[a-z][a-z0-9_.]*$');

INSERT INTO public.commercial_entitlement_definitions
  (key, name, description, value_type, unit, is_active)
VALUES
  ('users.seats', 'Seat limit', 'Maximum number of seats a tenant may occupy.', 'integer', 'seats', TRUE)
ON CONFLICT (key) DO NOTHING;