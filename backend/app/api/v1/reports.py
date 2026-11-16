import base64
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional
import uuid

from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from shapely.geometry import Point

from app.core.config import settings
from app.core.security import decode_supabase_jwt
from app.db.supabase import get_supabase_client

logger = logging.getLogger("safenav.api.reports")

router = APIRouter(prefix="/reports", tags=["Citizen Road Reporting"])

# Storage directory for captured report images
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "uploads" / "reports"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

REPORTS_STORE_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "reports_store.json"

MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB max image size


class ReportCreateRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded image data URL or base64 string")
    image_filename: Optional[str] = Field("road_issue.jpg", description="Original uploaded image filename")
    description: Optional[str] = Field(None, max_length=1500, description="Optional citizen notes or context")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Automatically captured GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Automatically captured GPS longitude")
    accuracy: Optional[float] = Field(None, ge=0.0, description="Automatically captured GPS accuracy in meters")


def detect_image_type(image_bytes: bytes) -> Optional[str]:
    """
    Validate image file signatures (magic bytes) without external heavy dependencies.
    Supports JPEG, PNG, WebP, GIF, and HEIC/AVIF containers.
    """
    if len(image_bytes) < 12:
        return None
    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
        return "webp"
    if image_bytes.startswith(b"GIF87a") or image_bytes.startswith(b"GIF89a"):
        return "gif"
    if b"ftyp" in image_bytes[:16]:
        return "heic"
    return None


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_hazard_report(
    request: Request,
    body: ReportCreateRequest,
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    SafeNav M07: Simplified AI-Assisted Citizen Reporting Endpoint.
    Receives required photograph and optional citizen notes.
    Automatically records GPS coordinates, server timestamp, and queues for AI processing.
    """
    # 1. Decode & validate image data
    raw_b64 = body.image
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to decode uploaded image data. Please upload a valid image file.",
        )

    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image file appears empty or incomplete. Please take or select a valid photo.",
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image size exceeds 15 MB limit. Please select a smaller photo or compress it.",
        )

    ext = detect_image_type(image_bytes)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported image format. Please capture or upload a JPEG, PNG, WebP, or HEIC photo.",
        )

    # 2. Extract authenticated user if available (Never trust client-supplied user ID)
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = decode_supabase_jwt(token)
            user_id = payload.get("sub")
            user_email = payload.get("email")
        except Exception:
            logger.debug("Optional user JWT could not be decoded; proceeding as verified citizen report.")

    # 3. Server-managed metadata
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()
    initial_status = "processing"  # Queued for future AI analysis

    # 4. Save image binary to secure server storage
    image_filename = f"{report_id}.{ext}"
    image_filepath = UPLOADS_DIR / image_filename
    try:
        image_filepath.write_bytes(image_bytes)
    except Exception as exc:
        logger.error(f"Failed to save report image {image_filepath}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save report image to server storage.",
        )

    # 5. Check coverage against Nagpur boundary for geographical validation
    boundary_geom = getattr(request.app.state, "boundary_geom", None)
    is_in_coverage = True
    if boundary_geom:
        pt = Point(body.longitude, body.latitude)
        is_in_coverage = bool(boundary_geom.contains(pt) or boundary_geom.touches(pt))

    # 6. Build report record
    report_record: Dict[str, Any] = {
        "report_id": report_id,
        "user_id": user_id,
        "user_email": user_email,
        "status": initial_status,
        "latitude": round(body.latitude, 7),
        "longitude": round(body.longitude, 7),
        "accuracy": round(body.accuracy, 1) if body.accuracy is not None else None,
        "description": body.description.strip() if body.description and body.description.strip() else None,
        "image_path": str(image_filepath),
        "image_filename": image_filename,
        "image_size_bytes": len(image_bytes),
        "is_in_coverage": is_in_coverage,
        "created_at": created_at,
        "ai_analysis": None,  # Prepared integration contract for future AI milestone (M08)
    }

    # 7. Persist to local store
    try:
        existing_reports = []
        if REPORTS_STORE_FILE.exists():
            try:
                existing_reports = json.loads(REPORTS_STORE_FILE.read_text(encoding="utf-8"))
            except Exception:
                existing_reports = []
        existing_reports.insert(0, report_record)
        REPORTS_STORE_FILE.write_text(json.dumps(existing_reports, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Could not append to local reports_store: {exc}")

    # 8. If Supabase DB is connected, also insert into reports table if exists
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("reports").insert({
                "id": report_id,
                "user_id": user_id,
                "latitude": report_record["latitude"],
                "longitude": report_record["longitude"],
                "accuracy": report_record["accuracy"],
                "description": report_record["description"],
                "status": initial_status,
                "image_url": f"/uploads/{image_filename}",
                "created_at": created_at,
            }).execute()
        except Exception as exc:
            logger.debug(f"Supabase reports table insert skipped or unavailable: {exc}")

    logger.info(f"Report {report_id} submitted successfully at ({body.latitude:.4f}, {body.longitude:.4f})")

    return {
        "status": "success",
        "report_id": report_id,
        "status_text": "Processing",
        "message": "Report received and queued for automated AI analysis.",
        "data": {
            "report_id": report_id,
            "status": "processing",
            "latitude": report_record["latitude"],
            "longitude": report_record["longitude"],
            "accuracy": report_record["accuracy"],
            "has_description": bool(report_record["description"]),
            "is_in_coverage": is_in_coverage,
            "created_at": created_at,
        },
    }


@router.get("/{report_id}")
async def get_report_status(report_id: str) -> Dict[str, Any]:
    """
    Fetch report status and details by report_id.
    """
    if REPORTS_STORE_FILE.exists():
        try:
            reports = json.loads(REPORTS_STORE_FILE.read_text(encoding="utf-8"))
            for r in reports:
                if r.get("report_id") == report_id:
                    return {
                        "status": "success",
                        "data": {
                            "report_id": r["report_id"],
                            "status": r.get("status", "processing"),
                            "latitude": r.get("latitude"),
                            "longitude": r.get("longitude"),
                            "accuracy": r.get("accuracy"),
                            "has_description": bool(r.get("description")),
                            "created_at": r.get("created_at"),
                        },
                    }
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Report with ID '{report_id}' was not found.",
    )
