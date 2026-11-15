import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Query, Request, status
from shapely.geometry import Point
from backend.app.services.routing_service import RouteRequest, compute_route

logger = logging.getLogger("safenav.api.navigation")

router = APIRouter()

@router.get("/health", tags=["Health"])
def health_check(request: Request) -> Dict[str, Any]:
    """
    Health check endpoint:
    Returns backend operational status and whether the road network graph is loaded.
    """
    is_loaded = request.app.state.graph is not None
    response_data: Dict[str, Any] = {
        "status": "healthy" if is_loaded else "degraded",
        "graph_loaded": is_loaded,
    }

    if not is_loaded and request.app.state.graph_error:
        response_data["error"] = request.app.state.graph_error

    return response_data


@router.get("/graph/info", tags=["Road Network"])
def get_graph_info(request: Request) -> Dict[str, Any]:
    """
    Road network information endpoint:
    Returns graph type, node count, directed edge count, multigraph/directed status, and CRS.
    """
    if request.app.state.graph is None:
        error_detail = (
            request.app.state.graph_error
            or "Road network graph is not available. Please verify the GraphML dataset."
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error_detail,
        )

    return request.app.state.graph_info


@router.get("/location/coverage", tags=["Coverage"])
def check_location_coverage(
    request: Request,
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="WGS84 Latitude of the location (-90 to 90)",
        examples=[21.1458]
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="WGS84 Longitude of the location (-180 to 180)",
        examples=[79.0882]
    ),
) -> Dict[str, Any]:
    """
    Check if supplied GPS coordinates fall within the supported Nagpur road network boundary.
    """
    boundary_geom = request.app.state.boundary_geom

    if boundary_geom is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                request.app.state.boundary_error
                or "Nagpur boundary data is currently unavailable."
            ),
        )

    point = Point(longitude, latitude)
    is_supported = bool(boundary_geom.contains(point) or boundary_geom.touches(point))

    if is_supported:
        return {
            "latitude": latitude,
            "longitude": longitude,
            "supported": True,
            "city": "Nagpur",
            "message": "Coordinates are within the supported Nagpur road network area.",
        }
    else:
        return {
            "latitude": latitude,
            "longitude": longitude,
            "supported": False,
            "city": None,
            "message": (
                "Coordinates are outside the supported Nagpur coverage area. "
                "Navigation and road graph services are currently available within Nagpur municipal limits only."
            ),
        }


@router.post("/navigation/route", tags=["Navigation"])
def calculate_route(request: Request, body: RouteRequest) -> Dict[str, Any]:
    """
    Calculate a mode-aware route connecting actual GPS origin and destination
    to the road graph via dotted access lines and a solid road-following route.
    """
    return compute_route(request.app.state, body)
