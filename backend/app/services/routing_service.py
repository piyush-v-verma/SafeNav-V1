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
    mode: Optional[str] = Field(
        None,
        description="Travel mode: 'car' (default), 'motorcycle' (or 'two_wheeler'), or 'walking'",
    )
    transport_mode: Optional[str] = Field(
        None,
        description="Alias for mode: 'car', 'motorcycle', or 'walking'",
    )
    preference: Optional[str] = Field(
        None,
        description="Route preference: 'fastest' (default) or 'shortest'",
    )
    route_preference: Optional[str] = Field(
        None,
        description="Alias for preference: 'fastest' or 'shortest'",
    )


# Realistic urban road speeds in Nagpur / Indian cities (in km/h)
SPEEDS_KMH: Dict[str, Dict[str, float]] = {
    "car": {
        "trunk": 50.0, "trunk_link": 40.0,
        "primary": 40.0, "primary_link": 30.0,
        "secondary": 32.0, "secondary_link": 25.0,
        "tertiary": 25.0, "tertiary_link": 20.0,
        "unclassified": 20.0,
        "residential": 18.0,
        "living_street": 12.0,
        "service": 10.0,
        "road": 20.0,
    },
    "motorcycle": {
        "trunk": 45.0, "trunk_link": 35.0,
        "primary": 38.0, "primary_link": 30.0,
        "secondary": 32.0, "secondary_link": 25.0,
        "tertiary": 28.0, "tertiary_link": 22.0,
        "unclassified": 25.0,
        "residential": 24.0,
        "living_street": 18.0,
        "service": 15.0,
        "road": 22.0,
    },
    "walking": {
        "trunk": 4.5, "trunk_link": 4.5,
        "primary": 4.8, "primary_link": 4.8,
        "secondary": 4.8, "secondary_link": 4.8,
        "tertiary": 4.8, "tertiary_link": 4.8,
        "unclassified": 4.8,
        "residential": 5.0,
        "living_street": 5.0,
        "service": 5.0,
        "footway": 5.0,
        "pedestrian": 5.0,
        "path": 5.0,
        "steps": 3.0,
        "road": 4.8,
    },
}

# Road suitability & friction multipliers for 'fastest' travel time optimization:
# - Car: Severe traffic friction on narrow residential lanes and living streets; high efficiency on arterials.
# - Motorcycle: High agility in residential streets and tertiary shortcuts; less affected by bottlenecks.
# - Walking: Preference for quiet residential/living streets over noisy high-speed multi-lane trunk corridors.
SUITABILITY_FASTEST: Dict[str, Dict[str, float]] = {
    "car": {
        "trunk": 1.0, "trunk_link": 1.05,
        "primary": 1.02, "primary_link": 1.08,
        "secondary": 1.08, "secondary_link": 1.12,
        "tertiary": 1.15, "tertiary_link": 1.20,
        "unclassified": 1.30,
        "residential": 1.45,
        "living_street": 1.80,
        "service": 1.90,
        "road": 1.30,
    },
    "motorcycle": {
        "trunk": 1.0, "trunk_link": 1.02,
        "primary": 1.0, "primary_link": 1.02,
        "secondary": 1.02, "secondary_link": 1.04,
        "tertiary": 1.04, "tertiary_link": 1.06,
        "unclassified": 1.06,
        "residential": 1.08,
        "living_street": 1.12,
        "service": 1.15,
        "road": 1.06,
    },
    "walking": {
        "living_street": 1.0,
        "residential": 1.0,
        "service": 1.0,
        "footway": 1.0,
        "pedestrian": 1.0,
        "path": 1.0,
        "unclassified": 1.02,
        "tertiary": 1.05,
        "secondary": 1.10,
        "primary": 1.15,
        "trunk": 1.25,
        "road": 1.05,
    },
}

MAX_SNAPPING_DISTANCE_M = 300.0


