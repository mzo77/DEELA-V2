-- Seller-selected category placement, daily unique view counts, and in-app seller notifications.
ALTER TABLE public.deela_books_listings
  ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0);

CREATE TABLE IF NOT EXISTS public.deela_books_listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.deela_books_listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT (timezone('utc',now())::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id,user_id,view_date)
);
CREATE INDEX IF NOT EXISTS deela_books_listing_views_date_idx
  ON public.deela_books_listing_views (view_date,listing_id);
ALTER TABLE public.deela_books_listing_views ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.deela_books_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.deela_books_listings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('like','view_milestone','section_moved')),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deela_books_notifications_user_idx
  ON public.deela_books_notifications (user_id,created_at DESC);
ALTER TABLE public.deela_books_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.deela_books_increment_view_count()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  UPDATE public.deela_books_listings
     SET view_count=view_count+1
   WHERE id=NEW.listing_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.deela_books_increment_view_count() FROM PUBLIC;
DROP TRIGGER IF EXISTS deela_books_listing_view_count_trigger ON public.deela_books_listing_views;
CREATE TRIGGER deela_books_listing_view_count_trigger
  AFTER INSERT ON public.deela_books_listing_views
  FOR EACH ROW EXECUTE FUNCTION public.deela_books_increment_view_count();
