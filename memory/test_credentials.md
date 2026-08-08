# Test Credentials

## Owner (full access)
- Email: admin@tokohp.com
- Password: admin123
- Role: owner

## Staff (limited access - RBAC)
- Email: staf@tokohp.com
- Password: staf123
- Role: staf

Backend connected to MongoDB Atlas (existing production data, DB_NAME=test_database).
Do NOT seed or reset data.

RBAC: staff cannot access reports/profit-loss, performance, activity-logs (403); dashboard profit fields and sales profit are stripped for staff. Owner-only nav/routes: Pembelian, Supplier, Hutang/Piutang, Pengeluaran, Karyawan, Kinerja, Log Aktivitas, Laporan.
