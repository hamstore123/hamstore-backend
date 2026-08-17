#!/usr/bin/env python3
"""
Check what CORS origins are actually configured at runtime
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env like server.py does
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / ".env")

# Parse CORS_ORIGINS exactly like server.py does
cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]

print("=" * 70)
print("CORS Runtime Configuration Check")
print("=" * 70)
print(f"\nRaw CORS_ORIGINS from environment: '{os.environ.get('CORS_ORIGINS', '')}'")
print(f"\nAfter parsing and filtering:")
print(f"  cors_origins list: {cors_origins}")
print(f"  Length: {len(cors_origins)}")
print(f"  Is empty: {len(cors_origins) == 0}")

if len(cors_origins) == 0:
    print("\n⚠️  WARNING: Empty CORS origins list!")
    print("   This means ALL cross-origin requests will be REJECTED")
    print("   The wildcard '*' was filtered out as intended by the code")
    print("\n   To fix, update /app/backend/.env:")
    print('   CORS_ORIGINS="https://hamstoretegal.com,https://www.hamstoretegal.com"')
else:
    print("\n✓ CORS origins configured:")
    for origin in cors_origins:
        print(f"   - {origin}")

print("\n" + "=" * 70)
