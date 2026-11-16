import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, require_active_user
from app.db.supabase import get_supabase_client

logger = logging.getLogger("safenav.api.auth")

router = APIRouter(prefix="/auth", tags=["User Authentication & Profile"])

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    mobile_number: Optional[str] = Field(None, min_length=8, max_length=20)


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
