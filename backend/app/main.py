import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import networkx as nx
import osmnx as ox
import pyproj
import shapely
from shapely.geometry import LineString, Point

from backend.app.core.config import settings
from backend.app.api.router import api_v1_router, api_legacy_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safenav.backend")


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
    if not settings.GRAPH_FILEPATH.exists():
        err_msg = (
            f"Road network file not found at: {settings.GRAPH_FILEPATH}. "
            "Please verify the dataset is present."
        )
        logger.error(err_msg)
        app.state.graph_error = err_msg
    else:
        logger.info(f"Loading road network graph from: {settings.GRAPH_FILEPATH} ...")
        try:
            G = ox.load_graphml(settings.GRAPH_FILEPATH)
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
            # Build spatial indexes on Largest Strongly Connected Component (SCC)
            scc_nodes = max(nx.strongly_connected_components(G), key=len)
            scc_list = list(scc_nodes)
            node_points = [Point(G.nodes[n]["x"], G.nodes[n]["y"]) for n in scc_list]
            app.state.node_tree = shapely.STRtree(node_points)
            app.state.node_ids = scc_list

            # Metric Projection Transformers for Nagpur (UTM Zone 44N / EPSG:32644)
            to_utm = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32644", always_xy=True)
            to_wgs = pyproj.Transformer.from_crs("EPSG:32644", "EPSG:4326", always_xy=True)
            app.state.to_utm = to_utm
            app.state.to_wgs = to_wgs

            # Build Metric Projected Edge STRtree
            scc_edges = [
                (u, v, k, d)
                for u, v, k, d in G.edges(keys=True, data=True)
                if u in scc_nodes and v in scc_nodes
            ]
            edge_geoms_utm = []
            for u, v, k, d in scc_edges:
                if "geometry" in d and hasattr(d["geometry"], "coords"):
                    pts = [to_utm.transform(x, y) for x, y in d["geometry"].coords]
                else:
                    pts = [
                        to_utm.transform(G.nodes[u]["x"], G.nodes[u]["y"]),
                        to_utm.transform(G.nodes[v]["x"], G.nodes[v]["y"]),
                    ]
                edge_geoms_utm.append(LineString(pts))

            app.state.edge_tree = shapely.STRtree(edge_geoms_utm)
            app.state.edge_geoms_utm = edge_geoms_utm
            app.state.scc_edges = scc_edges

            logger.info(
                f"Built spatial STRtree index on Largest SCC ({len(scc_list):,} nodes, "
                f"{len(scc_edges):,} edges in UTM Zone 44N) for instant metric road snapping."
            )
        except Exception as exc:
            err_msg = f"Failed to load GraphML road network: {str(exc)}"
            logger.error(err_msg, exc_info=True)
            app.state.graph_error = err_msg

    # 2. Load Nagpur Boundary Polygon for Coverage Detection
    if not settings.BOUNDARY_FILEPATH.exists():
        boundary_err = f"Boundary file not found at: {settings.BOUNDARY_FILEPATH}."
        logger.warning(boundary_err)
        app.state.boundary_error = boundary_err
    else:
        try:
            logger.info(f"Loading study boundary from: {settings.BOUNDARY_FILEPATH} ...")
            gdf = gpd.read_file(settings.BOUNDARY_FILEPATH)
            if not gdf.empty:
                app.state.boundary_geom = gdf.union_all()
                logger.info("Nagpur study boundary successfully loaded for coverage checks.")
            else:
                app.state.boundary_error = "Boundary GeoJSON is empty."
        except Exception as exc:
            boundary_err = f"Failed to load boundary GeoJSON: {str(exc)}"
            logger.error(boundary_err, exc_info=True)
            app.state.boundary_error = boundary_err

    yield

    logger.info("Shutting down SafeNav backend...")
    app.state.graph = None
    app.state.graph_info = None
    app.state.boundary_geom = None


# Initialize FastAPI application
app = FastAPI(
    title="SafeNav API",
    description="Backend API for SafeNav identity, safety analytics, road navigation, and administration.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration supporting both citizen app (5173) and admin console (5174)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(api_legacy_router)
app.include_router(api_v1_router)


@app.get("/", tags=["General"])
def read_root():
    """Root welcome endpoint."""
    return {
        "message": "SafeNav Backend API is running",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "graph_info_url": "/api/graph/info",
        "coverage_url": "/api/location/coverage",
        "api_v1_url": "/api/v1",
    }
