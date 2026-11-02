import sqlite3
import secrets
import string
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).resolve().parent.parent / "safevoice.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Reports table - zero victim PII stored
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            case_code TEXT PRIMARY KEY,
            complaint_text TEXT DEFAULT '',
            incident_location TEXT NOT NULL,
            incident_date TEXT NOT NULL,
            approx_time TEXT NOT NULL,
            district TEXT NOT NULL,
            city TEXT NOT NULL,
            extra_details TEXT,
            status TEXT NOT NULL DEFAULT 'Registered',
            priority TEXT NOT NULL DEFAULT 'Normal',
            assigned_officer TEXT DEFAULT 'Pending Assignment',
            created_at TEXT NOT NULL
        )
    """)

    # Migration check for existing databases
    cursor.execute("PRAGMA table_info(reports)")
    cols = [col[1] for col in cursor.fetchall()]
    if "complaint_text" not in cols:
        cursor.execute("ALTER TABLE reports ADD COLUMN complaint_text TEXT DEFAULT ''")

    # Case updates / police notes table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS case_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_code TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (case_code) REFERENCES reports(case_code) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

def generate_unique_code(district: str) -> str:
    """
    Generates a human-readable, secure unique case code.
    Format: SV-<3-char district prefix>-<6-char secure alphanumeric token>
    Example: SV-CEN-9X4K2P
    """
    clean_dist = "".join([c for c in district.upper() if c.isalnum()])[:3]
    if len(clean_dist) < 3:
        clean_dist = (clean_dist + "SEC")[:3]
    
    alphabet = string.ascii_uppercase + "23456789"  # omit ambiguous 0, O, 1, I
    token = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"SV-{clean_dist}-{token}"

def create_report(
    incident_location: str,
    incident_date: str,
    approx_time: str,
    district: str,
    city: str,
    extra_details: Optional[str] = None,
    complaint_text: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    # Generate an unused unique code
    for _ in range(10):
        code = generate_unique_code(district)
        cursor.execute("SELECT 1 FROM reports WHERE case_code = ?", (code,))
        if not cursor.fetchone():
            break

    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    cursor.execute("""
        INSERT INTO reports (
            case_code, complaint_text, incident_location, incident_date, approx_time,
            district, city, extra_details, status, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Registered', 'Normal', ?)
    """, (
        code,
        (complaint_text or "").strip(),
        incident_location.strip(),
        incident_date.strip(),
        approx_time.strip(),
        district.strip(),
        city.strip(),
        (extra_details or "").strip(),
        created_at
    ))

    # Add initial system confirmation update
    cursor.execute("""
        INSERT INTO case_updates (case_code, sender, message, created_at)
        VALUES (?, 'SafeVoice System', 'Complaint securely registered and routed to the ' || ? || ' District Police Station.', ?)
    """, (code, district.strip(), created_at))

    conn.commit()
    conn.close()

    return get_report_by_code(code)

def get_report_by_code(case_code: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE case_code = ?", (case_code.strip().upper(),))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return None

    report = dict(row)

    cursor.execute("""
        SELECT sender, message, created_at
        FROM case_updates
        WHERE case_code = ?
        ORDER BY id ASC
    """, (case_code.strip().upper(),))
    report["updates"] = [dict(u) for u in cursor.fetchall()]

    conn.close()
    return report

def append_victim_note(case_code: str, note: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM reports WHERE case_code = ?", (case_code.strip().upper(),))
    if not cursor.fetchone():
        conn.close()
        return False

    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cursor.execute("""
        INSERT INTO case_updates (case_code, sender, message, created_at)
        VALUES (?, 'Survivor (Confidential Follow-up)', ?, ?)
    """, (case_code.strip().upper(), note.strip(), created_at))
    conn.commit()
    conn.close()
    return True

def list_districts() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT district, COUNT(*) as count,
               SUM(CASE WHEN status != 'Resolved' THEN 1 ELSE 0 END) as active_count
        FROM reports
        GROUP BY district
        ORDER BY district ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_police_cases(
    district: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM reports WHERE 1=1"
    params = []

    if district and district.strip().lower() != "all":
        query += " AND LOWER(district) = LOWER(?)"
        params.append(district.strip())

    if status and status.strip().lower() != "all":
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query += """ AND (
            case_code LIKE ? OR 
            incident_location LIKE ? OR 
            city LIKE ? OR 
            extra_details LIKE ? OR
            complaint_text LIKE ?
        )"""
        params.extend([term, term, term, term, term])

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    cases = []
    for r in rows:
        c = dict(r)
        # Fetch latest update count
        cursor.execute("SELECT COUNT(*) as count FROM case_updates WHERE case_code = ?", (c["case_code"],))
        c["update_count"] = cursor.fetchone()["count"]
        cases.append(c)

    conn.close()
    return cases

def update_police_case_status(
    case_code: str,
    status: str,
    officer_name: Optional[str] = None,
    official_note: Optional[str] = None,
    priority: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM reports WHERE case_code = ?", (case_code.strip().upper(),))
    report = cursor.fetchone()
    if not report:
        conn.close()
        return None

    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    update_fields = ["status = ?"]
    params = [status]

    if officer_name:
        update_fields.append("assigned_officer = ?")
        params.append(officer_name.strip())

    if priority:
        update_fields.append("priority = ?")
        params.append(priority.strip())

    params.append(case_code.strip().upper())
    cursor.execute(f"UPDATE reports SET {', '.join(update_fields)} WHERE case_code = ?", params)

    # If police left a note or status changed, log in case_updates
    sender = f"District Police Station ({officer_name or 'Investigating Unit'})"
    msg_parts = [f"Status updated to: {status}"]
    if official_note and official_note.strip():
        msg_parts.append(f"Official Note: {official_note.strip()}")
    full_message = " — ".join(msg_parts)

    cursor.execute("""
        INSERT INTO case_updates (case_code, sender, message, created_at)
        VALUES (?, ?, ?, ?)
    """, (case_code.strip().upper(), sender, full_message, created_at))

    conn.commit()
    conn.close()
    return get_report_by_code(case_code)
