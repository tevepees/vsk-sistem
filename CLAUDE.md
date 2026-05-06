# CLAUDE.md — VSK Sistem (Working Memory untuk Claude Code)

> File ini di-load otomatis oleh Claude Code saat sesi start. Jaga supaya tetap up-to-date — ini single source of truth untuk konteks proyek.

---

## Tentang User

**Tony Variantony** — CEO + sole developer di **PT Varian Sumber Karya (VSK)**.
- Sedang **belajar SDLC** sambil membangun sistem operasional perusahaan sendiri
- **Bahasa:** mix Indonesian + English istilah teknis (Tony nyaman dengan Indonesian explanation, code & technical terms in English)
- **Approach:** bertahap — diskusi prioritas dulu sebelum eksekusi besar; pemula ingin paham tidak hanya hasil
- **Aturan deploy:** test di STAGING dulu, selalu — jangan langsung ke production
- **Channel notif preferred:** Telegram (untuk real-time alerts personal)

---

## Tentang Perusahaan

**PT Varian Sumber Karya (VSK)** — pengolahan cocopeat/cocofiber/media tanam, dominan ekspor.
**Tagline:** "Building Value from Every Source"
**Strategic direction:** sedang transformasi multi-segment menuju holding company.

---

## Current Project: `vsk-sistem`

Monorepo gabungan modul **Produksi** + **Bahan Baku**, live di Cloudflare Workers.

**Schema version:** v8 (per 2026-05-03 staging migrate, manual via Sheets UI karena Apps Script editor issue saat itu)

**Repo:** https://github.com/tevepees/vsk-sistem
**Branches:** `main` (production) + `staging`
**Workers:** `vsk-sistem.<account>.workers.dev` (prod), `vsk-sistem-staging.<account>.workers.dev` (staging)

---

## File Structure

```
vsk-sistem/
├── index.html               # Single-page PWA (sidebar shell + 2 module IIFE)
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker (cache key: vsk-sistem-v1)
├── logo.svg                 # VSK logo (dimodifikasi user — JANGAN revert)
├── wrangler.jsonc           # CF Worker config dengan env staging+production
├── VSK_AppsScript_v7.js     # Backend v7 (legacy, dipertahankan)
├── VSK_AppsScript_v8.js     # Backend v8 (live di production setelah manual migrate)
├── dev-workflow-guide.html  # Panduan visual development workflow (untuk Tony)
├── CLAUDE.md                # File ini
└── docs/
    ├── PRD-Bahan-Baku.md            # Product spec modul Bahan Baku
    ├── PRD-Produksi.md               # Product spec modul Produksi
    ├── SOP-Operator-VSK-Sistem.md    # SOP operator (Bahasa Indonesia simple)
    └── Negative-Cases-Brainstorm.md  # 50+ edge cases dengan P×I rating
```

---

## Modules

| Module | Function | Spreadsheet tabs |
|--------|----------|---|
| **Produksi** | Input shift harian (Pagi/Sore) — Karung, Basah, Kering, Block × (High EC / Low EC) | `Produksi` (19 kolom) |
| **Bahan Baku** (Rawmat) | Catat kedatangan rawmat per batch & per karung | `Rawmat_Kedatangan` (12 kol), `Rawmat_Karung` (8 kol), `Suppliers` (master, belum aktif) |
| **Dashboard CEO** (planned) | Stock 3-tier real-time (basah/kering/block) — Q3-Q4 2026 | TBD |
| **Absensi** (planned) | Attendance + GPS validation, repo terpisah | TBD |

---

## Schema v8 — Reference cepat

