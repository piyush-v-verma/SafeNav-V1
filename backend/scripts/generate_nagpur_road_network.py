"""
SafeNav V1 - Nagpur Road Network Generator
Downloads the official Nagpur City (Municipal Corporation) boundary and driving road network
from OpenStreetMap, processes it into a NetworkX MultiDiGraph, and saves GraphML and GPKG outputs.
"""

import os
import sys
from pathlib import Path
from collections import Counter
import geopandas as gpd
import networkx as nx
import osmnx as ox
from shapely.geometry import Polygon, MultiPolygon

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
CACHE_DIR = BASE_DIR / "data" / "cache"

BOUNDARY_GEOJSON = RAW_DATA_DIR / "nagpur_boundary.geojson"
GRAPHML_OUTPUT = PROCESSED_DATA_DIR / "nagpur_roads.graphml"
GPKG_OUTPUT = PROCESSED_DATA_DIR / "nagpur_roads.gpkg"


def setup_directories():
    """Ensure output directories exist."""
    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def inspect_and_get_boundary():
    """
    Step 1: Inspect the study area boundary.
    Queries OpenStreetMap for Nagpur City / Municipal Corporation boundary,
    validates the geographic extent and administrative level, and saves as GeoJSON.
    """
    print("\n" + "=" * 60)
    print("STEP 1: Inspecting Study Area Boundary")
    print("=" * 60)

    # In OSM, 'Nagpur Municipal Corporation' geocodes to the municipal office building.
    # The administrative municipal area is Relation 12969115 (Nagpur City, admin_level 8).
    # We query 'Nagpur, Maharashtra, India' and verify the admin_level and area.
    query = {"city": "Nagpur", "state": "Maharashtra", "country": "India"}
    print(f"Geocoding query: {query}")

    gdf = ox.geocode_to_gdf(query)

    if gdf.empty:
        raise ValueError("Could not find boundary for Nagpur, Maharashtra, India.")

    row = gdf.iloc[0]
    osm_name = row.get("name", "N/A")
    display_name = row.get("display_name", "N/A")
    osm_type = row.get("osm_type", "N/A")
    osm_id = row.get("osm_id", "N/A")
    geom = row.geometry
    bounds = geom.bounds  # (minx, miny, maxx, maxy)

    # Compute area in sq km (projected to UTM 44N)
    gdf_utm = gdf.to_crs(epsg=32644)
    area_sqkm = gdf_utm.geometry.area.iloc[0] / 1e6

    print(f"OSM Name:       {osm_name}")
    print(f"Display Name:   {display_name}")
    print(f"OSM Type & ID:  {osm_type} {osm_id}")
    print(f"Class / Type:   {row.get('class', 'N/A')} / {row.get('type', 'N/A')}")
    print(f"Bounding Box:   Lon ({bounds[0]:.4f} to {bounds[2]:.4f}), Lat ({bounds[1]:.4f} to {bounds[3]:.4f})")
    print(f"Enclosed Area:  {area_sqkm:.2f} sq km")

    # Safety checks:
    # Nagpur district is ~9,890 sq km. Nagpur municipal city is ~210 - 220 sq km.
    if area_sqkm > 1000:
        raise RuntimeError(
            f"ERROR: Returned boundary has area of {area_sqkm:.2f} sq km, which represents "
            "Nagpur District rather than Nagpur Municipal Corporation city limits! Stopping."
        )

    if area_sqkm < 10:
        raise RuntimeError(
            f"ERROR: Returned boundary has area of {area_sqkm:.2f} sq km, which represents "
            "a single building or locality rather than the city boundary! Stopping."
        )

    print(f"-> Verified: Boundary corresponds to Nagpur City municipal limits (~{area_sqkm:.2f} sq km).")

    # Save to GeoJSON
    gdf.to_file(BOUNDARY_GEOJSON, driver="GeoJSON")
    print(f"-> Saved boundary GeoJSON to: {BOUNDARY_GEOJSON}")

    return geom


def download_road_network(polygon):
    """
    Step 2: Download the driving road network inside the verified boundary.
    Configures caching and preserves relevant road tags.
    """
    print("\n" + "=" * 60)
    print("STEP 2: Downloading Driving Road Network from OpenStreetMap")
    print("=" * 60)

    # Configure OSMnx settings
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(CACHE_DIR)
    ox.settings.log_console = True

    # Ensure required tags are preserved in way attributes
    required_tags = {
        "highway",
        "name",
        "oneway",
        "bridge",
        "tunnel",
        "layer",
        "junction",
        "access",
        "maxspeed",
        "lanes",
        "ref",
        "width",
    }
    ox.settings.useful_tags_way = list(set(ox.settings.useful_tags_way) | required_tags)

    print(f"Active useful_tags_way: {ox.settings.useful_tags_way}")
    print("Downloading graph (network_type='drive', simplify=True, retain_all=True, truncate_by_edge=True)...")

    # Download graph from the boundary polygon
    G = ox.graph_from_polygon(
        polygon,
        network_type="drive",
        simplify=True,
        retain_all=True,
        truncate_by_edge=True,
    )

    print(f"-> Raw download complete: {len(G.nodes)} nodes, {len(G.edges)} edges.")
    return G


