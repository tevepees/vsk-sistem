# vsk-sistem

**Status:** Live di production via Cloudflare Workers per **2026-04-29**.
**What:** Monorepo gabungan modul Produksi + Bahan Baku. Frontend tunggal (PWA) + backend tunggal (Apps Script v6/v7) yang di-bind ke 2 spreadsheet (staging + production).

## Stack
- **Frontend:** `index.html` (vanilla HTML/JS PWA), `manifest.json`, `sw.js`
- **Backend:** `VSK_AppsScript_v7.js` (di-paste ke 2 spreadsheet)
- **Hosting:** Cloudflare Workers (`wrangler.jsonc`)
- **DB:** Google Sheets (1 prod + 1 staging)

## Env detection
Frontend auto-detect environment dari `location.hostname`:
- mengandung `staging` / `localhost` / `127.0.0.1` → `IS_STAGING = true` → pakai `SHEETS_URL_STAGING`
- else → `SHEETS_URL_PROD`
- Badge orange "STAGING" muncul di topbar saat IS_STAGING.

## External resources (sumber: vsk_external_resources.md)
- **Repo (current):** https://github.com/tevepees/vsk-sistem
- **Sheets prod:** `1evJ9Eo3O9UxwFlQAd1TlDRobsCx5fx1VSNbJ1uVPNrA`
- **Sheets staging:** `1Ndm4YMCYzX4K6LN4ZWOCsfwppkElpoej8LibLABswPY`
- **Apps Script Web App prod:** `https://script.google.com/macros/s/AKfycbw3pWXUCvStevJLIA2x1r7n39Hb2UrCNYuGzwUbzLVpMtyd_ICBMS8RLR3ZqLo9_PqRaw/exec`
- **Apps Script Web App staging:** `https://script.google.com/macros/s/AKfycbxdpYmv3AUqcS0P7Lv-3LRYBV4nDoscDSfcupsN0UwvQt01E0Z3-YLwuLglY9iILGkl/exec`
- **CF Worker prod:** `vsk-produksi.variantony1.workers.dev`

## Backend routing
- **GET produksi:** `?action=rekap`, `?action=riwayat`, `?action=debug`
- **GET rawmat:** `?action=rawmat-stock`, `?action=rawmat-batches`, `?action=rawmat-batch&id=...`, `?action=rawmat-active`, `?action=rawmat-debug`
- **POST produksi:** body tanpa `type` (atau `type:'produksi'`) → `produksiSaveShift(data)`
- **POST rawmat:** `type` ∈ `rawmat-start`, `rawmat-karung`, `rawmat-flag`, `rawmat-close`, `rawmat-cancel`

## Domain invariants
- Hanya **1 batch open** di waktu yang sama.
- Karung **tidak bisa dihapus** — hanya di-flag (toggle). Flagged karung tidak masuk total/saldo, tapi tetap tersimpan untuk audit trail.
- **Cancel** batch hanya kalau belum ada karung. Sudah ada karung tapi salah → flag semua, lalu close.
- Total header (`Total Karung`, `Total Berat`) auto-recompute setiap perubahan karung.

## Stock formula (computed on-the-fly)
- `Total Masuk = SUM(Rawmat_Karung.Berat)` WHERE `Flagged=FALSE` AND `Batch.Status IN ('open','closed')`
- `Total Keluar = SUM(Produksi.Basah (kg))` ← assumption masih perlu re-confirm ke Tony
- `Saldo = Masuk − Keluar`

## Backward-compat constraint
Apps Script v6/v7 wajib backward-compatible — modul Produksi yang live tidak boleh break. Jangan rename/reorder kolom existing di tab `Produksi`.

## Roadmap
Lihat `TASKS.md` (5 open items, urut priority).
