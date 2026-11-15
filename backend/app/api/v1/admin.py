import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.dependencies.auth import require_admin
from backend.app.db.supabase import get_supabase_client

logger = logging.getLogger("safenav.api.admin")

router = APIRouter(prefix="/admin", tags=["Admin Portal Management"])

class StatusUpdateRequest(BaseModel):
    account_status: str = Field(..., pattern="^(active|suspended)$")


@router.get("/dashboard")
async def get_admin_dashboard(
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Returns administrative overview metrics for the desktop console:
    user statistics, reports counts, and platform status.
    """
    supabase = get_supabase_client()
    if not supabase:
        # Mock summary for development
        return {
            "status": "success",
            "data": {
                "total_users": 1,
                "active_users": 1,
                "suspended_users": 0,
                "total_reports": 0,
                "pending_reports": 0,
                "verified_reports": 0,
                "admin_name": admin_user.get("full_name", "Administrator"),
            }
        }

    try:
        users_resp = supabase.table("profiles").select("id, account_status", count="exact").execute()
        total_users = users_resp.count or 0
        active_count = sum(1 for u in (users_resp.data or []) if u.get("account_status") == "active")
        suspended_count = total_users - active_count

        return {
            "status": "success",
            "data": {
                "total_users": total_users,
                "active_users": active_count,
                "suspended_users": suspended_count,
                "total_reports": 0,  # Reports table will be connected in future report phase
                "pending_reports": 0,
                "verified_reports": 0,
                "admin_name": admin_user.get("full_name", "Administrator"),
            }
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve administrative statistics."
        )


@router.get("/users")
async def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    role: Optional[str] = Query(None, pattern="^(user|admin)$"),
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Lists citizen and admin accounts with account status and timestamps.
    """
    supabase = get_supabase_client()
    if not supabase:
        return {
            "status": "success",
            "count": 1,
            "data": [admin_user]
        }

    try:
        query = supabase.table("profiles").select("*", count="exact").order("created_at", desc=True)
        if role:
            query = query.eq("role", role)
        response = query.range(offset, offset + limit - 1).execute()

        return {
            "status": "success",
            "count": response.count,
            "data": response.data or []
        }
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users."
        )


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    body: StatusUpdateRequest,
    admin_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """
    Changes a citizen account's status between 'active' and 'suspended'.
    """
    if user_id == admin_user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot suspend their own account."
        )

    supabase = get_supabase_client()
    if not supabase:
        return {
            "status": "success",
            "message": f"User {user_id} status updated to {body.account_status} (mock mode)"
        }

    try:
        response = supabase.table("profiles").update({"account_status": body.account_status}).eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        logger.info(f"Admin {admin_user.get('id')} changed user {user_id} status to {body.account_status}")
        return {
            "status": "success",
            "message": f"User status successfully updated to {body.account_status}",
            "data": response.data[0]
        }
    except Exception as e:
        logger.error(f"Failed to update user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user account status."
        )
