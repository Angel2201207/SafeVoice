import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app
from backend.database import init_db

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_health_check_or_home():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200

def test_anonymous_report_submission_and_code_generation():
    client = TestClient(app)
    payload = {
        "complaint_text": "I was walking home from the station when an unidentified individual approached from behind and physically assaulted me.",
        "incident_location": "Near Central Metro Station Exit 3, 5th Avenue",
        "incident_date": "2026-10-31",
        "approx_time": "Around 9:30 PM",
        "district": "North District",
        "city": "Metro City",
        "extra_details": "Perpetrator was wearing a dark blue hoodie, approx 5'10. Left on a silver scooter heading north."
    }
    
    response = client.post("/api/reports", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    report = data["data"]
    
    # Assert code generated is unique and matches format
    code = report["case_code"]
    assert code.startswith("SV-NOR-")
    assert len(code) == 13
    assert report["district"] == "North District"
    assert report["city"] == "Metro City"
    assert report["status"] == "Registered"
    assert report["complaint_text"] == payload["complaint_text"]
    assert report["extra_details"] == payload["extra_details"]
    
    # Verify no personal details are in the record
    assert "victim_name" not in report
    assert "email" not in report
    assert "phone" not in report

def test_police_portal_view_by_district():
    client = TestClient(app)
    
    # Register two reports in distinct districts
    client.post("/api/reports", json={
        "incident_location": "South Park Lane",
        "incident_date": "2026-11-01",
        "approx_time": "Evening 7:00 PM",
        "district": "South District",
        "city": "Metro City",
        "extra_details": "Witnesses may include a tea vendor near the park gate."
    })
    
    client.post("/api/reports", json={
        "incident_location": "East Commercial Plaza",
        "incident_date": "2026-11-01",
        "approx_time": "Late Night 1:00 AM",
        "district": "East District",
        "city": "Metro City",
        "extra_details": "CCTV camera observed near the bank ATM."
    })
    
    # Query South District police station
    resp_south = client.get("/api/police/cases?district=South District")
    assert resp_south.status_code == 200
    cases_south = resp_south.json()["data"]
    assert len(cases_south) >= 1
    assert all(c["district"] == "South District" for c in cases_south)
    
    # Query East District police station
    resp_east = client.get("/api/police/cases?district=East District")
    assert resp_east.status_code == 200
    cases_east = resp_east.json()["data"]
    assert len(cases_east) >= 1
    assert all(c["district"] == "East District" for c in cases_east)

def test_police_status_update_and_victim_tracking():
    client = TestClient(app)
    
    # Submit report
    submit_resp = client.post("/api/reports", json={
        "incident_location": "West Boulevard, near bus stop 14",
        "incident_date": "2026-11-02",
        "approx_time": "Morning 10:15 AM",
        "district": "West District",
        "city": "West City",
        "extra_details": "Black backpack left behind by assailant."
    })
    case_code = submit_resp.json()["data"]["case_code"]
    
    # Police updates status
    update_payload = {
        "status": "Active Investigation",
        "officer_name": "Inspector R. Sharma (Badge #812)",
        "official_note": "Forensic team dispatched to secure the backpack and review local shop CCTV.",
        "priority": "High"
    }
    update_resp = client.post(f"/api/police/cases/{case_code}/status", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["status"] == "Active Investigation"
    assert update_resp.json()["data"]["assigned_officer"] == "Inspector R. Sharma (Badge #812)"
    
    # Survivor looks up status using only their unique code
    track_resp = client.get(f"/api/reports/{case_code}")
    assert track_resp.status_code == 200
    survivor_view = track_resp.json()["data"]
    assert survivor_view["status"] == "Active Investigation"
    assert any("Forensic team dispatched" in u["message"] for u in survivor_view["updates"])

def test_append_victim_additional_details():
    client = TestClient(app)
    
    # Submit report
    submit_resp = client.post("/api/reports", json={
        "incident_location": "Central Arcade",
        "incident_date": "2026-11-01",
        "approx_time": "Afternoon 3:00 PM",
        "district": "Central District",
        "city": "Capital",
        "extra_details": "Initial details."
    })
    case_code = submit_resp.json()["data"]["case_code"]
    
    # Survivor appends note anonymously
    append_resp = client.post(f"/api/reports/{case_code}/append", json={
        "message": "I remembered the suspect had a dragon tattoo on their left wrist."
    })
    assert append_resp.status_code == 200
    
    # Verify in case status
    track_resp = client.get(f"/api/reports/{case_code}")
    updates = track_resp.json()["data"]["updates"]
    assert any("dragon tattoo" in u["message"] for u in updates)
