-- Narrow Auth email lookup for the server-side login pre-check.
-- This function intentionally returns no user identifier or profile data.
CREATE OR REPLACE FUNCTION public.safenav_auth_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
    SELECT CASE
        WHEN p_email IS NULL OR pg_catalog.btrim(p_email) = '' THEN false
        ELSE EXISTS (
            SELECT 1
            FROM auth.users AS auth_user
            WHERE pg_catalog.lower(pg_catalog.btrim(auth_user.email::text)) =
                  pg_catalog.lower(pg_catalog.btrim(p_email))
        )
    END;
$function$;

REVOKE ALL PRIVILEGES
ON FUNCTION public.safenav_auth_email_exists(text)
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON FUNCTION public.safenav_auth_email_exists(text)
FROM anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.safenav_auth_email_exists(text)
TO service_role;

COMMENT ON FUNCTION public.safenav_auth_email_exists(text) IS
    'Returns only whether a normalized email exists in Supabase Auth; executable only by service_role.';
