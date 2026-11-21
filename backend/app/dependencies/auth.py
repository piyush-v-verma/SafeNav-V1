import logging
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_supabase_jwt
from app.db.supabase import get_supabase_client

logger = logging.getLogger("safenav.dependencies.auth")

security_bearer = HTTPBearer(auto_error=True)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_bearer)
) -> Dict[str, Any]:
    """
    Extracts Bearer token, verifies JWT, and fetches the user profile from Supabase PostgreSQL.
    """
    token = credentials.credentials
    payload = decode_supabase_jwt(token)
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject identifier ('sub')."
        )

    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication profile service is unavailable.",
        )

    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database."
            )
        profile = response.data
        profile["email"] = payload.get("email", "")
        return profile
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        if getattr(e, "code", None) == "PGRST116":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database.",
            )
        logger.error("Could not verify authenticated profile (%s)", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify user profile.",
        )

async def require_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verifies that the user profile has an active account status.
    Suspended users are blocked with HTTP 403.
    """
    account_status = current_user.get("account_status")
    if account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact SafeNav administration."
        )
    return current_user

async def require_admin(
    current_user: Dict[str, Any] = Depends(require_active_user)
) -> Dict[str, Any]:
    """
    Enforces that the current authenticated user has an 'admin' role.
    """
    role = current_user.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource."
        )
    return current_user
