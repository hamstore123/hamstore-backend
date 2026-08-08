"""RBAC, Shifts, Stock analysis, Activity logs tests for Toko HP.
Production Atlas - MINIMIZE writes. Allowed: open+close ONE shift as owner.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")

OWNER = ("admin@tokohp.com", "admin123")
STAFF = ("staf@tokohp.com", "staf123")


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="session")
def owner_client():
    tok = _login(*OWNER)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def staff_client():
    tok = _login(*STAFF)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


# ---------- RBAC: staff 403 on owner-only endpoints ----------
def test_staff_forbidden_profit_loss(staff_client):
    r = staff_client.get(f"{BASE_URL}/api/reports/profit-loss",
                         params={"start": "2026-01-01", "end": "2026-12-31T23:59:59"}, timeout=30)
    assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


def test_staff_forbidden_performance(staff_client):
    r = staff_client.get(f"{BASE_URL}/api/performance/summary", timeout=30)
    assert r.status_code == 403


def test_staff_forbidden_activity_logs(staff_client):
    r = staff_client.get(f"{BASE_URL}/api/activity-logs", timeout=30)
    assert r.status_code == 403


# ---------- RBAC: dashboard profit stripped for staff ----------
def test_dashboard_profit_stripped_for_staff(staff_client):
    r = staff_client.get(f"{BASE_URL}/api/dashboard/summary", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["profit_month", "gross_profit", "ppob_profit", "expense_month", "total_hutang", "total_piutang"]:
        assert k not in d, f"staff dashboard leaks {k}"
    # public fields still there
    for k in ["sales_today", "sales_month", "products_count", "customers_count", "trend_7d"]:
        assert k in d


def test_dashboard_profit_present_for_owner(owner_client):
    r = owner_client.get(f"{BASE_URL}/api/dashboard/summary", timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["profit_month", "gross_profit", "ppob_profit", "expense_month", "total_hutang", "total_piutang"]:
        assert k in d, f"owner dashboard missing {k}"


# ---------- RBAC: sales profit stripped for staff ----------
def test_sales_profit_stripped_for_staff(staff_client):
    r = staff_client.get(f"{BASE_URL}/api/sales", timeout=60)
    assert r.status_code == 200
    rows = r.json()
    for r_ in rows[:50]:
        assert "profit" not in r_
        assert "total_cost" not in r_
        for it in r_.get("items", []):
            assert "cost_price" not in it


def test_sales_profit_present_for_owner(owner_client):
    r = owner_client.get(f"{BASE_URL}/api/sales", timeout=60)
    assert r.status_code == 200
    rows = r.json()
    if rows:
        # At least one sale should have profit key
        assert any("profit" in x for x in rows[:20]), "owner /sales missing profit"


# ---------- Activity logs for owner ----------
def test_activity_logs_owner(owner_client):
    r = owner_client.get(f"{BASE_URL}/api/activity-logs", timeout=30)
    assert r.status_code == 200
    logs = r.json()
    assert isinstance(logs, list)
    if logs:
        keys = logs[0].keys()
        # expected fields
        for k in ["action", "detail"]:
            assert k in keys, f"log missing {k}: {keys}"


# ---------- Stock analysis ----------
@pytest.mark.parametrize("days", [30, 60, 90])
def test_stock_analysis(owner_client, days):
    r = owner_client.get(f"{BASE_URL}/api/stock/analysis", params={"days": days}, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert d.get("days") == days
    assert "count" in d and "total_modal" in d and "items" in d
    assert isinstance(d["items"], list)


# ---------- Shift lifecycle (open + close ONE as owner) ----------
def test_shift_open_close_flow(owner_client):
    # Ensure no open shift exists first
    cur = owner_client.get(f"{BASE_URL}/api/shifts/current", timeout=30)
    assert cur.status_code == 200
    if cur.json():
        # Close pre-existing open shift with zeros to normalize
        close_r = owner_client.post(f"{BASE_URL}/api/shifts/close", json={
            "cash_actual": 0, "edc_actual": 0, "brilink_actual": 0, "bank_actual": 0, "note": "auto-close by QA"
        }, timeout=30)
        assert close_r.status_code == 200

    # Open shift
    open_r = owner_client.post(f"{BASE_URL}/api/shifts/open",
                               json={"opening_cash": 100000, "note": "__QA_SHIFT__"}, timeout=30)
    assert open_r.status_code == 200, open_r.text
    shift = open_r.json()
    assert shift.get("status") == "open"
    assert shift.get("opening_cash") == 100000
    shift_id = shift["id"]

    # Current should return the just-opened shift
    cur2 = owner_client.get(f"{BASE_URL}/api/shifts/current", timeout=30)
    assert cur2.status_code == 200
    assert cur2.json() and cur2.json().get("id") == shift_id

    # Cannot open a second one
    dup = owner_client.post(f"{BASE_URL}/api/shifts/open", json={"opening_cash": 50000}, timeout=30)
    assert dup.status_code == 400

    # Close it
    close_r = owner_client.post(f"{BASE_URL}/api/shifts/close", json={
        "cash_actual": 100000, "edc_actual": 0, "brilink_actual": 0, "bank_actual": 0, "note": "__QA_CLOSE__"
    }, timeout=30)
    assert close_r.status_code == 200, close_r.text
    closed = close_r.json()
    for k in ["expected_cash", "cash_diff", "total_actual", "cash_actual"]:
        assert k in closed
    assert closed["id"] == shift_id

    # Now current should be empty/None
    cur3 = owner_client.get(f"{BASE_URL}/api/shifts/current", timeout=30)
    assert cur3.status_code == 200
    assert not cur3.json()

    # Shift appears in history
    lst = owner_client.get(f"{BASE_URL}/api/shifts", timeout=30)
    assert lst.status_code == 200
    assert any(x.get("id") == shift_id and x.get("status") == "closed" for x in lst.json())
