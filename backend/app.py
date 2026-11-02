import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from backend.database import (
    init_db,
    create_report,
    get_report_by_code,
    append_victim_note,
    list_districts,
    get_police_cases,
    update_police_case_status
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="SafeVoice Anonymous Portal",
    description="Trauma-informed, zero-PII reporting platform connecting survivors anonymously with district police stations.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request Models ---

class ReportCreateRequest(BaseModel):
    complaint_text: Optional[str] = Field(None, description="Detailed statement to register the complaint")
    incident_location: str = Field(..., min_length=2, description="Where did the problem occur?")
    incident_date: str = Field(..., min_length=4, description="Date of the incident")
    approx_time: str = Field(..., min_length=2, description="Approximate time of the incident")
    district: str = Field(..., min_length=2, description="District name for police routing")
    city: str = Field(..., min_length=2, description="City / Town name")
    extra_details: Optional[str] = Field(None, description="Any extra details you can provide to help with the case")

class AppendNoteRequest(BaseModel):
    message: str = Field(..., min_length=3, description="Confidential follow-up details from survivor")

class PoliceStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Updated investigation status")
    officer_name: Optional[str] = Field(None, description="Badge or officer identifier")
    official_note: Optional[str] = Field(None, description="Official message to survivor")
    priority: Optional[str] = Field(None, description="Priority level")

# --- API Endpoints ---

@app.post("/api/reports", status_code=status.HTTP_201_CREATED)
def submit_report(payload: ReportCreateRequest):
    """
    Submits an anonymous complaint.
    Guarantees zero storage of victim personal identity.
    Generates and returns a unique case code.
    """
    try:
        report = create_report(
            incident_location=payload.incident_location,
            incident_date=payload.incident_date,
            approx_time=payload.approx_time,
            district=payload.district,
            city=payload.city,
            extra_details=payload.extra_details,
            complaint_text=payload.complaint_text
        )
        return {
            "success": True,
            "message": "Report securely lodged without personal identification. Your unique case code is generated.",
            "data": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit report: {str(e)}")

@app.get("/api/reports/{case_code}")
def get_report_status(case_code: str):
    """
    Retrieves anonymous report status and police notes using the unique case code.
    """
    report = get_report_by_code(case_code)
    if not report:
        raise HTTPException(status_code=404, detail="No case found matching this unique tracking code. Please verify the code.")
    return {
        "success": True,
        "data": report
    }

@app.post("/api/reports/{case_code}/append")
def append_followup(case_code: str, payload: AppendNoteRequest):
    """
    Allows the survivor to append additional evidence or details using only their unique code.
    """
    updated = append_victim_note(case_code, payload.message)
    if not updated:
        raise HTTPException(status_code=404, detail="Case not found.")
    return {
        "success": True,
        "message": "Additional details appended securely to your case file."
    }

@app.get("/api/police/districts")
def get_districts():
    """
    Returns list of districts with registered cases.
    """
    districts = list_districts()
    return {
        "success": True,
        "data": districts
    }

@app.get("/api/police/cases")
def query_police_cases(
    district: Optional[str] = Query(None, description="Filter by district name"),
    status: Optional[str] = Query(None, description="Filter by case status"),
    search: Optional[str] = Query(None, description="Search term across code, location, details")
):
    """
    District police station view: List all cases assigned to the jurisdiction.
    """
    cases = get_police_cases(district=district, status=status, search=search)
    return {
        "success": True,
        "count": len(cases),
        "data": cases
    }

@app.post("/api/police/cases/{case_code}/status")
def update_case_status(case_code: str, payload: PoliceStatusUpdateRequest):
    """
    Police station update endpoint: Updates investigation status and communicates updates to the survivor.
    """
    updated_report = update_police_case_status(
        case_code=case_code,
        status=payload.status,
        officer_name=payload.officer_name,
        official_note=payload.official_note,
        priority=payload.priority
    )
    if not updated_report:
        raise HTTPException(status_code=404, detail="Case code not found.")
    return {
        "success": True,
        "message": "Case status and official response updated successfully.",
        "data": updated_report
    }

# --- Frontend Static Files & SPA Route ---

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/")
def serve_home():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "SafeVoice API is running. Frontend index.html not yet created."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
