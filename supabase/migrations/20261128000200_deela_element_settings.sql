ALTER TABLE public.deela_books_settings
  ADD COLUMN IF NOT EXISTS theme_element_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.deela_books_settings.theme_element_settings
  IS 'Owner-only visual and content settings keyed by stable storefront component identifiers.';
