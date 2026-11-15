import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
import osmnx as ox

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safenav.backend")

# Path to processed GraphML file
GRAPH_FILEPATH = (
    Path(__file__).resolve().parent.parent / "data" / "processed" / "nagpur_roads.graphml"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Loads the GraphML road network once during application startup,
    caches basic metadata, and stores it in app.state.
    """
    logger.info("Initializing SafeNav Backend...")
    app.state.graph = None
    app.state.graph_error = None
    app.state.graph_info = None

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
            # Load GraphML using OSMnx
            G = ox.load_graphml(GRAPH_FILEPATH)
            app.state.graph = G

            # Cache graph metrics in application state
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

    yield

    # Clean up on shutdown
    logger.info("Shutting down SafeNav backend...")
    app.state.graph = None
    app.state.graph_info = None


# Initialize FastAPI application
app = FastAPI(
    title="SafeNav API",
    description="Backend API for SafeNav navigation, safety analytics, and routing services.",
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
    }


@app.get("/api/health", tags=["Health"])
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
