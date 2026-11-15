import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import networkx as nx
import osmnx as ox
from pydantic import BaseModel, Field
import pyproj
import shapely
from shapely.geometry import LineString, Point
from shapely.ops import substring

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
            # Build spatial indexes on Largest Strongly Connected Component (SCC) to guarantee reachability
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


# ---------------------------------------------------------------------------
# Navigation & Route Calculation
# ---------------------------------------------------------------------------

class LatLng(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")


class RouteRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    mode: str = Field(
        "car",
        description="Travel mode: 'car' (default), 'two_wheeler', or 'walking'",
    )


PROVISIONAL_SPEEDS: Dict[str, Dict[str, float]] = {
    "car": {
        "trunk": 50.0, "trunk_link": 40.0,
        "primary": 35.0, "primary_link": 30.0,
        "secondary": 28.0, "secondary_link": 25.0,
        "tertiary": 22.0, "tertiary_link": 20.0,
        "residential": 18.0,
        "living_street": 12.0,
        "unclassified": 18.0,
    },
    "two_wheeler": {
        "trunk": 45.0, "trunk_link": 35.0,
        "primary": 35.0, "primary_link": 30.0,
        "secondary": 30.0, "secondary_link": 25.0,
        "tertiary": 25.0, "tertiary_link": 20.0,
        "residential": 20.0,
        "living_street": 15.0,
        "unclassified": 20.0,
    },
    "walking": {
        "trunk": 1.0, "trunk_link": 1.0,
        "primary": 3.0, "primary_link": 3.0,
        "secondary": 4.5, "secondary_link": 4.5,
        "tertiary": 4.5, "tertiary_link": 4.5,
        "residential": 5.0,
        "living_street": 5.0,
        "unclassified": 4.5,
    },
}


MAX_SNAPPING_DISTANCE_M = 300.0


def snap_coordinate_to_road(
    point_lon: float,
    point_lat: float,
    mode: str,
    edge_tree,
    edge_geoms_utm,
    scc_edges,
    to_utm,
    to_wgs,
) -> Optional[Dict[str, Any]]:
    """
    Project a coordinate onto the nearest eligible road edge using metric UTM Zone 44N.
    Returns snapped coordinates, access distance, edge tuple, and projection fraction.
    """
    pt_utm = Point(to_utm.transform(point_lon, point_lat))

    # Query candidate edges within buffer radius
    buffer_box = pt_utm.buffer(MAX_SNAPPING_DISTANCE_M)
    candidate_indices = edge_tree.query(buffer_box)

    if len(candidate_indices) == 0:
        # Fallback to absolute nearest edge
        nearest_idx = edge_tree.nearest(pt_utm)
        candidate_indices = [nearest_idx]

    best_idx = None
    min_dist = float("inf")

    for idx in candidate_indices:
        u, v, k, d = scc_edges[idx]
        hw = d.get("highway", "residential")
        if isinstance(hw, list):
            hw = hw[0]

        layer = d.get("layer", 0)
        try:
            layer_int = int(layer)
        except (ValueError, TypeError):
            layer_int = 0

        # Mode accessibility filtering
        if mode == "walking":
            if layer_int >= 1 or hw in ("trunk", "trunk_link"):
                continue
        elif mode in ("car", "two_wheeler"):
            if hw in ("footway", "pedestrian", "path", "steps"):
                continue

        geom = edge_geoms_utm[idx]
        dist = geom.distance(pt_utm)
        if dist < min_dist:
            min_dist = dist
            best_idx = idx

    if best_idx is None or min_dist > MAX_SNAPPING_DISTANCE_M:
        return None

    # Calculate exact perpendicular projection on the chosen edge
    u, v, k, d = scc_edges[best_idx]
    best_geom_utm = edge_geoms_utm[best_idx]
    proj_dist = best_geom_utm.project(pt_utm)
    snapped_utm_pt = best_geom_utm.interpolate(proj_dist)
    snapped_lon, snapped_lat = to_wgs.transform(snapped_utm_pt.x, snapped_utm_pt.y)

    total_geom_len = best_geom_utm.length
    proj_fraction = proj_dist / total_geom_len if total_geom_len > 0 else 0.0

    return {
        "edge_tuple": (u, v, k, d),
        "access_distance_m": round(min_dist, 1),
        "snapped_coordinates": [round(snapped_lon, 6), round(snapped_lat, 6)],
        "proj_fraction": proj_fraction,
        "is_oneway": d.get("oneway", False),
    }


@app.post("/api/navigation/route", tags=["Navigation"])
def calculate_route(request: Request, body: RouteRequest) -> Dict[str, Any]:
    """
    Calculate a mode-aware route connecting actual GPS origin and destination
    to the road graph via dotted access lines and a solid road-following route.
    """
    G = request.app.state.graph
    edge_tree = getattr(request.app.state, "edge_tree", None)
    edge_geoms_utm = getattr(request.app.state, "edge_geoms_utm", None)
    scc_edges = getattr(request.app.state, "scc_edges", None)
    boundary_geom = request.app.state.boundary_geom
    to_utm = getattr(request.app.state, "to_utm", None)
    to_wgs = getattr(request.app.state, "to_wgs", None)

    if (
        G is None
        or edge_tree is None
        or edge_geoms_utm is None
        or scc_edges is None
        or to_utm is None
        or to_wgs is None
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Road network spatial index is not loaded into memory.",
        )

    if boundary_geom is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nagpur boundary data is unavailable for coverage validation.",
        )

    # 1. Coverage validation against Nagpur boundary
    orig_pt = Point(body.origin.longitude, body.origin.latitude)
    dest_pt = Point(body.destination.longitude, body.destination.latitude)

    if not (boundary_geom.contains(orig_pt) or boundary_geom.touches(orig_pt)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Origin coordinates fall outside the supported Nagpur road network area.",
        )

    if not (boundary_geom.contains(dest_pt) or boundary_geom.touches(dest_pt)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Destination coordinates fall outside the supported Nagpur road network area.",
        )

    # 2. Mode validation
    mode = body.mode.lower().strip()
    if mode not in ("car", "two_wheeler", "walking"):
        mode = "car"

    # 3. Independent metric edge snapping for origin and destination
    orig_snap = snap_coordinate_to_road(
        body.origin.longitude,
        body.origin.latitude,
        mode,
        edge_tree,
        edge_geoms_utm,
        scc_edges,
        to_utm,
        to_wgs,
    )
    if orig_snap is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No accessible road found within {int(MAX_SNAPPING_DISTANCE_M)}m of your origin position.",
        )

    dest_snap = snap_coordinate_to_road(
        body.destination.longitude,
        body.destination.latitude,
        mode,
        edge_tree,
        edge_geoms_utm,
        scc_edges,
        to_utm,
        to_wgs,
    )
    if dest_snap is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No accessible road found within {int(MAX_SNAPPING_DISTANCE_M)}m of your destination position.",
        )

    # 4. Mode-aware edge weight function
    speed_map = PROVISIONAL_SPEEDS.get(mode, PROVISIONAL_SPEEDS["car"])
    default_speed = 20.0 if mode != "walking" else 4.5

    def edge_weight(u, v, edge_dict):
        min_w = float("inf")
        for k, d in edge_dict.items():
            length = float(d.get("length", 10.0))
            hw = d.get("highway", "residential")
            if isinstance(hw, list):
                hw = hw[0]
            spd = speed_map.get(hw, default_speed)

            layer = d.get("layer", 0)
            try:
                layer_int = int(layer)
            except (ValueError, TypeError):
                layer_int = 0

            penalty = 1.0
            if mode == "walking":
                if layer_int >= 1 or hw in ("trunk", "trunk_link"):
                    penalty = 20.0

            time_cost = (length / (spd * (1000.0 / 3600.0))) * penalty
            if time_cost < min_w:
                min_w = time_cost
        return min_w

    # 5. Connect snapped points through road graph without mutating G
    u1, v1, k1, d1 = orig_snap["edge_tuple"]
    u2, v2, k2, d2 = dest_snap["edge_tuple"]

    # Entry node: v1 for one-way forward; for bidirectional, v1 is always forward along edge
    entry_node = v1
    # Arrival node: u2 for one-way forward
    arrival_node = u2

    # Extract WGS84 geometries for edge slices
    def get_wgs_edge_geom(u, v, d):
        if "geometry" in d and hasattr(d["geometry"], "coords"):
            return d["geometry"]
        return LineString(
            [
                (float(G.nodes[u]["x"]), float(G.nodes[u]["y"])),
                (float(G.nodes[v]["x"]), float(G.nodes[v]["y"])),
            ]
        )

    e1_geom_wgs = get_wgs_edge_geom(u1, v1, d1)
    e2_geom_wgs = get_wgs_edge_geom(u2, v2, d2)

    # Calculate lead-in slice (snapped origin -> entry_node)
    f_orig = orig_snap["proj_fraction"]
    f_dest = dest_snap["proj_fraction"]

    road_coords: List[List[float]] = []
    road_distance_m = 0.0
    road_duration_s = 0.0

    # Special case: Origin and destination snapped to the exact same edge in forward direction
    if (u1, v1, k1) == (u2, v2, k2) and f_orig <= f_dest:
        slice_geom = substring(
            e1_geom_wgs,
            f_orig * e1_geom_wgs.length,
            f_dest * e1_geom_wgs.length,
        )
        road_coords = [[float(c[0]), float(c[1])] for c in slice_geom.coords]
        seg_len = (f_dest - f_orig) * float(d1.get("length", 10.0))
        road_distance_m = max(seg_len, 1.0)
        hw1 = d1.get("highway", "residential")
        if isinstance(hw1, list):
            hw1 = hw1[0]
        spd = speed_map.get(hw1, default_speed)
        road_duration_s = road_distance_m / max(spd * (1000.0 / 3600.0), 0.5)
    else:
        # 1. Lead-in road segment: snapped_orig -> entry_node (v1)
        lead_in_slice = substring(
            e1_geom_wgs,
            f_orig * e1_geom_wgs.length,
            e1_geom_wgs.length,
        )
        lead_in_coords = [[float(c[0]), float(c[1])] for c in lead_in_slice.coords]
        lead_in_len = (1.0 - f_orig) * float(d1.get("length", 10.0))
        road_distance_m += lead_in_len
        hw1 = d1.get("highway", "residential")
        if isinstance(hw1, list):
            hw1 = hw1[0]
        spd1 = speed_map.get(hw1, default_speed)
        road_duration_s += lead_in_len / max(spd1 * (1000.0 / 3600.0), 0.5)

        # 2. Main graph path: entry_node (v1) -> arrival_node (u2)
        intermediate_coords: List[List[float]] = []
        if entry_node != arrival_node:
            try:
                path = nx.shortest_path(
                    G, source=entry_node, target=arrival_node, weight=edge_weight
                )
            except nx.NetworkXNoPath:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No road path found between the snapped road locations.",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Route solver failed: {str(exc)}",
                )

            for u, v in zip(path[:-1], path[1:]):
                e_dict = G.get_edge_data(u, v)
                key, e_data = min(
                    e_dict.items(),
                    key=lambda item: float(item[1].get("length", 10.0)),
                )
                seg_len = float(e_data.get("length", 10.0))
                road_distance_m += seg_len
                hw = e_data.get("highway", "residential")
                if isinstance(hw, list):
                    hw = hw[0]
                spd = speed_map.get(hw, default_speed)
                road_duration_s += seg_len / max(spd * (1000.0 / 3600.0), 0.5)

                if "geometry" in e_data and hasattr(e_data["geometry"], "coords"):
                    pts = [[float(c[0]), float(c[1])] for c in e_data["geometry"].coords]
                else:
                    pts = [
                        [float(G.nodes[u]["x"]), float(G.nodes[u]["y"])],
                        [float(G.nodes[v]["x"]), float(G.nodes[v]["y"])],
                    ]
                for pt in pts:
                    if not intermediate_coords or intermediate_coords[-1] != pt:
                        intermediate_coords.append(pt)

        # 3. Lead-out road segment: arrival_node (u2) -> snapped_dest
        lead_out_slice = substring(
            e2_geom_wgs,
            0.0,
            f_dest * e2_geom_wgs.length,
        )
        lead_out_coords = [[float(c[0]), float(c[1])] for c in lead_out_slice.coords]
        lead_out_len = f_dest * float(d2.get("length", 10.0))
        road_distance_m += lead_out_len
        hw2 = d2.get("highway", "residential")
        if isinstance(hw2, list):
            hw2 = hw2[0]
        spd2 = speed_map.get(hw2, default_speed)
        road_duration_s += lead_out_len / max(spd2 * (1000.0 / 3600.0), 0.5)

        # Splice full road coordinates and deduplicate
        raw_road = lead_in_coords + intermediate_coords + lead_out_coords
        for pt in raw_road:
            if not road_coords or road_coords[-1] != pt:
                road_coords.append(pt)

    # Ensure road_coords has at least 2 points
    if len(road_coords) < 2:
        road_coords = [
            orig_snap["snapped_coordinates"],
            dest_snap["snapped_coordinates"],
        ]

    # Calculate access lines & transparent totals
    orig_access_coords = [
        [round(body.origin.longitude, 6), round(body.origin.latitude, 6)],
        orig_snap["snapped_coordinates"],
    ]
    dest_access_coords = [
        dest_snap["snapped_coordinates"],
        [round(body.destination.longitude, 6), round(body.destination.latitude, 6)],
    ]

    orig_access_dist = orig_snap["access_distance_m"]
    dest_access_dist = dest_snap["access_distance_m"]
    total_distance_m = orig_access_dist + road_distance_m + dest_access_dist

    # Walking speed for off-road access: ~4.5 km/h (1.25 m/s)
    access_time_s = (orig_access_dist + dest_access_dist) / 1.25
    total_duration_s = road_duration_s + access_time_s
    total_duration_min = max(round(total_duration_s / 60.0), 1)

    advisory = None
    if mode == "walking":
        advisory = (
            "Sidewalks and pedestrian paths are not mapped on this road network. "
            "Route follows vehicular streets. Exercise caution."
        )

    return {
        "status": "success",
        "mode": mode,
        "summary": {
            "total_distance_meters": round(total_distance_m, 1),
            "total_distance_km": round(total_distance_m / 1000.0, 2),
            "total_duration_minutes": total_duration_min,
            "breakdown": {
                "origin_access_distance_m": orig_access_dist,
                "road_route_distance_m": round(road_distance_m, 1),
                "destination_access_distance_m": dest_access_dist,
                "road_duration_seconds": round(road_duration_s, 1),
                "access_duration_seconds": round(access_time_s, 1),
            },
        },
        "snapping": {
            "origin": {
                "original_coordinates": [body.origin.longitude, body.origin.latitude],
                "snapped_coordinates": orig_snap["snapped_coordinates"],
                "access_distance_m": orig_access_dist,
                "snapped_edge": {
                    "u": u1,
                    "v": v1,
                    "highway": d1.get("highway", "residential"),
                    "name": d1.get("name", "Unnamed Road"),
                },
            },
            "destination": {
                "original_coordinates": [body.destination.longitude, body.destination.latitude],
                "snapped_coordinates": dest_snap["snapped_coordinates"],
                "access_distance_m": dest_access_dist,
                "snapped_edge": {
                    "u": u2,
                    "v": v2,
                    "highway": d2.get("highway", "residential"),
                    "name": d2.get("name", "Unnamed Road"),
                },
            },
        },
        "advisory": advisory,
        "geometries": {
            "origin_access": {
                "type": "LineString",
                "coordinates": orig_access_coords,
            },
            "destination_access": {
                "type": "LineString",
                "coordinates": dest_access_coords,
            },
            "road_route": {
                "type": "LineString",
                "coordinates": road_coords,
            },
        },
        # Top-level geometry for backward compatibility
        "geometry": {
            "type": "LineString",
            "coordinates": road_coords,
        },
    }
