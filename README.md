# SafeVoice 🛡️

**SafeVoice** is a secure, trauma-informed, privacy-first web application designed for sexual assault survivors to lodge complaints without revealing any personal identity details.

Each complaint is assigned a **Unique Case Code** (`SV-DIST-XXXXXX`), securely routed to the designated Police Station of the respective district, and can be tracked confidentially without any personal information.

---

## Key Features

1. **Strict No-PII Policy**:
   - Zero victim identification collected (no name, phone, email, identity cards, or IP addresses).
   - The user is identified solely by their secure alphanumeric case code.

2. **Required Incident Intake (Page 1)**:
   - Where did the problem occur? (Specific location / landmark)
   - Incident Date
   - Approximate Time (with quick-select time period chips)
   - City and District Name (for police station jurisdiction routing)
   - Explicit prompt: *"Is there any extra details you can provide to help with the case?"*

3. **Unique Case Code Generation (Page 2)**:
   - Cryptographically random, human-readable case token (e.g. `SV-CEN-9X4K2P`).
   - One-click copy, download private text token (`.txt`), or print safe summary.
   - Used for all anonymous follow-up inquiries.

4. **District Police Station Dashboard**:
   - Police officers can filter cases by their district station (e.g., Central District, North District, South District, etc.).
   - Review incident dossiers, timings, locations, and survivor extra details.
   - Update investigation statuses (`Registered`, `Under Assessment`, `Active Investigation`, `Evidence Secured`, `Resolved`).
   - Post official messages/updates that survivors can read confidentially using their unique case code.

5. **Survivor Follow-up Channel**:
   - Survivors can append supplementary evidence or details (e.g. newly remembered markings, vehicle details) anonymously at any time using their unique code.

6. **Safety & Quick Exit (Esc)**:
   - Instant panic button and `Escape` key trigger immediately redirects to Google and clears form memory.

---

## Getting Started

### Prerequisites
- Python 3.10+ (or [uv](https://github.com/astral-sh/uv))

### Running the Application

Run with `uv`:
```bash
uv run python run.py
```

Or using standard Python:
```bash
pip install -e .
python run.py
```

Open your browser at:
- **Application Portal**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Running Automated Tests

```bash
uv run pytest tests/test_api.py -v
```
