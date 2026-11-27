ALTER TABLE public.deela_books_contests
  ADD COLUMN IF NOT EXISTS poll_options jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deela_books_contests_poll_options_valid'
      AND conrelid = 'public.deela_books_contests'::regclass
  ) THEN
    ALTER TABLE public.deela_books_contests
      ADD CONSTRAINT deela_books_contests_poll_options_valid
      CHECK (
        jsonb_typeof(poll_options) = 'array'
        AND (
          jsonb_array_length(poll_options) = 0
          OR jsonb_array_length(poll_options) BETWEEN 2 AND 6
        )
      );
  END IF;
END $$;
