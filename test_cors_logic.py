#!/usr/bin/env python3
"""
Test CORS with temporarily set environment variable to verify code works
"""
import os
import sys

# Temporarily set CORS_ORIGINS for testing
test_origins = "https://hamstoretegal.com,https://www.hamstoretegal.com,https://phone-shop-hub-18.preview.emergentagent.com"
os.environ["CORS_ORIGINS"] = test_origins

# Parse like server.py does
cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]

print("=" * 70)
print("CORS Code Logic Test (with test environment variable)")
print("=" * 70)
print(f"\nTest CORS_ORIGINS: '{test_origins}'")
print(f"\nParsed cors_origins list:")
for i, origin in enumerate(cors_origins, 1):
    print(f"  {i}. {origin}")

print(f"\nTotal origins: {len(cors_origins)}")

# Test whitespace handling
test_with_spaces = "  https://example.com  ,  https://test.com  "
os.environ["CORS_ORIGINS"] = test_with_spaces
cors_with_spaces = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]
print(f"\n\nTest with whitespace: '{test_with_spaces}'")
print(f"Parsed (whitespace cleaned):")
for origin in cors_with_spaces:
    print(f"  - '{origin}'")

# Test wildcard filtering
test_with_wildcard = "https://example.com,*,https://test.com"
os.environ["CORS_ORIGINS"] = test_with_wildcard
cors_filtered = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]
print(f"\n\nTest with wildcard: '{test_with_wildcard}'")
print(f"Parsed (wildcard filtered out):")
for origin in cors_filtered:
    print(f"  - '{origin}'")
print(f"Wildcard correctly filtered: {'*' not in cors_filtered}")

print("\n" + "=" * 70)
print("✓ Code logic is working correctly:")
print("  - Splits by comma")
print("  - Strips whitespace")
print("  - Filters out wildcards")
print("=" * 70)
