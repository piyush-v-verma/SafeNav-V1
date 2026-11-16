from fastapi import APIRouter
from app.api.v1.navigation import router as navigation_router
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.reports import router as reports_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(navigation_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(reports_router)

# Legacy /api compatibility router for existing frontend integration
api_legacy_router = APIRouter(prefix="/api")
api_legacy_router.include_router(navigation_router)
api_legacy_router.include_router(reports_router)