def is_edge_accessible(d: Dict[str, Any], mode: str) -> bool:
    """
    Check if a road edge is legally and physically accessible for the specified mode.
    Evaluates OSM attributes: highway, access, motor_vehicle, motorcycle, motorcar, foot, layer, width.
    """
    hw = d.get("highway", "residential")
    if isinstance(hw, list):
        hw = hw[0]

    # 1. Elevated layer check
    layer = d.get("layer", 0)
    try:
        layer_int = int(layer)
    except (ValueError, TypeError):
        layer_int = 0

    # 2. General access tag check
    access = d.get("access", "yes")
    if access in ("no", "private"):
        # Explicit vehicle-specific override check
        if mode == "car" and d.get("motor_vehicle") != "yes" and d.get("motorcar") != "yes":
            return False
        if mode == "motorcycle" and d.get("motorcycle") not in ("yes", "permissive") and d.get("motor_vehicle") != "yes":
            return False
        if mode == "walking" and d.get("foot") not in ("yes", "permissive"):
            return False

    # 3. Walking rules (Pedestrians can use all roads and bridges except motorways and explicit foot=no)
    if mode == "walking":
        if hw in ("motorway", "motorway_link"):
            return False
        if d.get("foot") == "no":
            return False
        return True

    # 4. Vehicular (Car & Motorcycle) rules
    if mode in ("car", "motorcycle"):
        # Prohibited on pedestrian-only infrastructure
        if hw in ("footway", "pedestrian", "path", "steps", "cycleway"):
            return False
        if d.get("motor_vehicle") == "no":
            return False

    # 5. Car-specific restrictions
    if mode == "car":
        if d.get("motorcar") == "no":
            return False
        # Width restriction: standard cars cannot pass narrow lanes with width < 2.5m
        w_val = d.get("width")
        if w_val:
            try:
                if float(str(w_val).split()[0]) < 2.5:
                    return False
            except (ValueError, TypeError):
                pass

    # 6. Motorcycle-specific restrictions
    if mode == "motorcycle":
        if d.get("motorcycle") == "no":
            return False

    return True


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
    Filters candidate edges by mode accessibility to guarantee legitimate entrance.
    """
    pt_utm = Point(to_utm.transform(point_lon, point_lat))

    buffer_box = pt_utm.buffer(MAX_SNAPPING_DISTANCE_M)
    candidate_indices = edge_tree.query(buffer_box)

    if len(candidate_indices) == 0:
        candidate_indices = [edge_tree.nearest(pt_utm)]

    best_idx = None
    min_dist = float("inf")

    for idx in candidate_indices:
        u, v, k, d = scc_edges[idx]
        if not is_edge_accessible(d, mode):
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

    raw_oneway = d.get("oneway", False)
    is_oneway = str(raw_oneway).lower() in ("true", "1", "yes")

    return {
        "edge_tuple": (u, v, k, d),
        "access_distance_m": round(min_dist, 1),
        "snapped_coordinates": [round(snapped_lon, 6), round(snapped_lat, 6)],
        "proj_fraction": proj_fraction,
        "is_oneway": is_oneway,
    }


def compute_route(app_state, body: RouteRequest) -> Dict[str, Any]:
    """
    Calculate an independent mode- and preference-aware route:
    Profiles:
      - car_fastest / car_shortest
      - motorcycle_fastest / motorcycle_shortest
      - walking_fastest / walking_shortest
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

    # 2. Mode and Preference normalization
    raw_mode = (body.transport_mode or body.mode or "car").lower().strip()
    if raw_mode in ("motorcycle", "bike", "two_wheeler", "moto"):
        mode = "motorcycle"
    elif raw_mode in ("walking", "walk", "pedestrian", "foot"):
        mode = "walking"
    else:
        mode = "car"

    raw_pref = (body.route_preference or body.preference or "fastest").lower().strip()
    if raw_pref in ("shortest", "distance", "short"):
        preference = "shortest"
    else:
        preference = "fastest"

    selected_profile = f"{mode}_{preference}"

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

    u1, v1, k1, d1 = orig_snap["edge_tuple"]
    u2, v2, k2, d2 = dest_snap["edge_tuple"]
    f_orig = orig_snap["proj_fraction"]
    f_dest = dest_snap["proj_fraction"]

    # 4. Search graph: Walking uses zero-copy undirected view for bidirectional pedestrian movement
    search_G = G.to_undirected(as_view=True) if mode == "walking" else G

    # 5. Cost function for profile
    speed_dict = SPEEDS_KMH[mode]
    suit_dict = SUITABILITY_FASTEST[mode]
    default_spd = 20.0 if mode != "walking" else 4.8
    default_suit = 1.2 if mode == "car" else (1.05 if mode == "motorcycle" else 1.0)

    # Shortest route mode factors:
    # - Car: Prioritize main roads most of the time but shortest (mild penalty on residential/service shortcuts)
    # - Motorcycle: Mix main and narrow roads freely for the shortest path
    # - Walking: Absolute shortest physical distance on all walkable roads/paths
    CAR_SHORTEST_FACTORS = {
        "trunk": 1.0, "trunk_link": 1.02,
        "primary": 1.0, "primary_link": 1.02,
        "secondary": 1.02, "secondary_link": 1.04,
        "tertiary": 1.05, "tertiary_link": 1.08,
        "unclassified": 1.15,
        "residential": 1.35,
        "living_street": 1.65,
        "service": 1.75,
        "road": 1.15,
    }

    def edge_cost(u, v, e_dict):
        min_c = float("inf")
        for k, d in e_dict.items():
            if not is_edge_accessible(d, mode):
                continue
            seg_len = float(d.get("length", 10.0))
            hw = d.get("highway", "residential")
            if isinstance(hw, list):
                hw = hw[0]

            if mode == "walking":
                # Walking: Most shortest path regardless of whether main or narrow road
                c = seg_len
            elif preference == "shortest":
                if mode == "car":
                    # Car: Main route most of the time but shortest
                    c = seg_len * CAR_SHORTEST_FACTORS.get(hw, 1.20)
                else:
                    # Motorcycle: Mixed main and narrow road but also shortest path
                    factor = 1.02 if hw in ("living_street", "service") else 1.0
                    c = seg_len * factor
            else:
                # Fastest route travel time
                spd = speed_dict.get(hw, default_spd)
                speed_m_s = max(spd * (1000.0 / 3600.0), 0.5)
                suit = suit_dict.get(hw, default_suit)
                c = (seg_len / speed_m_s) * suit

            if c < min_c:
                min_c = c
        return min_c

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
    len1 = float(d1.get("length", 10.0))
    len2 = float(d2.get("length", 10.0))

    # Helper for edge duration
    def edge_duration_s(d_edge, length_m):
        hw = d_edge.get("highway", "residential")
        if isinstance(hw, list):
            hw = hw[0]
        spd = speed_dict.get(hw, default_spd)
        return length_m / max(spd * (1000.0 / 3600.0), 0.5)

    road_coords: List[List[float]] = []
    road_distance_m = 0.0
    road_duration_s = 0.0

    # Special Case: Origin and destination snapped to the exact same edge
    if (u1, v1) == (u2, v2):
        if f_orig <= f_dest:
            slice_geom = substring(e1_geom_wgs, f_orig * e1_geom_wgs.length, f_dest * e1_geom_wgs.length)
            road_coords = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in slice_geom.coords]
            seg_len = max((f_dest - f_orig) * len1, 1.0)
            road_distance_m = seg_len
            road_duration_s = edge_duration_s(d1, seg_len)
        elif not orig_snap["is_oneway"] or mode == "walking":
            slice_geom = substring(e1_geom_wgs, f_dest * e1_geom_wgs.length, f_orig * e1_geom_wgs.length)
            road_coords = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in reversed(list(slice_geom.coords))]
            seg_len = max((f_orig - f_dest) * len1, 1.0)
            road_distance_m = seg_len
            road_duration_s = edge_duration_s(d1, seg_len)

    # General Case: Multi-edge routing with candidate entry and arrival nodes
    if not road_coords:
        # Candidate entry points at origin:
        # - v1: forward along edge (always valid)
        # - u1: reverse along edge (valid if two-way or walking)
        entry_candidates = [(v1, (1.0 - f_orig) * len1, "forward")]
        if not orig_snap["is_oneway"] or mode == "walking":
            entry_candidates.append((u1, f_orig * len1, "reverse"))

        # Candidate arrival points at destination:
        # - u2: forward into edge towards destination (always valid)
        # - v2: reverse from end towards destination (valid if two-way or walking)
        arrival_candidates = [(u2, f_dest * len2, "forward")]
        if not dest_snap["is_oneway"] or mode == "walking":
            arrival_candidates.append((v2, (1.0 - f_dest) * len2, "reverse"))

        best_score = float("inf")
        best_path: Optional[List[Any]] = None
        best_entry = None
        best_arrival = None

        for start_node, lead_in_m, start_dir in entry_candidates:
            for end_node, lead_out_m, end_dir in arrival_candidates:
                if start_node == end_node:
                    candidate_path = [start_node]
                    path_cost = 0.0
                else:
                    try:
                        candidate_path = nx.shortest_path(
                            search_G, source=start_node, target=end_node, weight=edge_cost
                        )
                        path_cost = sum(
                            edge_cost(u, v, search_G.get_edge_data(u, v))
                            for u, v in zip(candidate_path[:-1], candidate_path[1:])
                        )
                    except (nx.NetworkXNoPath, nx.NodeNotFound):
                        continue

                lead_in_dur = edge_duration_s(d1, lead_in_m)
                lead_out_dur = edge_duration_s(d2, lead_out_m)

                if preference == "shortest":
                    total_candidate_cost = lead_in_m + path_cost + lead_out_m
                else:
                    total_candidate_cost = lead_in_dur + path_cost + lead_out_dur

                if total_candidate_cost < best_score:
                    best_score = total_candidate_cost
                    best_path = candidate_path
                    best_entry = (start_node, lead_in_m, start_dir)
                    best_arrival = (end_node, lead_out_m, end_dir)

        if not best_path or best_entry is None or best_arrival is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No accessible road route found between origin and destination for profile '{selected_profile}'.",
            )

        # 6. Reconstruct continuous, gapless route geometry
        # A) Lead-in segment
        entry_node, lead_in_len, entry_dir = best_entry
        road_distance_m += lead_in_len
        road_duration_s += edge_duration_s(d1, lead_in_len)

        if entry_dir == "forward":
            slice_in = substring(e1_geom_wgs, f_orig * e1_geom_wgs.length, e1_geom_wgs.length)
            lead_in_pts = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in slice_in.coords]
        else:
            slice_in = substring(e1_geom_wgs, 0.0, f_orig * e1_geom_wgs.length)
            lead_in_pts = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in reversed(list(slice_in.coords))]

        # B) Intermediate path edges
        intermediate_pts: List[List[float]] = []
        for u, v in zip(best_path[:-1], best_path[1:]):
            e_dict = search_G.get_edge_data(u, v)
            best_k, best_d = min(e_dict.items(), key=lambda it: float(it[1].get("length", 10.0)))
            seg_len = float(best_d.get("length", 10.0))
            road_distance_m += seg_len
            road_duration_s += edge_duration_s(best_d, seg_len)

            if "geometry" in best_d and hasattr(best_d["geometry"], "coords"):
                raw_coords = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in best_d["geometry"].coords]
            else:
                raw_coords = [
                    [round(float(G.nodes[u]["x"]), 6), round(float(G.nodes[u]["y"]), 6)],
                    [round(float(G.nodes[v]["x"]), 6), round(float(G.nodes[v]["y"]), 6)],
                ]

            # Orient coordinates along traversal direction
            if not G.has_edge(u, v):
                # Reverse traversal in undirected view
                raw_coords = list(reversed(raw_coords))

            for pt in raw_coords:
                if not intermediate_pts or intermediate_pts[-1] != pt:
                    intermediate_pts.append(pt)

        # C) Lead-out segment
        arrival_node, lead_out_len, arrival_dir = best_arrival
        road_distance_m += lead_out_len
        road_duration_s += edge_duration_s(d2, lead_out_len)

        if arrival_dir == "forward":
            slice_out = substring(e2_geom_wgs, 0.0, f_dest * e2_geom_wgs.length)
            lead_out_pts = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in slice_out.coords]
        else:
            slice_out = substring(e2_geom_wgs, f_dest * e2_geom_wgs.length, e2_geom_wgs.length)
            lead_out_pts = [[round(float(c[0]), 6), round(float(c[1]), 6)] for c in reversed(list(slice_out.coords))]

        raw_all = lead_in_pts + intermediate_pts + lead_out_pts
        for pt in raw_all:
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

    # Access walking speed ~1.33 m/s (4.8 km/h)
    access_time_s = (orig_access_dist + dest_access_dist) / 1.33
    total_duration_s = road_duration_s + access_time_s
    total_duration_min = max(round(total_duration_s / 60.0), 1)

    advisory = None
    if mode == "walking":
        advisory = (
            "Sidewalks and pedestrian paths are not mapped on this road network. "
            "Route follows vehicular streets. Exercise caution."
        )
    elif mode == "car" and preference == "shortest":
        advisory = "Shortest route may include narrow residential roads. Exercise caution when passing."

    # External legacy representation compatibility
    external_mode = "two_wheeler" if mode == "motorcycle" else mode

    return {
        "status": "success",
        "mode": external_mode,
        "transport_mode": mode,
        "preference": preference,
        "route_preference": preference,
        "routing_profile": selected_profile,
        "profile": selected_profile,
        "summary": {
            "total_distance_meters": round(total_distance_m, 1),
            "total_distance_km": round(total_distance_m / 1000.0, 2),
            "total_duration_minutes": total_duration_min,
            "total_duration_seconds": round(total_duration_s, 1),
            "breakdown": {
                "origin_access_distance_m": orig_access_dist,
                "road_route_distance_m": round(road_distance_m, 1),
                "destination_access_distance_m": dest_access_dist,
                "road_duration_seconds": round(road_duration_s, 1),
                "access_duration_seconds": round(access_time_s, 1),
            },
        },
        "distance_m": round(total_distance_m, 1),
        "distance_km": round(total_distance_m / 1000.0, 2),
        "duration_s": round(total_duration_s, 1),
        "duration_min": total_duration_min,
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
