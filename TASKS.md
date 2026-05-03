# Tasks

> Working list untuk VSK Sistem post-deploy roadmap. Update via `/productivity:update`.
> Source memory: `vsk_roadmap_post_deploy.md` (per 2026-04-29, vsk-sistem live di production).

## Now (in flight)

- [ ] **#1 Stock minus di production** — Input 1 batch dummy "Stock Awal Pra-Sistem" di modul Bahan Baku dengan total kg estimasi gudang saat go-live.
  - Why: data bahan baku pra-sistem belum ter-record → saldo basah jadi minus
  - Type: ops workaround (no code change)
  - Owner: Tony

## Next (queued, ordered by priority)

- [ ] **#2 Notifikasi real-time saat input shift/kedatangan** — Telegram Bot (real-time) + Email harian (recap)
  - Setup: bot token via @BotFather → chat_id → inject `UrlFetchApp` di Apps Script v6 setiap `doPost` sukses
  - Stack: zero-cost (Telegram free, Apps Script free)
  - Touches: `VSK_AppsScript_v6.js`

- [ ] **#3 Tambah kolom Bahan Basah di tab Riwayat modul Produksi**
  - Frontend-only change, simple
  - Apps Script `?action=riwayat` sudah return field `basah` — tinggal render di table
  - Touches: `index.html` (Produksi tab Riwayat)

- [ ] **#4 Schema change: split "Block" → "Block High EC" + "Block Low EC"**
  - Breaking change ke spreadsheet Produksi
  - Backward compat: kolom Block lama dipertahankan sebagai legacy (deprecate setelah migrasi)
  - Frontend Produksi tab Input perlu split jadi 2 input
  - Touches: `index.html` + `VSK_AppsScript_v7.js` + spreadsheet schema

- [ ] **#5 Modul Dashboard CEO** — Stock card 3-tier real-time
  - Stock basah (rawmat masuk − dipakai produksi)
  - Stock kering (kering dihasilkan − kering keluar)
  - Stock block (block diproduksi − block keluar)
  - Phase 1: 3 angka simpel, no output tracking
  - Phase 2 (when sales records exist): tab `Output_Kering` + `Output_Block`

## Later / Backlog

- [ ] Migrate dari pola lama (2 repo, 2 database) ke `vsk-sistem` monorepo (1 repo, 2 worker via wrangler env)
  - Status: educational phase, belum siap deploy struktur baru
  - Worker lama (vsk-produksi & vsk-bahan-baku*) masih hidup paralel sebagai fallback

## Done

_(empty — log completions here when checking off)_

---

## Notes / Conventions

- **Priority order is execution order.** #1 → #5 sesuai dampak operasional.
- Tony lagi belajar SDLC → diskusi prioritas dulu sebelum eksekusi.
- Selalu test di staging URL sebelum promote ke production.
- Apps Script v6 backward-compatible — jangan break VSK Produksi yang sudah live.
