#!/usr/bin/env python3
"""
Backend API Testing for HAM Store
Focus: Auth endpoints for staff after STAFF_ALLOWED_PREFIXES fix
"""
import requests
import sys
import json

# Backend URL - using internal port since we're in the same container
BASE_URL = "http://localhost:8001/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name, passed, details=""):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if passed else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def test_staff_auth():
    """Test staff authentication flow"""
    print(f"\n{Colors.BLUE}=== Testing Staff Authentication ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    # Test 1: Staff Login
    print("\n1. Testing staff login...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "staf@tokohp.com",
            "password": "staf123"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            staff_token = data.get("token")
            staff_role = data.get("role")
            
            if staff_token and staff_role in ["staf", "staff"]:
                passed = log_test("Staff login successful", True, f"Role: {staff_role}, Token received")
                results["passed"] += 1
                results["tests"].append({"name": "Staff Login", "status": "PASS"})
            else:
                passed = log_test("Staff login", False, f"Invalid response: {data}")
                results["failed"] += 1
                results["tests"].append({"name": "Staff Login", "status": "FAIL", "reason": "Invalid response"})
                return results
        else:
            passed = log_test("Staff login", False, f"Status: {resp.status_code}, Response: {resp.text}")
            results["failed"] += 1
            results["tests"].append({"name": "Staff Login", "status": "FAIL", "reason": f"HTTP {resp.status_code}"})
            return results
    except Exception as e:
        log_test("Staff login", False, f"Exception: {str(e)}")
        results["failed"] += 1
        results["tests"].append({"name": "Staff Login", "status": "FAIL", "reason": str(e)})
        return results
    
    # Test 2: Staff access to /api/auth/me (CRITICAL - this was the bug)
    print("\n2. Testing staff access to /api/auth/me...")
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", 
                           headers={"Authorization": f"Bearer {staff_token}"},
                           timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email") == "staf@tokohp.com":
                log_test("Staff /api/auth/me access", True, f"User data retrieved: {data.get('name')}")
                results["passed"] += 1
                results["tests"].append({"name": "Staff /api/auth/me", "status": "PASS"})
            else:
                log_test("Staff /api/auth/me", False, f"Wrong user data: {data}")
                results["failed"] += 1
                results["tests"].append({"name": "Staff /api/auth/me", "status": "FAIL", "reason": "Wrong user data"})
        elif resp.status_code == 403:
            log_test("Staff /api/auth/me access", False, "CRITICAL: Still getting 403 - /api/auth not in STAFF_ALLOWED_PREFIXES")
            results["failed"] += 1
            results["tests"].append({"name": "Staff /api/auth/me", "status": "FAIL", "reason": "403 Forbidden - RBAC blocking"})
        else:
            log_test("Staff /api/auth/me", False, f"Status: {resp.status_code}, Response: {resp.text}")
            results["failed"] += 1
            results["tests"].append({"name": "Staff /api/auth/me", "status": "FAIL", "reason": f"HTTP {resp.status_code}"})
    except Exception as e:
        log_test("Staff /api/auth/me", False, f"Exception: {str(e)}")
        results["failed"] += 1
        results["tests"].append({"name": "Staff /api/auth/me", "status": "FAIL", "reason": str(e)})
    
    # Test 3: Staff logout
    print("\n3. Testing staff logout...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/logout",
                            headers={"Authorization": f"Bearer {staff_token}"},
                            timeout=10)
        
        if resp.status_code == 200:
            log_test("Staff logout", True, "Logout successful")
            results["passed"] += 1
            results["tests"].append({"name": "Staff Logout", "status": "PASS"})
        else:
            log_test("Staff logout", False, f"Status: {resp.status_code}")
            results["failed"] += 1
            results["tests"].append({"name": "Staff Logout", "status": "FAIL", "reason": f"HTTP {resp.status_code}"})
    except Exception as e:
        log_test("Staff logout", False, f"Exception: {str(e)}")
        results["failed"] += 1
        results["tests"].append({"name": "Staff Logout", "status": "FAIL", "reason": str(e)})
    
    # Re-login for RBAC tests
    print("\n4. Re-login staff for RBAC tests...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "staf@tokohp.com",
            "password": "staf123"
        }, timeout=10)
        staff_token = resp.json().get("token")
    except Exception as e:
        log_test("Staff re-login", False, f"Exception: {str(e)}")
        results["failed"] += 1
        return results
    
    # Test 4: Staff CANNOT access owner-only routes
    print("\n5. Testing RBAC - Staff should get 403 on owner-only routes...")
    owner_only_routes = [
        "/reports/profit-loss?start=2025-01-01&end=2025-12-31",
        "/performance/summary",
    ]
    
    rbac_passed = 0
    rbac_failed = 0
    
    for route in owner_only_routes:
        try:
            resp = requests.get(f"{BASE_URL}{route}",
                               headers={"Authorization": f"Bearer {staff_token}"},
                               timeout=10)
            
            if resp.status_code == 403:
                log_test(f"RBAC: Staff blocked from {route}", True, "Correctly returned 403")
                rbac_passed += 1
            else:
                log_test(f"RBAC: Staff blocked from {route}", False, f"Expected 403, got {resp.status_code}")
                rbac_failed += 1
        except Exception as e:
            log_test(f"RBAC: {route}", False, f"Exception: {str(e)}")
            rbac_failed += 1
    
    if rbac_failed == 0:
        results["passed"] += 1
        results["tests"].append({"name": "RBAC Owner-only routes", "status": "PASS"})
    else:
        results["failed"] += 1
        results["tests"].append({"name": "RBAC Owner-only routes", "status": "FAIL", "reason": f"{rbac_failed} routes not properly protected"})
    
    # Test 5: Staff CAN access allowed routes
    print("\n6. Testing staff access to allowed routes...")
    allowed_routes = [
        "/products",
        "/sales",
        "/dashboard/summary",
    ]
    
    allowed_passed = 0
    allowed_failed = 0
    
    for route in allowed_routes:
        try:
            resp = requests.get(f"{BASE_URL}{route}",
                               headers={"Authorization": f"Bearer {staff_token}"},
                               timeout=10)
            
            if resp.status_code == 200:
                log_test(f"Staff access to {route}", True, "Access granted")
                allowed_passed += 1
            else:
                log_test(f"Staff access to {route}", False, f"Expected 200, got {resp.status_code}")
                allowed_failed += 1
        except Exception as e:
            log_test(f"Staff access to {route}", False, f"Exception: {str(e)}")
            allowed_failed += 1
    
    if allowed_failed == 0:
        results["passed"] += 1
        results["tests"].append({"name": "Staff allowed routes", "status": "PASS"})
    else:
        results["failed"] += 1
        results["tests"].append({"name": "Staff allowed routes", "status": "FAIL", "reason": f"{allowed_failed} routes blocked incorrectly"})
    
    return results

def test_owner_auth():
    """Test owner authentication and access"""
    print(f"\n{Colors.BLUE}=== Testing Owner Authentication ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    # Test 1: Owner Login
    print("\n1. Testing owner login...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@tokohp.com",
            "password": "admin123"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            owner_token = data.get("token")
            owner_role = data.get("role")
            
            if owner_token and owner_role == "owner":
                log_test("Owner login successful", True, f"Role: {owner_role}")
                results["passed"] += 1
                results["tests"].append({"name": "Owner Login", "status": "PASS"})
            else:
                log_test("Owner login", False, f"Invalid response: {data}")
                results["failed"] += 1
                results["tests"].append({"name": "Owner Login", "status": "FAIL", "reason": "Invalid response"})
                return results
        else:
            log_test("Owner login", False, f"Status: {resp.status_code}")
            results["failed"] += 1
            results["tests"].append({"name": "Owner Login", "status": "FAIL", "reason": f"HTTP {resp.status_code}"})
            return results
    except Exception as e:
        log_test("Owner login", False, f"Exception: {str(e)}")
        results["failed"] += 1
        results["tests"].append({"name": "Owner Login", "status": "FAIL", "reason": str(e)})
        return results
    
    # Test 2: Owner can access owner-only routes
    print("\n2. Testing owner access to owner-only routes...")
    owner_routes = [
        "/reports/profit-loss?start=2025-01-01&end=2025-12-31",
        "/performance/summary",
    ]
    
    owner_passed = 0
    owner_failed = 0
    
    for route in owner_routes:
        try:
            resp = requests.get(f"{BASE_URL}{route}",
                               headers={"Authorization": f"Bearer {owner_token}"},
                               timeout=10)
            
            if resp.status_code == 200:
                log_test(f"Owner access to {route}", True, "Access granted")
                owner_passed += 1
            else:
                log_test(f"Owner access to {route}", False, f"Expected 200, got {resp.status_code}")
                owner_failed += 1
        except Exception as e:
            log_test(f"Owner access to {route}", False, f"Exception: {str(e)}")
            owner_failed += 1
    
    if owner_failed == 0:
        results["passed"] += 1
        results["tests"].append({"name": "Owner access to owner-only routes", "status": "PASS"})
    else:
        results["failed"] += 1
        results["tests"].append({"name": "Owner access to owner-only routes", "status": "FAIL", "reason": f"{owner_failed} routes not accessible"})
    
    return results

def main():
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}HAM Store Backend API Testing{Colors.END}")
    print(f"{Colors.BLUE}Focus: Auth endpoints after STAFF_ALLOWED_PREFIXES fix{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    all_results = {"passed": 0, "failed": 0, "tests": []}
    
    # Test staff auth
    staff_results = test_staff_auth()
    all_results["passed"] += staff_results["passed"]
    all_results["failed"] += staff_results["failed"]
    all_results["tests"].extend(staff_results["tests"])
    
    # Test owner auth
    owner_results = test_owner_auth()
    all_results["passed"] += owner_results["passed"]
    all_results["failed"] += owner_results["failed"]
    all_results["tests"].extend(owner_results["tests"])
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {all_results['passed']}{Colors.END}")
    print(f"{Colors.RED}Failed: {all_results['failed']}{Colors.END}")
    print(f"Total: {all_results['passed'] + all_results['failed']}")
    
    if all_results["failed"] > 0:
        print(f"\n{Colors.RED}FAILED TESTS:{Colors.END}")
        for test in all_results["tests"]:
            if test["status"] == "FAIL":
                reason = test.get("reason", "Unknown")
                print(f"  {Colors.RED}✗{Colors.END} {test['name']}: {reason}")
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    # Exit with appropriate code
    sys.exit(0 if all_results["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
