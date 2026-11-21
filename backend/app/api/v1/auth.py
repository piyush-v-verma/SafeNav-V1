import logging
import re
import threading
import time
from typing import Any, Dict, Optional, Union

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError as PostgrestAPIError
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, require_active_user
from app.db.supabase import get_auth_email_lookup_client, get_supabase_client

logger = logging.getLogger("safenav.api.auth")

router = APIRouter(prefix="/auth", tags=["User Authentication & Profile"])

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    mobile_number: Optional[str] = Field(None, min_length=8, max_length=20)


class EmailRegistrationCheckRequest(BaseModel):
    # Runtime validation is performed below so every invalid body gets our safe
    # VALIDATION_ERROR contract rather than Pydantic's detailed validation output.
    email: Any = Field(
        ...,
        description="Email address to check.",
        json_schema_extra={"type": "string", "format": "email", "maxLength": 254},
    )


class EmailRegistrationCheckResponse(BaseModel):
    success: bool
    registered: bool


class APIErrorDetails(BaseModel):
    code: str
    message: str


class APIErrorResponse(BaseModel):
    success: bool = False
    error: APIErrorDetails


_EMAIL_RE = re.compile(
    r"^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$",
    re.IGNORECASE,
)
_EMAIL_CHECK_LIMIT = 10
_EMAIL_CHECK_WINDOW_SECONDS = 60
_EMAIL_CHECK_MAX_TRACKED_IPS = 4096
_email_check_attempts: dict[str, tuple[float, int]] = {}
_email_check_attempts_lock = threading.Lock()


def _normalize_email(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    if len(normalized) > 254 or not _EMAIL_RE.fullmatch(normalized):
        return None
    local_part = normalized.partition("@")[0]
    if len(local_part) > 64 or ".." in local_part or local_part.startswith(".") or local_part.endswith("."):
        return None
    return normalized


def _email_check_retry_after(client_ip: str) -> Optional[int]:
    """Apply a small process-local fixed-window limit without trusting forwarded headers."""
    now = time.monotonic()
    with _email_check_attempts_lock:
        current = _email_check_attempts.get(client_ip)
        if current is not None and now - current[0] < _EMAIL_CHECK_WINDOW_SECONDS:
            window_start, count = current
            if count >= _EMAIL_CHECK_LIMIT:
                return max(1, int(_EMAIL_CHECK_WINDOW_SECONDS - (now - window_start)))
            _email_check_attempts[client_ip] = (window_start, count + 1)
            return None

        if len(_email_check_attempts) >= _EMAIL_CHECK_MAX_TRACKED_IPS:
            expired = [
                ip for ip, (started, _) in _email_check_attempts.items()
                if now - started >= _EMAIL_CHECK_WINDOW_SECONDS
            ]
            for ip in expired:
                _email_check_attempts.pop(ip, None)
            if len(_email_check_attempts) >= _EMAIL_CHECK_MAX_TRACKED_IPS:
                _email_check_attempts.pop(next(iter(_email_check_attempts)))

        _email_check_attempts[client_ip] = (now, 1)
        return None


def _email_check_error(
    status_code: int,
    code: str,
    message: str,
    headers: Optional[dict[str, str]] = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "error": {"code": code, "message": message}},
        headers=headers,
    )


