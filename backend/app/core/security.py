import logging
from typing import Any, Dict, Optional
import jwt
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("safenav.security")

def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase JWT.
    Supports HS256 (standard Supabase JWT Secret).
    """
    if not settings.SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET is not configured in backend .env")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication configuration missing on server."
        )

    try:
        # Decode using the project's JWT Secret
        # Supabase access tokens use HS256 with aud='authenticated'
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase tokens may have varying aud depending on provider
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again."
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials."
        )
