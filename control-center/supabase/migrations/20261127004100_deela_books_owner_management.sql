-- DEELA Books owner-only merchandising and payment test settings.
-- All writes remain behind the service-role Edge Function and owner-role check.
ALTER TABLE public.deela_books_settings
  ADD COLUMN IF NOT EXISTS payment_test_config jsonb NOT NULL DEFAULT
    '{"mode":"test","live_enabled":false,"provider":"","tax_percent":0,"refund_window_days":7,"discounts_enabled":false}'::jsonb;

CREATE TABLE IF NOT EXISTS public.deela_books_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 450),
  kind text NOT NULL DEFAULT 'category' CHECK (kind IN ('category','promo')),
  category text NOT NULL DEFAULT '' CHECK (length(category) <= 80),
  image_path text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT 'none' CHECK (material IN ('none','ceramic','marble','ornament','pearl','metal','velvet','neon','heritage')),
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order BETWEEN 1 AND 9999),
  visible boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deela_books_sections_order_idx
  ON public.deela_books_sections (visible, sort_order, created_at);
ALTER TABLE public.deela_books_sections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.deela_books_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  image_path text NOT NULL,
  target_url text NOT NULL DEFAULT '' CHECK (length(target_url) <= 500),
  motion text NOT NULL DEFAULT 'none' CHECK (motion IN ('none','glow','slide')),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order BETWEEN 1 AND 9999),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS deela_books_banners_schedule_idx
  ON public.deela_books_banners (active, starts_at, ends_at, sort_order);
ALTER TABLE public.deela_books_banners ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.deela_books_user_controls (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deela_books_user_controls ENABLE ROW LEVEL SECURITY;
