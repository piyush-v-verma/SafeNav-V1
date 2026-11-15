import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safenav.backend")

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
GRAPH_FILEPATH = BASE_DIR / "data" / "processed" / "nagpur_roads.graphml"
BOUNDARY_FILEPATH = BASE_DIR / "data" / "raw" / "nagpur_boundary.geojson"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Loads the GraphML road network and boundary polygon once during startup,
    caches metadata, and stores references in app.state.
    """
    logger.info("Initializing SafeNav Backend...")
    app.state.graph = None
    app.state.graph_error = None
    app.state.graph_info = None
    app.state.boundary_geom = None
    app.state.boundary_error = None

    # 1. Load Road Network Graph
    if not GRAPH_FILEPATH.exists():
        err_msg = (
            f"Road network file not found at: {GRAPH_FILEPATH}. "
            "Please generate the graph first by running scripts/generate_nagpur_road_network.py."
        )
        logger.error(err_msg)
        app.state.graph_error = err_msg
    else:
        logger.info(f"Loading road network graph from: {GRAPH_FILEPATH} ...")
        try:
            G = ox.load_graphml(GRAPH_FILEPATH)
            app.state.graph = G
            app.state.graph_info = {
                "graph_type": type(G).__name__,
                "nodes_count": G.number_of_nodes(),
                "directed_edges_count": G.number_of_edges(),
                "is_directed": G.is_directed(),
                "is_multigraph": G.is_multigraph(),
                "crs": str(G.graph.get("crs", "N/A")),
            }
            logger.info(
                "Road network graph successfully loaded into memory! "
                f"Nodes: {G.number_of_nodes():,}, Directed Edges: {G.number_of_edges():,}, "
                f"CRS: {app.state.graph_info['crs']}"
            )
        except Exception as exc:
            err_msg = f"Failed to load GraphML road network: {str(exc)}"
            logger.error(err_msg, exc_info=True)
            app.state.graph_error = err_msg

    # 2. Load Nagpur Boundary Polygon for Coverage Detection
    if not BOUNDARY_FILEPATH.exists():
        boundary_err = f"Boundary file not found at: {BOUNDARY_FILEPATH}."
        logger.warning(boundary_err)
        app.state.boundary_error = boundary_err
    else:
        try:
            logger.info(f"Loading study boundary from: {BOUNDARY_FILEPATH} ...")
            gdf = gpd.read_file(BOUNDARY_FILEPATH)
            if not gdf.empty:
                # Use union_all to form a unified boundary geometry
                app.state.boundary_geom = gdf.union_all()
                logger.info("Nagpur study boundary successfully loaded for coverage checks.")
            else:
                app.state.boundary_error = "Boundary GeoJSON is empty."
        except Exception as exc:
            boundary_err = f"Failed to load boundary GeoJSON: {str(exc)}"
            logger.error(boundary_err, exc_info=True)
            app.state.boundary_error = boundary_err

    yield

    # Clean up on shutdown
    logger.info("Shutting down SafeNav backend...")
    app.state.graph = None
    app.state.graph_info = None
    app.state.boundary_geom = None


# Initialize FastAPI application
app = FastAPI(
    title="SafeNav API",
    description="Backend API for SafeNav navigation, safety analytics, and coverage services.",
    version="0.1.0",
    lifespan=lifespan,
)

# Development CORS configuration for the Vite React frontend (port 5173)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["General"])
def read_root():
    """Root welcome endpoint."""
    return {
        "message": "SafeNav Backend API is running",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "graph_info_url": "/api/graph/info",
        "coverage_url": "/api/location/coverage",
    }


@app.get("/api/health", tags=["Health"])
def health_check(request: Request) -> Dict[str, Any]:
    """
    Health check endpoint:
    Returns backend operational status and whether the road network graph is loaded.
    Independent of location coverage checks.
    """
    is_loaded = request.app.state.graph is not None
    response_data: Dict[str, Any] = {
        "status": "healthy" if is_loaded else "degraded",
        "graph_loaded": is_loaded,
    }

    if not is_loaded and request.app.state.graph_error:
        response_data["error"] = request.app.state.graph_error

    return response_data


@app.get("/api/graph/info", tags=["Road Network"])
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


@app.get("/api/location/coverage", tags=["Coverage"])
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

    # In WGS84 GeoJSON, coordinates are (Longitude, Latitude)
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
