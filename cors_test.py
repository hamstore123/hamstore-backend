#!/usr/bin/env python3
"""
CORS Configuration Testing for HAM Store Backend
Focus: Verify CORS credentials allowlist implementation and runtime configuration
"""
import requests
import sys
import os

# Backend URL - using internal port since we're in the same container
BASE_URL = "http://localhost:8001"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

def log_test(name, passed, details=""):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if passed else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def log_info(message):
    print(f"{Colors.CYAN}ℹ {message}{Colors.END}")

def log_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def test_cors_code_implementation():
    """Verify the CORS code implementation in server.py"""
    print(f"\n{Colors.BLUE}=== Testing CORS Code Implementation ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    # Read server.py to verify implementation
    try:
        with open('/app/backend/server.py', 'r') as f:
            server_code = f.read()
        
        # Test 1: No hardcoded allow_origins=['*']
        if "allow_origins=['*']" not in server_code and 'allow_origins=["*"]' not in server_code:
            log_test("No hardcoded allow_origins=['*']", True, "Code does not contain wildcard hardcoded")
            results["passed"] += 1
        else:
            log_test("No hardcoded allow_origins=['*']", False, "Found hardcoded wildcard in code")
            results["failed"] += 1
        
        # Test 2: No allow_origin_regex='.*'
        if "allow_origin_regex" not in server_code:
            log_test("No allow_origin_regex", True, "Code does not use regex-based origin matching")
            results["passed"] += 1
        else:
            log_test("No allow_origin_regex", False, "Found allow_origin_regex in code")
            results["failed"] += 1
        
        # Test 3: Reads from os.environ['CORS_ORIGINS']
        if 'os.environ.get("CORS_ORIGINS"' in server_code or "os.environ['CORS_ORIGINS']" in server_code:
            log_test("Reads CORS_ORIGINS from environment", True, "Code reads from os.environ")
            results["passed"] += 1
        else:
            log_test("Reads CORS_ORIGINS from environment", False, "Code does not read from environment")
            results["failed"] += 1
        
        # Test 4: Splits by comma
        if '.split(",")' in server_code or ".split(',')" in server_code:
            log_test("Comma-separated parsing", True, "Code splits CORS_ORIGINS by comma")
            results["passed"] += 1
        else:
            log_test("Comma-separated parsing", False, "Code does not split by comma")
            results["failed"] += 1
        
        # Test 5: Strips whitespace
        if '.strip()' in server_code:
            log_test("Whitespace cleanup", True, "Code strips whitespace from origins")
            results["passed"] += 1
        else:
            log_test("Whitespace cleanup", False, "Code does not strip whitespace")
            results["failed"] += 1
        
        # Test 6: Filters out wildcards
        if '!= "*"' in server_code or "!= '*'" in server_code:
            log_test("Wildcard filtering", True, "Code filters out '*' wildcards")
            results["passed"] += 1
        else:
            log_test("Wildcard filtering", False, "Code does not filter wildcards")
            results["failed"] += 1
        
        # Test 7: allow_credentials=True present
        if 'allow_credentials=True' in server_code:
            log_test("allow_credentials=True", True, "Credentials support enabled")
            results["passed"] += 1
        else:
            log_test("allow_credentials=True", False, "Credentials support not enabled")
            results["failed"] += 1
        
    except Exception as e:
        log_test("Code implementation check", False, f"Exception: {str(e)}")
        results["failed"] += 1
    
    return results

def test_runtime_environment():
    """Check the runtime environment configuration"""
    print(f"\n{Colors.BLUE}=== Testing Runtime Environment Configuration ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": [], "warnings": []}
    
    # Read .env file
    try:
        with open('/app/backend/.env', 'r') as f:
            env_content = f.read()
        
        # Extract CORS_ORIGINS value
        cors_origins_line = None
        for line in env_content.split('\n'):
            if line.startswith('CORS_ORIGINS='):
                cors_origins_line = line
                break
        
        if cors_origins_line:
            cors_value = cors_origins_line.split('=', 1)[1].strip().strip('"').strip("'")
            log_info(f"Current CORS_ORIGINS in .env: '{cors_value}'")
            
            # Test 1: Check if still using wildcard
            if cors_value == "*":
                log_test("CORS_ORIGINS not wildcard", False, 
                        "CRITICAL: CORS_ORIGINS='*' will be filtered out, resulting in EMPTY allowed origins list")
                results["failed"] += 1
                results["warnings"].append({
                    "type": "DEPLOYMENT_CONFIG",
                    "message": "CORS_ORIGINS='*' in .env will cause ALL origins to be rejected after filtering"
                })
            else:
                log_test("CORS_ORIGINS not wildcard", True, f"Set to: {cors_value}")
                results["passed"] += 1
            
            # Test 2: Check if contains production domains
            production_domains = ['hamstoretegal.com', 'hamstore-backend-production.up.railway.app']
            has_production = any(domain in cors_value for domain in production_domains)
            
            if has_production:
                log_test("Contains production domains", True, "Production domains found in CORS_ORIGINS")
                results["passed"] += 1
            else:
                log_test("Contains production domains", False, 
                        "Production domains not found in CORS_ORIGINS")
                results["failed"] += 1
                results["warnings"].append({
                    "type": "DEPLOYMENT_CONFIG",
                    "message": f"CORS_ORIGINS should include: https://hamstoretegal.com, https://www.hamstoretegal.com"
                })
        else:
            log_test("CORS_ORIGINS defined", False, "CORS_ORIGINS not found in .env")
            results["failed"] += 1
            
    except Exception as e:
        log_test("Environment configuration check", False, f"Exception: {str(e)}")
        results["failed"] += 1
    
    return results

def test_cors_preflight():
    """Test CORS preflight requests with different origins"""
    print(f"\n{Colors.BLUE}=== Testing CORS Preflight Requests ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    # Test origins
    test_origins = [
        "https://hamstoretegal.com",
        "https://www.hamstoretegal.com",
        "https://hamstore-backend-production.up.railway.app",
        "https://phone-shop-hub-18.preview.emergentagent.com",
    ]
    
    for origin in test_origins:
        try:
            # OPTIONS preflight request
            resp = requests.options(
                f"{BASE_URL}/api/auth/login",
                headers={
                    "Origin": origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
                timeout=5
            )
            
            # Check response headers
            allow_origin = resp.headers.get("Access-Control-Allow-Origin")
            allow_credentials = resp.headers.get("Access-Control-Allow-Credentials")
            
            if allow_origin == origin:
                log_test(f"Preflight for {origin}", True, 
                        f"Origin allowed, credentials={allow_credentials}")
                results["passed"] += 1
            elif allow_origin is None:
                log_test(f"Preflight for {origin}", False, 
                        f"Origin REJECTED (no Access-Control-Allow-Origin header)")
                results["failed"] += 1
                log_warning(f"This origin is not in the allowed CORS_ORIGINS list")
            else:
                log_test(f"Preflight for {origin}", False, 
                        f"Unexpected origin in response: {allow_origin}")
                results["failed"] += 1
                
        except Exception as e:
            log_test(f"Preflight for {origin}", False, f"Exception: {str(e)}")
            results["failed"] += 1
    
    return results

def test_cors_actual_request():
    """Test actual CORS request with credentials"""
    print(f"\n{Colors.BLUE}=== Testing Actual CORS Request with Credentials ==={Colors.END}")
    
    results = {"passed": 0, "failed": 0, "tests": []}
    
    origin = "https://hamstoretegal.com"
    
    try:
        # Actual POST request with Origin header
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@tokohp.com",
                "password": "admin123"
            },
            headers={
                "Origin": origin,
            },
            timeout=10
        )
        
        allow_origin = resp.headers.get("Access-Control-Allow-Origin")
        allow_credentials = resp.headers.get("Access-Control-Allow-Credentials")
        
        if resp.status_code == 200:
            if allow_origin == origin:
                log_test(f"Actual request from {origin}", True, 
                        f"Request successful, credentials={allow_credentials}")
                results["passed"] += 1
            else:
                log_test(f"Actual request from {origin}", False, 
                        f"Request succeeded but wrong origin header: {allow_origin}")
                results["failed"] += 1
        else:
            log_test(f"Actual request from {origin}", False, 
                    f"Request failed with status {resp.status_code}")
            results["failed"] += 1
            
    except Exception as e:
        log_test(f"Actual request from {origin}", False, f"Exception: {str(e)}")
        results["failed"] += 1
    
    return results

def main():
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}HAM Store CORS Configuration Testing{Colors.END}")
    print(f"{Colors.BLUE}Focus: CORS credentials allowlist implementation & runtime config{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}")
    
    all_results = {
        "passed": 0, 
        "failed": 0, 
        "tests": [],
        "warnings": []
    }
    
    # Test 1: Code implementation
    code_results = test_cors_code_implementation()
    all_results["passed"] += code_results["passed"]
    all_results["failed"] += code_results["failed"]
    
    # Test 2: Runtime environment
    env_results = test_runtime_environment()
    all_results["passed"] += env_results["passed"]
    all_results["failed"] += env_results["failed"]
    all_results["warnings"].extend(env_results.get("warnings", []))
    
    # Test 3: CORS preflight
    preflight_results = test_cors_preflight()
    all_results["passed"] += preflight_results["passed"]
    all_results["failed"] += preflight_results["failed"]
    
    # Test 4: Actual CORS request
    actual_results = test_cors_actual_request()
    all_results["passed"] += actual_results["passed"]
    all_results["failed"] += actual_results["failed"]
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {all_results['passed']}{Colors.END}")
    print(f"{Colors.RED}Failed: {all_results['failed']}{Colors.END}")
    print(f"Total: {all_results['passed'] + all_results['failed']}")
    
    # Warnings
    if all_results["warnings"]:
        print(f"\n{Colors.YELLOW}{'='*70}{Colors.END}")
        print(f"{Colors.YELLOW}WARNINGS & RECOMMENDATIONS{Colors.END}")
        print(f"{Colors.YELLOW}{'='*70}{Colors.END}")
        for warning in all_results["warnings"]:
            print(f"{Colors.YELLOW}⚠ [{warning['type']}]{Colors.END}")
            print(f"  {warning['message']}")
    
    # Final assessment
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}FINAL ASSESSMENT{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}")
    
    # Check code vs deployment distinction
    code_tests_passed = code_results["passed"] == 7  # All 7 code tests
    env_has_issues = len(env_results.get("warnings", [])) > 0
    
    if code_tests_passed:
        print(f"{Colors.GREEN}✓ CODE IMPLEMENTATION: CORRECT{Colors.END}")
        print(f"  - No hardcoded wildcards")
        print(f"  - Reads from CORS_ORIGINS environment variable")
        print(f"  - Properly parses comma-separated origins")
        print(f"  - Strips whitespace")
        print(f"  - Filters out wildcards")
        print(f"  - allow_credentials=True enabled")
    else:
        print(f"{Colors.RED}✗ CODE IMPLEMENTATION: NEEDS FIX{Colors.END}")
    
    if env_has_issues:
        print(f"\n{Colors.RED}✗ DEPLOYMENT ENVIRONMENT: NEEDS CONFIGURATION{Colors.END}")
        print(f"  - Current CORS_ORIGINS='*' will be filtered out")
        print(f"  - This results in EMPTY allowed origins list")
        print(f"  - ALL cross-origin requests will be REJECTED")
        print(f"\n{Colors.YELLOW}RECOMMENDED FIX:{Colors.END}")
        print(f"  Update /app/backend/.env:")
        print(f'  CORS_ORIGINS="https://hamstoretegal.com,https://www.hamstoretegal.com"')
        print(f"\n  Or for testing environment:")
        print(f'  CORS_ORIGINS="https://phone-shop-hub-18.preview.emergentagent.com"')
    else:
        print(f"\n{Colors.GREEN}✓ DEPLOYMENT ENVIRONMENT: CONFIGURED{Colors.END}")
    
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    # Exit with appropriate code
    sys.exit(0 if all_results["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
