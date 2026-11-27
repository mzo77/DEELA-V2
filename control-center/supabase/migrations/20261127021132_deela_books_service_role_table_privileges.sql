grant select, insert, update, delete
on table public.deela_books_sections,
          public.deela_books_banners,
          public.deela_books_listing_views,
          public.deela_books_notifications,
          public.deela_books_user_controls
to service_role;

notify pgrst, 'reload schema';
