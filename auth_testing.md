# Auth testing notes for HAM Store

## Existing credentials
- Owner: admin@tokohp.com / admin123
- Staff: staf@tokohp.com / staf123

## Endpoints
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

## Verification checklist
1. Confirm login returns HTTP 200 and a token.
2. Confirm the browser sends the token/cookie to /api/auth/me.
3. Confirm staff can access /api/auth/me after login.
4. Confirm staff remains blocked from owner-only reports/performance routes.
5. Never seed, reset, or modify the production MongoDB Atlas data during testing.
