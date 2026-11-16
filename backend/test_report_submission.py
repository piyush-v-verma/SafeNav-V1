import base64
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    print("=" * 60)
    print("TESTING SAFENAV M07 CITIZEN REPORTING ENDPOINT (IN-PROCESS)")
    print("=" * 60)

    client = TestClient(app)

    # Minimal valid 1x1 JPEG
    tiny_jpeg = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4"
        b"\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00"
        b"\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    )
    b64_jpeg = "data:image/jpeg;base64," + base64.b64encode(tiny_jpeg).decode("ascii")

    # Test 1: Full submission with optional description
    payload1 = {
        "image": b64_jpeg,
        "image_filename": "pothole_sitabuldi.jpg",
        "description": "Deep pothole near Sitabuldi flyover entry",
        "latitude": 21.149847,
        "longitude": 79.078026,
        "accuracy": 12.0,
    }

    res1 = client.post("/api/v1/reports", json=payload1)
    assert res1.status_code == 201, f"Failed: {res1.status_code} - {res1.text}"
    d1 = res1.json()
    assert d1["status"] == "success"
    assert d1["status_text"] == "Processing"
    assert "report_id" in d1
    report_id_1 = d1["report_id"]
    print(f"[PASS] Test 1: Submitted report with description: ID = {report_id_1}")

    # Test 2: Minimal submission without description (strictly photo + GPS)
    payload2 = {
        "image": b64_jpeg,
        "latitude": 21.144800,
        "longitude": 79.085500,
        "accuracy": 8.0,
    }
    res2 = client.post("/api/v1/reports", json=payload2)
    assert res2.status_code == 201, f"Failed: {res2.status_code} - {res2.text}"
    d2 = res2.json()
    assert d2["status"] == "success"
    assert d2["data"]["has_description"] is False
    report_id_2 = d2["report_id"]
    print(f"[PASS] Test 2: Submitted report WITHOUT description: ID = {report_id_2}")

    # Test 3: Reject empty/corrupted image
    res3 = client.post("/api/v1/reports", json={
        "image": "not_an_image",
        "latitude": 21.1498,
        "longitude": 79.0780,
    })
    assert res3.status_code == 422, f"Expected 422, got {res3.status_code}"
    print(f"[PASS] Test 3: Rejected corrupted/invalid image format with 422: {res3.json().get('detail')}")

    # Test 4: Fetch report status by ID
    res4 = client.get(f"/api/v1/reports/{report_id_1}")
    assert res4.status_code == 200, f"Failed to get report: {res4.text}"
    d4 = res4.json()
    assert d4["data"]["status"] == "processing"
    assert d4["data"]["has_description"] is True
    print(f"[PASS] Test 4: Retrieved report {report_id_1}: status = {d4['data']['status']}")

    print("\n" + "=" * 60)
    print("ALL CITIZEN REPORTING ENDPOINT TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