**Produksi** (22 kolom, index 0-based) — v8.1 (NC-G carry-over):
```
0  Timestamp Server
1  Tanggal
2  Shift                  ('pagi' / 'sore')
3  Operator
4  Karung                 (total = 5 + 6)
5  Karung High EC
6  Karung Low EC
7  Basah (kg)             (total = 8 + 9)
8  Basah High EC (kg)
9  Basah Low EC (kg)
10 Kering (kg)            (total = 11 + 12)
11 Kering High EC (kg)
12 Kering Low EC (kg)
13 Block (pcs)            (total = 14 + 15)
14 Block High EC
15 Block Low EC
16 Susut (%)              (auto: (Basah-Kering)/Basah*100)
17 Catatan
18 Input Time
19 Outcome               ('berhasil' / 'parsial' / 'gagal')
20 Carry-In High EC (kg) (basah carry-over dari sebelumnya, sudah dihitung rawmat)
21 Carry-In Low EC (kg)
```

**Migrasi carry-over:** jalankan `migrateCarryOver()` di Apps Script editor 1x setelah deploy.
**Stock formula:** outHighKg = SUM(Basah_H - CarryIn_H) — carry-in dikecualikan agar tidak double count.

**Rawmat_Kedatangan** (12 kolom):
```
0  Timestamp Server
1  Batch ID               (format: B-YYYYMMDD-NNN)
2  Tanggal
3  Supplier
4  Surat Jalan            (DO number)
5  EC Type                ('high' atau 'low')
6  Total Karung           (auto-recompute)
7  Total Berat (kg)       (auto-recompute)
8  Status                 ('open' / 'closed' / 'cancelled')
9  Operator
10 Catatan
11 Closed Time
```

**Rawmat_Karung** (8 kolom): Timestamp, Batch ID, Urut, Berat (kg), Flagged, Flag Reason, Operator, Time

---

## External Resources

**Repos:**
- Monorepo target: https://github.com/tevepees/vsk-sistem
- Legacy production (masih live as fallback): https://github.com/tevepees/vsk-produksi
- Legacy staging: https://github.com/tevepees/staging-vsk-produksi

**Database Google Sheets:**
- Production: `1evJ9Eo3O9UxwFlQAd1TlDRobsCx5fx1VSNbJ1uVPNrA`
- Staging: `1Ndm4YMCYzX4K6LN4ZWOCsfwppkElpoej8LibLABswPY`

**Apps Script Web App URLs (live):**
- Production: `https://script.google.com/macros/s/AKfycbw3pWXUCvStevJLIA2x1r7n39Hb2UrCNYuGzwUbzLVpMtyd_ICBMS8RLR3ZqLo9_PqRaw/exec`
- Staging: `https://script.google.com/macros/s/AKfycbxdpYmv3AUqcS0P7Lv-3LRYBV4nDoscDSfcupsN0UwvQt01E0Z3-YLwuLglY9iILGkl/exec`

**Cloudflare Workers (current):**
- vsk-produksi.variantony1.workers.dev (legacy, masih live)
- vsk-sistem.<account>.workers.dev (target setelah Tony deploy v8)

---

## Architecture Notes

**Frontend:**
- Single `index.html` di-deploy via Cloudflare Workers Static Assets
- **Env auto-detect dari `location.hostname`**: kalau hostname ada kata `staging` / `localhost` / `127.0.0.1` → IS_STAGING true → pakai SHEETS_URL_STAGING
- 2 modul wrapped dalam IIFE terpisah (`Produksi`, `Rawmat`), shell core di IIFE ke-3
- Helper $/qsa scoped per `[data-module="X"]` section untuk avoid collision
- localStorage: `vsk-active-module`, `vsk-rawmat-operator`

**Backend (Apps Script v8):**
- Single file di-paste ke 2 spreadsheet (staging + prod). Karena script bound ke spreadsheet, tiap deploy URL berbeda → DB otomatis terpisah.
- Routing: `?action=...` (GET), POST body dengan `type` field (default: produksi)
- Endpoints: `rekap`, `riwayat`, `debug`, `rawmat-stock`, `rawmat-batches`, `rawmat-batch&id=X`, `rawmat-active`, `rawmat-debug`
- Migration function: `migrateToV8()` — wrap migrateProduksiToV8 + migrateRawmatToV8 (idempotent)

