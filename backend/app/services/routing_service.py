import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import networkx as nx
from pydantic import BaseModel, Field
import pyproj
import shapely
from shapely.geometry import LineString, Point
from shapely.ops import substring

logger = logging.getLogger("safenav.services.routing")

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


def compute_route(app_state, body: RouteRequest) -> Dict[str, Any]:
    """
    Calculate a mode-aware route connecting actual GPS origin and destination
    to the road graph via dotted access lines and a solid road-following route.
    """
    G = app_state.graph
    edge_tree = getattr(app_state, "edge_tree", None)
    edge_geoms_utm = getattr(app_state, "edge_geoms_utm", None)
    scc_edges = getattr(app_state, "scc_edges", None)
    boundary_geom = app_state.boundary_geom
    to_utm = getattr(app_state, "to_utm", None)
    to_wgs = getattr(app_state, "to_wgs", None)

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

    entry_node = v1
    arrival_node = u2

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
        # Lead-in road segment: snapped_orig -> entry_node (v1)
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

        # Main graph path: entry_node (v1) -> arrival_node (u2)
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

        # Lead-out road segment: arrival_node (u2) -> snapped_dest
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

        raw_road = lead_in_coords + intermediate_coords + lead_out_coords
        for pt in raw_road:
            if not road_coords or road_coords[-1] != pt:
                road_coords.append(pt)

    if len(road_coords) < 2:
        road_coords = [
            orig_snap["snapped_coordinates"],
            dest_snap["snapped_coordinates"],
        ]

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
        "geometry": {
            "type": "LineString",
            "coordinates": road_coords,
        },
    }
