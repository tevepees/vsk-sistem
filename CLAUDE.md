# Working Memory — VSK Production Automation

## Me
**Tony (Variantony)** — CEO + sole developer di **PT Varian Sumber Karya (VSK)**.
Belajar SDLC sambil ngebangun sistem operasional perusahaan sendiri. Stack: PWA (HTML/JS) + Cloudflare Workers + Apps Script + Google Sheets.

## Company
**PT Varian Sumber Karya (VSK)** — cocopeat/cocofiber/media tanam ekspor, sedang ekspansi multisegment menuju holding company.
**Tagline:** "Building Value from Every Source"

## Current Project
**vsk-sistem** — monorepo gabungan modul **Produksi** + **Bahan Baku**. Live di Cloudflare Workers per **2026-04-29**. Worker lama (vsk-produksi & vsk-bahan-baku*) masih jalan paralel sebagai fallback.

## Modules
| Module | What |
|--------|------|
| **Produksi** | Pencatatan shift produksi (basah → kering → block). Tab `Produksi` di Sheets. |
| **Bahan Baku** (Rawmat) | Pencatatan kedatangan rawmat cocopeat per batch + per karung. Tab `Rawmat_Kedatangan`, `Rawmat_Karung`, `Suppliers`. |
| **Dashboard CEO** (planned) | Stock 3-tier real-time (basah/kering/block) — task #5. |

## Terms
| Term | Meaning |
|------|---------|
| **Basah** | Bahan baku cocopeat mentah (kg) — input ke produksi |
| **Kering** | Hasil olah cocopeat kering (kg) |
| **Block** | Block jadi cocopeat (pcs) — produk akhir; akan di-split jadi High EC / Low EC |
| **Susut** | Loss ratio basah → kering (%) |
| **Karung** | Unit kemasan rawmat masuk; total per batch auto-recompute |
| **EC** | Electrical Conductivity — parameter kualitas cocopeat (akan jadi 2 grade: High / Low) |
| **Batch ID** | Format `B-YYYYMMDD-NNN` untuk kedatangan rawmat |

## Architecture
- **Frontend:** 1 file `index.html` deployed via Cloudflare Workers. Env auto-detect dari `location.hostname` (kalau ada `staging`/`localhost` → IS_STAGING).
- **Backend:** `VSK_AppsScript_v7.js` (single Apps Script, paste ke 2 spreadsheet). Routing: `?action=...` (GET), `type` field (POST).
- **DB:** Google Sheets — production `1evJ9Eo3O9UxwFlQAd1TlDRobsCx5fx1VSNbJ1uVPNrA`, staging `1Ndm4YMCYzX4K6LN4ZWOCsfwppkElpoej8LibLABswPY`.

## Domain Rules (penting, gampang lupa)
- Hanya **1 batch open** di waktu yang sama — server tolak start kalau ada batch open.
- Karung tidak bisa dihapus, hanya di-flag (audit trail).
- Cancel batch hanya kalau belum ada karung. Sudah ada karung → flag semua + close.
- Backward-compat Apps Script v6/v7 wajib — modul Produksi yang live tidak boleh break.

## Brand
| Token | Hex | Use |
|-------|-----|-----|
| India Green | `#048419` | Primary button, link, accent utama |
| Green RYB | `#6FBC33` | Hover/secondary |
| Asunglow (yellow) | `#FFD333` | Badge/highlight (jangan untuk button utama) |
| Warm Black | `#03473C` | Teks utama / dark surface |

Fonts: **Exo 2 Semi Bold** (display), **Open Sans Regular** (body).

## Preferences
- Bahasa campur ID/EN — Tony lebih nyaman bahas teknis pakai mix Indonesian + English istilah teknis.
- Approach bertahap — diskusi prioritas dulu sebelum eksekusi (Tony lagi belajar SDLC).
- Test di staging dulu sebelum production. Selalu.
- Tony pakai Telegram untuk notif personal — preferred channel buat real-time alerts.

## Pointers
- Auto-memory deeper context: `~/Library/.../memory/` (vsk_*.md files)
- Roadmap source: `vsk_roadmap_post_deploy.md`
- External resources (URLs, sheet IDs): `vsk_external_resources.md`
