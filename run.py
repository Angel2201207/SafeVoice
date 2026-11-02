import uvicorn
import os
import sys
from pathlib import Path

# Ensure project root is in python path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    print("=" * 60)
    print(" SafeVoice — Anonymous Sexual Assault Incident Portal")
    print("=" * 60)
    print(" Running locally at: http://127.0.0.1:8000")
    print(" API Documentation at: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