def validate_and_save_graph(G):
    """
    Step 3, 4 & 5: Validate the graph, ensure geometries are preserved,
    save to GraphML and GPKG, and print comprehensive metrics.
    """
    print("\n" + "=" * 60)
    print("STEP 3 & 4: Validating and Saving Output Files")
    print("=" * 60)

    # MultiDiGraph verification
    is_multidigraph = isinstance(G, nx.MultiDiGraph)
    is_directed = G.is_directed()
    print(f"Graph Type:             {type(G).__name__} (is_multidigraph: {is_multidigraph})")
    print(f"Is Directed:            {is_directed}")

    if not is_multidigraph or not is_directed:
        raise TypeError("Graph is not a directed MultiDiGraph!")

    # Check geometry preservation
    edges_with_geom = sum(1 for _, _, data in G.edges(data=True) if "geometry" in data)
    print(f"Total Edges:            {G.number_of_edges()}")
    print(f"Edges with Geometries:  {edges_with_geom} ({(edges_with_geom / max(1, G.number_of_edges())) * 100:.1f}%)")

    # Save to GraphML
    print(f"\nSaving GraphML to: {GRAPHML_OUTPUT} ...")
    ox.save_graphml(G, filepath=GRAPHML_OUTPUT)

    # Save to GeoPackage (GPKG)
    print(f"Saving GeoPackage to: {GPKG_OUTPUT} ...")
    ox.save_graph_geopackage(G, filepath=GPKG_OUTPUT, directed=True)

    # File sizes
    boundary_size = os.path.getsize(BOUNDARY_GEOJSON) / 1024
    graphml_size = os.path.getsize(GRAPHML_OUTPUT) / (1024 * 1024)
    gpkg_size = os.path.getsize(GPKG_OUTPUT) / (1024 * 1024)

    # Step 5: Detailed Statistics
    print("\n" + "=" * 60)
    print("STEP 5: Validation & Network Statistics")
    print("=" * 60)

    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # Connected components
    # MultiDiGraph has weakly and strongly connected components
    weakly_connected = nx.number_weakly_connected_components(G)
    strongly_connected = nx.number_strongly_connected_components(G)

    # Bridge and tunnel edges
    bridge_edges = 0
    tunnel_edges = 0
    layer_edges = 0
    highway_counter = Counter()

    for _, _, data in G.edges(data=True):
        # Bridge check
        bridge = data.get("bridge")
        if bridge and bridge not in ("no", "0", False):
            bridge_edges += 1

        # Tunnel check
        tunnel = data.get("tunnel")
        if tunnel and tunnel not in ("no", "0", False):
            tunnel_edges += 1

        # Layer check
        layer = data.get("layer")
        if layer is not None and str(layer) != "0":
            layer_edges += 1

        # Highway classification
        hw = data.get("highway")
        if isinstance(hw, list):
            for h in hw:
                highway_counter[str(h)] += 1
        else:
            highway_counter[str(hw)] += 1

    print(f"Total Nodes:                      {num_nodes:,}")
    print(f"Total Directed Edges:             {num_edges:,}")
    print(f"Weakly Connected Components:      {weakly_connected:,}")
    print(f"Strongly Connected Components:    {strongly_connected:,}")
    print(f"Bridge Edges:                     {bridge_edges:,}")
    print(f"Tunnel Edges:                     {tunnel_edges:,}")
    print(f"Edges with non-zero Layer info:   {layer_edges:,}")

    print("\nDistribution of Road Classifications (highway tags):")
    print("-" * 50)
    for hw, count in highway_counter.most_common():
        percentage = (count / num_edges) * 100
        print(f"  {hw:<25} {count:>7,}  ({percentage:>5.1f}%)")
    print("-" * 50)

    print("\nOutput File Sizes:")
    print(f"  - nagpur_boundary.geojson:  {boundary_size:,.1f} KB")
    print(f"  - nagpur_roads.graphml:     {graphml_size:,.2f} MB")
    print(f"  - nagpur_roads.gpkg:        {gpkg_size:,.2f} MB")
    print("=" * 60)
    print("Nagpur Road Network Generation Completed Successfully.")
    print("=" * 60 + "\n")


def main():
    setup_directories()
    boundary_geom = inspect_and_get_boundary()
    G = download_road_network(boundary_geom)
    validate_and_save_graph(G)


if __name__ == "__main__":
    main()
