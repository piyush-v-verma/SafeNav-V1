import osmnx as ox
from collections import Counter

print("Loading graph...")
G = ox.load_graphml("backend/data/processed/nagpur_roads.graphml")
total_edges = len(G.edges)
print(f"Total edges: {total_edges:,}")

tags_to_check = [
    "highway", "maxspeed", "access", "vehicle", "motor_vehicle",
    "foot", "bicycle", "width", "lanes", "surface", "smoothness",
    "bridge", "tunnel", "layer", "oneway", "junction", "service",
    "name", "ref"
]

results = {}
for tag in tags_to_check:
    count = 0
    unique_vals = Counter()
    for _, _, d in G.edges(data=True):
        val = d.get(tag)
        if val is not None and str(val).strip() != "" and str(val) != "None":
            count += 1
            unique_vals[str(val)] += 1
    results[tag] = (count, (count / total_edges) * 100, unique_vals)

print("\n" + "=" * 65)
print(f"{'Attribute':<15} {'Populated Count':<18} {'Percentage':<12}")
print("=" * 65)
for tag in tags_to_check:
    count, pct, _ = results[tag]
    print(f"{tag:<15} {count:>12,}     {pct:>8.2f}%")

print("\n--- Detailed Breakdown of Key Attributes ---")
for tag in ["highway", "maxspeed", "access", "vehicle", "motor_vehicle", "foot", "bicycle", "width", "surface", "smoothness", "lanes", "bridge", "tunnel", "layer", "oneway"]:
    count, pct, uvals = results[tag]
    print(f"\nTop values for '{tag}' (Total: {count:,} / {pct:.1f}%):")
    if count == 0:
        print("   [Attribute not present in graph]")
    else:
        for val, freq in uvals.most_common(6):
            print(f"   {val:<30}: {freq:,} ({(freq/total_edges)*100:.2f}%)")
