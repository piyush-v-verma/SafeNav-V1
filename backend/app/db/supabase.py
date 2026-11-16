import logging
from typing import Optional
from supabase import Client, create_client
from app.core.config import settings

logger = logging.getLogger("safenav.supabase")

_supabase_client: Optional[Client] = None

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