**Critical formula — Stock per EC (computed on-the-fly):**
```
Saldo High EC = SUM(Rawmat_Karung WHERE batch.EC_Type='high' AND not flagged)
              − SUM(Produksi.Basah_High_EC)

Saldo Low EC  = SUM(Rawmat_Karung WHERE batch.EC_Type='low' AND not flagged)
              − SUM(Produksi.Basah_Low_EC)

Saldo Total = Saldo High + Saldo Low
```

**Coupling:** `getRawmatStock` di Apps Script membaca kolom `Basah High EC` (index 8) dan `Basah Low EC` (index 9) dari tab Produksi. **Schema change yang menggeser index ini akan break stock formula.**

---

## Domain Rules (gampang lupa, jaga ketat!)

1. **Hanya 1 batch `open` di waktu yang sama** — server tolak start kalau ada open. Operator harus close batch lama dulu.
2. **Karung tidak bisa dihapus**, hanya bisa di-flag (toggle). Audit trail tetap utuh.
3. **Cancel batch hanya kalau belum ada karung**. Kalau sudah ada → flag semua + close.
4. **Backward-compat wajib** untuk Apps Script — modul Produksi yang live tidak boleh break.
5. **Kolom Block (pcs) di Produksi** = total = High + Low (auto-computed di `produksiSaveShift`).
6. **Legacy data (pre-v8)** ditag sebagai Low EC (Tony konfirmasi: rawmat dan produksi pra-v8 semua Low EC).
7. **Stock open batch counted ke saldo** (saat ini bug — should exclude `status='open'`, lihat NC-14 di PRD Bahan Baku).

---

## Brand Guidelines

**Color palette (resmi):**
| Token | Hex | Use |
|-------|-----|-----|
| India Green | `#048419` | Primary button, link, accent utama |
| Green RYB | `#6FBC33` | Hover/secondary |
| Asunglow (yellow) | `#FFD333` | Badge, segitiga logo, accent (JANGAN untuk button utama) |
| Warm Black | `#03473C` | Teks utama / dark surface |

**Fonts:**
- Display & headings: **Exo 2 Semi Bold** (Google Fonts: weights 400/500/600/700)
- Body / UI: **Open Sans Regular** (weights 400/500/600/700)
- Mono (untuk angka): system stack (`ui-monospace, 'SF Mono', Menlo, Consolas, monospace`)

**Logo:** `logo.svg` di root repo. Sudah di-overwrite oleh Tony dengan asset asli — JANGAN revert.

---

## Roadmap — Open Items (urut prioritas)

### Critical Bugs / Risk Mitigations (urgent)

1. **NC-2.3 — Lock spreadsheet protection** (score 15) — cegah edit manual yang rusak schema. Effort: 30 min setup di Google Sheets + Apps Script trigger backup harian.
2. **NC-G — Pengeringan gagal carry-over** — implement field "outcome" (Berhasil/Gagal/Parsial) + field "carry-over basah dari hari sebelumnya". Tanpa ini, formula stock akan salah saat hujan/mesin trouble.
3. **NC-9.1 — Tony single point of failure** — document fallback admin, kasih access ke 1 trusted person.

### Feature Improvements (P1)

4. **Foto Surat Jalan** di Bahan Baku — upload ke Drive, simpan link.
5. **Master Supplier UI** — input/edit supplier dengan auto-fill alamat & harga/kg.
6. **Edit metadata batch** yang sudah closed (catatan, supplier name) dengan audit log.
7. **Telegram notif** ke grup management saat shift submitted (Tony pilih skip per 2026-05-03, tapi balik di P1 list).
8. **Edit shift submitted** dengan audit log "edited by".
9. **Hard validation threshold** — berat per karung max 250kg, basah/kering per shift max threshold.

### Big Features (P2)

10. **Modul Dashboard CEO** — stock card 3-tier (basah/kering/block) real-time, target Q3-Q4 2026.
11. **Modul Penjualan / Output** — track keluar gudang (Kering, Block, Penjualan), schema baru `Output_Kering` + `Output_Block`.
12. **Modul Absensi** — repo terpisah, GPS validation, planned phase berikutnya.
13. **Authentication** — minimum password gate, ideally per-user; cegah URL bocor ke kompetitor.
14. **Bluetooth scale integration** — auto-input berat dari timbangan elektronik.
15. **Offline support** — IndexedDB queue + retry untuk lokasi internet kurang stabil.

