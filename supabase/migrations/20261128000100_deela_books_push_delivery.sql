-- Deliver newly-created DEELA notifications to subscribed browsers.
-- The push trigger secret and VAPID private key remain in Supabase Vault.
CREATE OR REPLACE FUNCTION public.deela_books_deliver_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  push_trigger text;
BEGIN
  SELECT decrypted_secret
    INTO push_trigger
    FROM vault.decrypted_secrets
   WHERE name = 'deela_books_push_trigger_secret'
   LIMIT 1;

  IF coalesce(push_trigger, '') = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://rxlynynjetajtsqlhkrq.supabase.co/functions/v1/deela-books/push/send',
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.body,
      'notification_id', NEW.id::text
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-deela-push-secret', push_trigger
    ),
    timeout_milliseconds := 3000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'DEELA push notification enqueue failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS deela_books_notification_push ON public.deela_books_notifications;
CREATE TRIGGER deela_books_notification_push
AFTER INSERT ON public.deela_books_notifications
FOR EACH ROW
EXECUTE FUNCTION public.deela_books_deliver_push_notification();
