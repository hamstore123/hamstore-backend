"""READ-ONLY backend API tests for Toko HP.
Production Atlas DB - no writes allowed.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to reading frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")

EMAIL = "admin@tokohp.com"
PASSWORD = "admin123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data or "access_token" in data
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# --- Auth ---
def test_login_ok():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert (body.get("token") or body.get("access_token"))


def test_login_bad_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": "wrong"}, timeout=30)
    assert r.status_code in (400, 401)


def test_me(client):
    r = client.get(f"{BASE_URL}/api/auth/me", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d.get("email") == EMAIL
    assert d.get("role") == "owner"


# --- Dashboard ---
def test_dashboard_summary(client):
    r = client.get(f"{BASE_URL}/api/dashboard/summary", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["sales_today", "sales_month", "products_count", "customers_count", "trend_7d"]:
        assert k in d, f"Missing {k} in dashboard summary. Got keys: {list(d.keys())}"
    assert isinstance(d["trend_7d"], list)
    print(f"Dashboard: products={d['products_count']} customers={d['customers_count']}")


# --- Read-only list endpoints ---
LIST_ENDPOINTS = [
    ("/api/products", 81),
    ("/api/customers", 161),
    ("/api/suppliers", None),
    ("/api/hp-prices", None),
    ("/api/service-prices", None),
    ("/api/services", None),
    ("/api/expenses", None),
    ("/api/debts", None),
    ("/api/attendance", None),
    ("/api/ppob", None),
    ("/api/tasks", None),
    ("/api/content-posts", None),
    ("/api/staff", None),
    ("/api/stock/movements", None),
    ("/api/stock/opname", None),
    ("/api/purchases", None),
    ("/api/sales", None),
]


@pytest.mark.parametrize("path,expected_min", LIST_ENDPOINTS)
def test_list_endpoints(client, path, expected_min):
    r = client.get(f"{BASE_URL}{path}", timeout=60)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
    data = r.json()
    assert isinstance(data, (list, dict)), f"{path} unexpected type"
    if isinstance(data, list) and expected_min:
        assert len(data) >= expected_min, f"{path} has {len(data)}, expected >= {expected_min}"
    # No mongo _id leakage
    if isinstance(data, list) and data:
        assert "_id" not in data[0], f"{path} leaks mongo _id"


def test_hp_prices_count(client):
    r = client.get(f"{BASE_URL}/api/hp-prices", timeout=60)
    assert r.status_code == 200
    assert len(r.json()) >= 400


def test_service_prices_count(client):
    r = client.get(f"{BASE_URL}/api/service-prices", timeout=60)
    assert r.status_code == 200
    assert len(r.json()) >= 300


def test_report_pl(client):
    r = client.get(f"{BASE_URL}/api/reports/profit-loss", params={"start": "2025-01-01", "end": "2025-12-31T23:59:59"}, timeout=60)
    assert r.status_code == 200
    d = r.json()
    # Sanity - should include some numeric fields
    assert isinstance(d, dict)
    print("Report PL keys:", list(d.keys()))


def test_performance_summary(client):
    r = client.get(f"{BASE_URL}/api/performance/summary", timeout=60)
    assert r.status_code == 200


def test_no_auth_rejected():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code in (401, 403)
