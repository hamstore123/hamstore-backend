# HAM Store — Manajemen Toko HP

## Problem Statement
Continue an existing Toko HP app (FastAPI + MongoDB Atlas + React). Backend source provided; frontend was a compiled build only. Connect to existing Atlas data (MONGO_URL/DB_NAME) WITHOUT resetting/seeding, then add features.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), JWT auth (Bearer/cookie), routes under `/api`. Connected to user's MongoDB Atlas (DB_NAME=test_database). Seed files intentionally NOT copied so auto-seed is skipped — production data untouched.
- Frontend: React (CRA + craco), Tailwind + shadcn/ui, react-router, recharts, sonner. REBUILT from scratch against existing API (original was compiled-only). Clean professional blue theme; Inter / Instrument Serif / Geist Mono fonts.

## Personas
- Owner: full access incl. Karyawan management.
- Kasir / Staf: operational modules.

## Test Credentials
- admin@tokohp.com / admin123 (owner)

## Implemented (2026-06)
- Full frontend rebuild: Login, Dashboard (KPIs + 7-day trend), Kasir/POS (cart, tukar-tambah), Pembelian, PPOB, Produk, Stok & Opname, Harga HP, Service, Master Harga Service, Pelanggan, Supplier, Hutang/Piutang, Pengeluaran, Absensi, Karyawan, Jobdesk, Jadwal Konten, Kinerja, Laporan. All verified against live Atlas (read-only).
- Feature additions (2026-06):
  - HAM Store logo in sidebar + login.
  - Pelanggan: client-side search + barcode/IMEI scanner (html5-qrcode).
  - Absensi: added Libur, Mulai Istirahat, Selesai Istirahat (plus Masuk/Keluar).
  - Pengeluaran: Total Pengeluaran summary card.
  - PPOB: Total Omset & Total Laba summary cards.
  - Jadwal Konten: production pipeline status Konsep → Edited → Selesai Edit → Upload (new backend PUT /api/content-posts/{id}/status).
  - Harga HP: full "Kalkulator Harga Beli / Tukar Tambah" with editable grade % and 17-item condition checklist (Ya/Tidak + editable potongan%), total potongan (cap 80%), final price + rekomendasi jual. Math verified exact.

## Implemented (2026-06, round 2)
- Object storage (Emergent-managed) via POST /api/upload + GET /api/files/{path}; product `image_url` — foto tampil di tabel Produk & kartu Kasir.
- Jadwal Konten: status jadi dropdown Konsep → Schedule → Edited → Selesai Edit → Telah Upload; + metrik konten (views/likes/comments/link) per post.
- Dashboard: seksi "Konten Viral / FYP" menampilkan top konten uploaded by views (metrik input MANUAL, bukan API live IG/TikTok).
- Laporan Keuangan lengkap: Total Omset + omset & laba per kategori (Penjualan HP, PPOB, Service), laba rugi lengkap, rincian pengeluaran, pembelian stok, laba bersih.
- BarcodeScanner: html5-qrcode, prioritas kamera belakang + fallback pemilihan kamera & pesan bila kamera tak tersedia (Android/iOS).

## Notes
- Konten Viral metrics = input MANUAL oleh staf (belum integrasi API resmi Instagram/TikTok — butuh akun bisnis + API key jika ingin otomatis/live).

## Backlog / Next
- P2: Add DialogDescription for a11y (non-blocking warning).
- P2: Cetak struk (print receipt) for Kasir & Service.
- P2: Server-side search for large lists.
