-- Opt-in paid launch alerts for books; the platform keeps payment live mode disabled.
ALTER TABLE public.deela_books_settings
  ADD COLUMN IF NOT EXISTS enable_launch_alerts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_alert_price_sar numeric(10,2) NOT NULL DEFAULT 0
    CHECK (launch_alert_price_sar >= 0 AND launch_alert_price_sar <= 10000);

CREATE TABLE IF NOT EXISTS public.deela_books_launch_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.deela_books_sellers(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.deela_books_listings(id) ON DELETE CASCADE,
  amount_sar numeric(10,2) NOT NULL CHECK (amount_sar > 0 AND amount_sar <= 10000),
  payment_reference text NOT NULL CHECK (length(payment_reference) BETWEEN 3 AND 160),
  status text NOT NULL DEFAULT 'payment_review'
    CHECK (status IN ('payment_review','published','rejected')),
  payment_confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_confirmed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deela_books_launch_alerts_status_idx
  ON public.deela_books_launch_alerts (status,created_at DESC);
CREATE INDEX IF NOT EXISTS deela_books_launch_alerts_feed_idx
  ON public.deela_books_launch_alerts (published_at DESC) WHERE status='published';
ALTER TABLE public.deela_books_launch_alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.deela_books_launch_alerts TO service_role;