---

## Apps Script Deployment (penting!)

Script tidak bisa di-`wrangler deploy`. Ini di Google's domain. Dua cara:

**Cara A — Manual (yang pernah dipakai):**
1. Buka spreadsheet → Extensions → Apps Script
2. Replace seluruh kode → Save (Cmd+S)
3. Deploy → Manage Deployments → Edit → New version → Deploy
4. URL Web App **tidak berubah** (selama deployment yang sama)

**Cara B — Otomatis dengan clasp (recommended kalau sering update):**
```bash
# One-time setup
npm install -g @google/clasp
clasp login

# Per spreadsheet (perlu script ID dari URL Apps Script editor)
mkdir apps-script-prod && cd apps-script-prod
clasp clone <SCRIPT_ID_PROD>      # akan create .clasp.json + Code.js
# atau pull dari spreadsheet existing

# Setelah edit local
clasp push                         # upload ke Apps Script
clasp deploy --description "v8.1"  # buat deployment baru
```

**Catatan:** clasp tidak menjalankan `migrateToV8()` otomatis. Setelah `clasp push`, **tetap perlu manual** Run function migration di Apps Script editor (atau via `clasp run migrateToV8` kalau enable Apps Script API).

---

## Cloudflare Workers Deployment

```bash
# Frontend deploy
git checkout staging
git push origin staging
npx wrangler deploy --env staging
# test di vsk-sistem-staging.workers.dev

# Promote ke production
git checkout main
git merge staging
git push origin main
npx wrangler deploy --env production
```

---

## Conventions

- **Schema migration:** selalu idempotent. Cek dulu kolom existing sebelum insert. Tag legacy data dengan default yang tidak menghancurkan asumsi.
- **Sub-page navigation di module:** scoped via `section.querySelector` — jangan pakai `document.getElementById` untuk class yang collide (seperti `.subnav-btn`).
- **Apps Script POST mode:** `mode: 'no-cors'` di frontend → response tidak bisa dibaca. Konfirmasi sukses lewat re-fetch state.
- **Date format:** `yyyy-MM-dd` di kolom Tanggal, format ISO 8601. TZ Asia/Jakarta.
- **Komentar code:** mix bahasa OK, tapi function names & critical comment in English untuk grep-ability.

---

## How To Help Tony

1. **Sebelum eksekusi besar:** diskusi pendekatan dulu, tunjukkan trade-off
2. **Kalau ada keputusan teknis:** kasih 2-3 opsi dengan rekomendasi, jangan asumsi sendiri
3. **Saat output code:** sertai penjelasan kenapa, bukan cuma what
4. **Saat debugging:** trace step-by-step, tunjukkan cara verify, bukan cuma kasih fix
5. **Tone:** professional, tapi friendly. Mix ID/EN. Hindari over-formal.
6. **Setiap perubahan schema:** flag jelas di chat, ingatkan untuk test di staging dulu
7. **Saat Tony bingung:** sederhanakan dengan analogi, bukan add lebih banyak teknis term

---

## Last Session Summary (2026-05-05)

Migrasi dari Cowork mode ke Claude Code. Sebelumnya selesai:
- v8 schema deploy (full EC split untuk semua modul) — manual migrate via Sheets UI karena Apps Script editor issue
- 5 improvement frontend: WhatsApp grup auto-open, factory icon Produksi, mobile icon active-only, DO placeholder, footer formal report dengan confidential notice
- 4 dokumentasi formal di `docs/` (2 PRD, 1 SOP, 1 brainstorm negative cases)

**Status:** Production stable, no urgent bugs. Ready untuk fase improvement berikutnya.

**Next critical:** NC-G (pengeringan gagal carry-over) + spreadsheet protection (NC-2.3) — keduanya prevent risiko data integrity.
