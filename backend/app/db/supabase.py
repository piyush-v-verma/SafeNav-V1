import logging
from typing import Optional
from supabase import Client, ClientOptions, create_client
from app.core.config import settings

logger = logging.getLogger("safenav.supabase")

_supabase_client: Optional[Client] = None
_auth_email_lookup_client: Optional[Client] = None

AUTH_EMAIL_LOOKUP_TIMEOUT_SECONDS = 5

def get_supabase_client() -> Optional[Client]:
    """
    Returns the initialized Supabase client singleton using the service-role key.
    Returns None if credentials have not yet been provided in .env.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase URL or Service Key not configured in .env. Database operations will be mocked or unavailable.")
        return None

    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def get_auth_email_lookup_client() -> Optional[Client]:
    """Return a server-only RPC client with a short PostgREST timeout."""
    global _auth_email_lookup_client
    if _auth_email_lookup_client is not None:
        return _auth_email_lookup_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None

    try:
        _auth_email_lookup_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
            options=ClientOptions(
                auto_refresh_token=False,
                persist_session=False,
                postgrest_client_timeout=AUTH_EMAIL_LOOKUP_TIMEOUT_SECONDS,
            ),
        )
        return _auth_email_lookup_client
    except Exception as exc:
        # Do not include the exception text: client errors can contain request details.
        logger.error("Failed to initialize auth email lookup client (%s)", type(exc).__name__)
        return None
