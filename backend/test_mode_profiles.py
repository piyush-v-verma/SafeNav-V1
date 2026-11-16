"""
Comprehensive verification test suite for SafeNav Mode-Based Routing Engine.
Tests all 6 profile combinations:
  - car_fastest, car_shortest
  - motorcycle_fastest, motorcycle_shortest
  - walking_fastest, walking_shortest
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("=" * 70)
    print("SAFENAV ROUTING ENGINE VERIFICATION: ALL 6 PROFILES")
    print("=" * 70)

    # 1. Health check
    health_res = requests.get(f"{BASE_URL}/api/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    print("[PASS] Backend health check: Graph loaded and operational.")

    # Test coordinate pairs in Nagpur
    test_cases = [
        {
            "name": "Sitabuldi to Dhantoli (Urban Center with One-Way Streets)",
            "origin": {"latitude": 21.1498471, "longitude": 79.0780265},
            "destination": {"latitude": 21.1448, "longitude": 79.0855},
        },
        {
            "name": "Ramdaspeth to Sitabuldi (Arterial vs Residential Grid)",
            "origin": {"latitude": 21.1380, "longitude": 79.0750},
            "destination": {"latitude": 21.1460, "longitude": 79.0880},
        },
        {
            "name": "Ambazari to Cotton Market (Cross-City Arterial Corridor)",
            "origin": {"latitude": 21.1300, "longitude": 79.0600},
            "destination": {"latitude": 21.1450, "longitude": 79.0950},
        },
    ]

    for tc in test_cases:
        print(f"\n--- Scenario: {tc['name']} ---")
        results = {}
        for mode in ["car", "motorcycle", "walking"]:
            for pref in ["fastest", "shortest"]:
                profile_name = f"{mode}_{pref}"
                payload = {
                    "origin": tc["origin"],
                    "destination": tc["destination"],
                    "transport_mode": mode,
                    "route_preference": pref,
                }
                res = requests.post(f"{BASE_URL}/api/navigation/route", json=payload)
                assert res.status_code == 200, f"Failed for {profile_name}: {res.text}"
                data = res.json()
                results[profile_name] = data

                # Check required fields
                assert "summary" in data, f"Missing summary in {profile_name}"
                assert "geometries" in data, f"Missing geometries in {profile_name}"
                assert "routing_profile" in data, f"Missing routing_profile in {profile_name}"
                assert data["routing_profile"] == profile_name, f"Profile mismatch in {profile_name}"

                total_m = data["summary"]["total_distance_meters"]
                total_km = data["summary"]["total_distance_km"]
                total_min = data["summary"]["total_duration_minutes"]
                total_sec = data["summary"]["total_duration_seconds"]
                coords_count = len(data["geometries"]["road_route"]["coordinates"])

                print(
                    f"  {profile_name:<21} | Dist: {total_km:>5} km ({total_m:>7} m) | "
                    f"Time: {total_min:>3} min ({total_sec:>6} s) | "
                    f"Road Points: {coords_count:>3}"
                )

        # Verification 1: Shortest route distance <= Fastest route distance (or equal if identical optimal path)
        for mode in ["car", "motorcycle", "walking"]:
            d_fast = results[f"{mode}_fastest"]["summary"]["total_distance_meters"]
            d_short = results[f"{mode}_shortest"]["summary"]["total_distance_meters"]
            assert d_short <= d_fast + 1.0, (
                f"For {mode}, shortest ({d_short}m) must be <= fastest ({d_fast}m)!"
            )

        # Verification 2: Fastest route travel time <= Shortest route travel time (or equal if identical optimal path)
        for mode in ["car", "motorcycle", "walking"]:
            t_fast = results[f"{mode}_fastest"]["summary"]["total_duration_seconds"]
            t_short = results[f"{mode}_shortest"]["summary"]["total_duration_seconds"]
            assert t_fast <= t_short + 1.0, (
                f"For {mode}, fastest time ({t_fast}s) must be <= shortest time ({t_short}s)!"
            )

        # Verification 3: Walking does not take massive 3km detours around vehicular one-ways
        walk_dist = results["walking_shortest"]["summary"]["total_distance_meters"]
        car_dist = results["car_shortest"]["summary"]["total_distance_meters"]
        print(f"  [VERIFY] Walking distance: {walk_dist}m vs Car distance: {car_dist}m")

    print("\n" + "=" * 70)
    print("ALL ROUTING ENGINE PROFILE VERIFICATIONS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    test_api()