@router.post(
    "/check-email",
    response_model=EmailRegistrationCheckResponse,
    responses={
        422: {"model": APIErrorResponse},
        429: {"model": APIErrorResponse},
        500: {"model": APIErrorResponse},
        503: {"model": APIErrorResponse},
    },
    summary="Check whether an email exists in Supabase Auth",
    description=(
        "Public pre-authentication check. This intentionally reveals account existence "
        "to support the approved email-first login flow; it returns no user data and "
        "is rate-limited by client IP."
    ),
)
def check_email_registration(
    body: EmailRegistrationCheckRequest,
    request: Request,
) -> Union[EmailRegistrationCheckResponse, JSONResponse]:
    """Expose only an Auth-user existence boolean for the approved login flow."""
    client_ip = request.client.host if request.client else "unknown"
    retry_after = _email_check_retry_after(client_ip)
    if retry_after is not None:
        return _email_check_error(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "RATE_LIMIT_EXCEEDED",
            "Too many email checks. Try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    normalized_email = _normalize_email(body.email)
    if normalized_email is None:
        return _email_check_error(
            422,
            "VALIDATION_ERROR",
            "Enter a valid email address.",
        )

    try:
        supabase = get_auth_email_lookup_client()
        if supabase is None:
            return _email_check_error(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AUTH_SERVICE_UNAVAILABLE",
                "Email verification service is unavailable. Try again later.",
            )
        result = supabase.rpc(
            "safenav_auth_email_exists",
            {"p_email": normalized_email},
        ).execute()
        if not isinstance(result.data, bool):
            logger.error("Auth email lookup RPC returned an unexpected result type")
            return _email_check_error(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "DATABASE_ERROR",
                "Email registration could not be checked. Try again later.",
            )
        return EmailRegistrationCheckResponse(success=True, registered=result.data)
    except (httpx.HTTPError, TimeoutError, ConnectionError) as exc:
        logger.warning("Auth email lookup service transport failure (%s)", type(exc).__name__)
        return _email_check_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "AUTH_SERVICE_UNAVAILABLE",
            "Email verification service is unavailable. Try again later.",
        )
    except PostgrestAPIError as exc:
        if str(exc.code) in {"502", "503", "504"}:
            logger.warning("Auth email lookup service returned HTTP %s", exc.code)
            return _email_check_error(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "AUTH_SERVICE_UNAVAILABLE",
                "Email verification service is unavailable. Try again later.",
            )
        logger.error("Auth email lookup database RPC failed (%s)", str(exc.code or "unknown"))
        return _email_check_error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "DATABASE_ERROR",
            "Email registration could not be checked. Try again later.",
        )
    except Exception as exc:
        logger.error("Unexpected auth email lookup failure (%s)", type(exc).__name__)
        return _email_check_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_SERVER_ERROR",
            "Something went wrong. Try again later.",
        )


@router.get("/me")
async def get_my_profile(
    current_user: Dict[str, Any] = Depends(require_active_user)
) -> Dict[str, Any]:
    """
    Returns the authenticated user's profile and account status.
    """
    return {
        "status": "success",
        "data": {
            "id": current_user.get("id"),
            "email": current_user.get("email"),
            "full_name": current_user.get("full_name"),
            "mobile_number": current_user.get("mobile_number"),
            "role": current_user.get("role", "user"),
            "account_status": current_user.get("account_status", "active"),
            "created_at": current_user.get("created_at"),
            "updated_at": current_user.get("updated_at"),
        }
    }


@router.patch("/profile")
async def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_active_user)
) -> Dict[str, Any]:
    """
    Updates the authenticated citizen's personal profile (full name, mobile number).
    Roles and account statuses cannot be escalated through this endpoint.
    """
    user_id = current_user.get("id")
    update_data = {}
    if body.full_name is not None:
        update_data["full_name"] = body.full_name.strip()
    if body.mobile_number is not None:
        update_data["mobile_number"] = body.mobile_number.strip()

    if not update_data:
        return {"status": "success", "message": "No fields to update", "data": current_user}

    supabase = get_supabase_client()
    if not supabase:
        # Development fallback
        current_user.update(update_data)
        return {"status": "success", "message": "Profile updated (mock mode)", "data": current_user}

    try:
        response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to update user profile."
            )
        updated_profile = response.data[0]
        updated_profile["email"] = current_user.get("email")
        return {
            "status": "success",
            "message": "Profile updated successfully",
            "data": updated_profile
        }
    except Exception as e:
        logger.error(f"Failed to update profile for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating profile in database."
        )
