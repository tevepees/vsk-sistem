# Negative Cases & Risk Brainstorm — VSK Sistem

**Tujuan:** Mengidentifikasi negative case di luar yang sudah didokumentasikan di PRD, sebelum kita lanjut develop modul/feature baru. Lebih murah cegah sekarang daripada perbaikan saat sudah terjadi.

**Method:** *Reverse Brainstorming* — "bagaimana kita membuat sistem ini paling rusak?" — lalu invert tiap jawaban jadi mitigasi. Plus *First Principles Decomposition* untuk asumsi yang tertanam.

**Convention:** Tiap case di-rate (P × I) di mana P=Probability (1-5), I=Impact (1-5). Score ≥ 12 = prioritas tinggi.

---

## Frame: Asumsi tersembunyi yang sistem ini bertumpu pada

Sebelum brainstorm scenarios, mari list asumsi-asumsi yang jika SALAH akan menumbangkan banyak hal:

| # | Asumsi | Riskiest? |
|---|---|---|
| A1 | Operator selalu jujur saat input data | ⚠ HIGH |
| A2 | Semua bahan baku punya 1 EC type per batch (tidak campur) | ⚠ MEDIUM |
| A3 | "Basah at Produksi" = bahan dipakai/dikonsumsi (irreversible) | ⚠ HIGH (sudah teridentifikasi di PRD) |
| A4 | Stock fisik = stock sistem (no theft, no jamur, no tikus) | ⚠ HIGH |
| A5 | Internet di pabrik selalu stabil | ⚠ MEDIUM |
| A6 | Tony selalu available untuk koreksi data | ⚠ MEDIUM |
| A7 | Google Sheets / Apps Script / Cloudflare tidak akan down lama | ⚠ LOW (provider reliable) |
| A8 | Operator bisa baca dan mengerti UI yang dalam Bahasa Indonesia | ⚠ MEDIUM |

**Cheap test untuk asumsi paling beresiko:**
- A1: Audit acak — sekali-sekali Tony datang langsung, hitung fisik gudang, bandingkan sistem
- A4: Stock opname bulanan (rutin)
- A6: Plan succession — siapa yang bisa koreksi data kalau Tony tidak available?

---

## Bagian 1 — OPERATIONAL REALITY

Skenario di lapangan yang belum di-cover PRD individual modul.

### NC-1.1 — Pergantian operator (turnover)
**Skenario**: Operator gudang lama berhenti, operator baru masuk. Belum tahu cara pakai sistem, butuh training. Selama transisi 1-2 minggu, risiko salah input tinggi.

**P=3, I=3 → Score 9**

**Mitigasi cepat (P0):**
- SOP operator (sudah dibuat di `docs/SOP-Operator-VSK-Sistem.md`)
- Onboarding: minta operator baru shadow operator lama 2 hari
- Test simulasi di STAGING URL sebelum dilepas ke prod

**Solusi long-term:**
- Sertifikasi internal operator — checklist competency yang harus dilewati
- Video tutorial 5 menit untuk tiap modul (rekam dengan HP, simpan di Drive)

### NC-1.2 — Operator gak melek teknologi / sulit baca
**Skenario**: Operator level lapangan, mungkin pendidikan SD-SMP, terbiasa kerja fisik. UI dengan bahasa teknis ("ec type", "flag", "submit") bisa membingungkan.

**P=3, I=2 → Score 6**

**Reverse brainstorm: Bagaimana membuatnya paling membingungkan?**
- Pakai jargon Inggris di mana-mana ✗ (kita pakai mix)
- Tombol kecil-kecil sulit di-tap di HP
- Warning ambigu ("warn deviation 25%")

**Inversi → mitigasi:**
- Audit UI untuk istilah yang membingungkan (saat ini "flag" — apakah operator paham?). Mungkin diganti "Tandai Salah"
- Tombol primer minimum 44px (sudah)
- Warning pakai bahasa konkret: "Berat ini berbeda jauh dari rata-rata. Cek lagi sebelum simpan."
- Icon-heavy UI: kurangi reliance ke teks panjang

### NC-1.3 — Operator color-blind atau visual impairment
**Skenario**: Card High EC (hijau) dan Low EC (kuning) tidak bisa dibedakan oleh operator color-blind. Sistem terlalu mengandalkan warna sebagai cue.

**P=1, I=3 → Score 3** (low frequency, high impact saat terjadi)

**Mitigasi:**
- Tambah label TEKS yang explicit di setiap kotak EC (sudah, tapi cek lagi kontras)
- Tambah pattern/icon selain warna (mis. ✦ untuk High, ◆ untuk Low)

### NC-1.4 — 2-3 operator pakai 1 device sharing
**Skenario**: Pabrik kecil, 1 HP shared. Operator A buka batch, operator B lanjut, tapi sistem hanya simpan 1 nama (yang start batch).

**P=3, I=2 → Score 6**

**Mitigasi:**
- Field "operator yang menutup batch" terpisah (R-1.x untuk Bahan Baku)
- Atau: prompt re-input nama saat tutup batch ("Yang menutup batch: [____]")

### NC-1.5 — HP operator hilang/rusak/baterai habis
**Skenario**: Tengah-tengah timbang, HP mati. Karung sudah ke-input 15 dari 30 expected. Mau lanjut tapi HP kedua belum diset up.

**P=3, I=2 → Score 6**

**Mitigasi sekarang:**
- 2-3 perangkat (HP/tablet) per shift sebagai backup
- Operator tahu URL dari hafalan, tidak hanya dari bookmark
- PWA installed di home screen — pasti selalu ke-cache

**Long-term:**
- Multi-device session sync (saat ini sudah, karena server-side state) ✓
- QR code di tembok gudang dengan URL — kalau operator perlu pinjam HP ke siapapun, tinggal scan

---

## Bagian 2 — DATA INTEGRITY & CORRUPTION

### NC-2.1 — Race condition: 2 operator submit bersamaan
**Skenario**: Operator A lagi tutup batch, operator B start batch baru di device lain. Server bisa accept B sebelum A close → 2 batch open, schema invariant break.

**P=2, I=4 → Score 8**

**Mitigasi:**
- Server-side lock di Apps Script (LockService.getDocumentLock()) saat doPost
- Saat ini code belum pakai lock — perlu added

### NC-2.2 — Apps Script timeout (6-min limit)
**Skenario**: Saat data sudah 5000+ rows, function `getRawmatStock` yang loop 2 sheet besar bisa kena 6-menit limit. UI freeze, operator frustrated.

**P=3 (akan terjadi dalam 2-3 tahun jika growth normal), I=4 → Score 12 ⚠**

**Mitigasi (proactive):**
- Implementation paginasi/batching sekarang sebelum bottleneck
- Migrate ke Cloud Run / proper backend kalau scale
- Atau pakai Sheets sebagai cache + materialized view (tab `Stock_Cache` yang di-refresh tiap N menit dengan trigger)

**Cheap experiment:** simulate 5000 rows di STAGING database, ukur response time `?action=rawmat-stock`. Kalau >3 detik, prioritize refactor.

### NC-2.3 — Spreadsheet di-edit manual oleh non-Tony, schema rusak
**Skenario**: Bos minta tolong asisten edit data, asisten salah hapus baris atau hapus kolom Block High EC. Schema break, semua read fail.

**P=3, I=5 → Score 15 ⚠⚠**

**Mitigasi:**
- **Spreadsheet protection** — Lock kolom & row range di Google Sheets (Tony only edit)
- Audit log: kalau ada cell change, log ke tab `Change_Log` (pakai `onEdit` trigger di Apps Script)
- Backup harian otomatis ke Drive folder lain (Apps Script time-driven trigger)
- SOP: "Hanya Tony yang edit sheet"

### NC-2.4 — Restore dari backup yang lama (selisih beberapa hari)
**Skenario**: Spreadsheet rusak, perlu restore. Backup terakhir 3 hari lalu. Data 3 hari hilang.

**P=2, I=4 → Score 8**

**Mitigasi:**
- Backup harian (Drive history versions sudah simpan)
- Plan recovery: restore + re-input dari WA grup (ada laporan harian)
- Audit log dari Cloudflare worker (request logs) — bisa jadi sumber re-construct

### NC-2.5 — Karung urut duplicate (race) atau gap
**Skenario**: Karung urut sequence: 1, 2, 3, 5 (no 4). Atau ada 2 karung dengan urut 5.

**P=2, I=2 → Score 4**

**Mitigasi:**
- Validasi urut server-side (sudah ada `countKarungInBatch + 1` tapi tidak atomic)
- Tambah retry logic kalau detect duplicate
- Display warning "ada gap di urut karung" di UI

---

## Bagian 3 — SECURITY & ACCESS

### NC-3.1 — URL aplikasi bocor ke kompetitor / pihak luar
**Skenario**: Kompetitor dapat URL `vsk-sistem.workers.dev`, akses sistem kita, bisa lihat data produksi & supplier.

**P=2, I=4 → Score 8**

**Mitigasi (urgent):**
- **Implementasi authentication** — minimal password gate, ideally per-user
- IP whitelist di Cloudflare Worker (kalau pabrik IP tetap)
- Atau pakai Cloudflare Access (zero trust) untuk login Google/SSO

### NC-3.2 — Mantan karyawan masih punya akses
**Skenario**: Operator A keluar, masih bisa buka URL dan input data dummy / sabotase.

**P=2, I=4 → Score 8**

**Mitigasi:** sama dengan 3.1 — perlu auth & access control.

### NC-3.3 — Sabotase: anyone bisa input ratusan dummy karung
**Skenario**: Iseng/dengki, seseorang submit 1000 batch dummy. Spreadsheet bloat, susah audit.

**P=1, I=5 → Score 5** (low chance tapi tidak ada barrier)

**Mitigasi:**
- Auth (sama)
- Rate limiting di Apps Script
- Audit alert: notif kalau >X batch dalam Y menit

### NC-3.4 — PII di sheet ke-leak
**Skenario**: Nama operator + nomor surat jalan + nama supplier ada di sheet. Kalau sheet ke-share publik (sengaja atau salah klik "Anyone with link"), data sensitif keluar.

**P=2, I=3 → Score 6**

**Mitigasi:**
- Sheet sharing dibatasi ke Tony only (atau small list)
- Audit Drive permissions tiap kuartal
- Apps Script `Execute as: Me` (sudah default)

---

## Bagian 4 — SKALA / GROWTH PAINS

### NC-4.1 — Riwayat 30 hari jadi lambat saat data >50k rows
**Skenario**: 2 tahun beroperasi, data Produksi 700+ rows (≈1 shift/hari × 365 hari × 2 tahun). Karung mungkin 50k+ rows. Function `getRiwayat` yang loop full sheet jadi lambat.

**P=4 (akan terjadi), I=3 → Score 12 ⚠**

**Mitigasi:**
- Index lookup pakai dictionary di start function (sudah ada di `getRawmatStock`)
- Limit data fetch ke 30 hari window saja
- Long-term: migrate ke proper DB (BigQuery / Postgres / Supabase)

### NC-4.2 — Mobile data quota habis
**Skenario**: Operator pakai data HP pribadi. Akses ke `script.google.com` (which redirects multiple times) konsumsi quota cukup. Quota habis = tidak bisa input.

**P=2, I=2 → Score 4**

**Mitigasi:**
- Pabrik provide WiFi
- Atau allowance pulsa untuk operator

### NC-4.3 — Browser cache stale di HP operator
**Skenario**: Saat update v8 deploy, HP operator masih cache v7. Form lama muncul, miss field baru. Operator submit, server reject.

**P=3, I=2 → Score 6**

**Mitigasi:**
- Service worker cache key (v8 → v9 saat update besar) — sudah ada di sw.js, tapi pastikan di-bump tiap deploy
- Toast warning "App version updated, please refresh"

---

## Bagian 5 — BUSINESS EDGE CASES (banyak yang belum di-handle)

### NC-5.1 — Theft / pilferage di gudang
**Skenario**: 5 karung "hilang" misterius di gudang. Sistem masih hitung ada di stock, fisik tidak ada.

**P=2, I=4 → Score 8**

**Mitigasi:**
- **Stock opname rutin (bulanan)** — bandingkan sistem vs fisik
- **Tab Adjustment** untuk koreksi manual dengan reason wajib (theft/loss/spillage/damage)
- Notif Tony otomatis kalau ada adjustment >X kg

### NC-5.2 — Bahan baku rusak (jamur, tikus, basah hujan)
**Skenario**: 200 kg cocopeat di gudang kena tikus, harus dibuang. Sistem tidak tahu.

**P=3, I=3 → Score 9**

**Mitigasi:** sama — tab Adjustment dengan reason field. Operator/Bos catat: "Reject 200kg karena rusak".

### NC-5.3 — Reklasifikasi EC type setelah test ulang
**Skenario**: Batch B-001 di-tag Low EC saat masuk, tapi setelah QC test, ternyata Low EC palsu/borderline → harus reclass jadi High EC.

**P=2, I=3 → Score 6**

**Mitigasi:**
- Edit metadata batch (R-1.3 di PRD Bahan Baku) — kolom EC Type bisa diubah, dengan audit log
- Sistem auto-recompute saldo per EC

### NC-5.4 — Bonus/promo karung dari supplier
**Skenario**: Supplier kasih bonus 5 karung gratis. Tidak masuk ke billing. Tapi tetap masuk ke timbangan dan stock.

**P=2, I=2 → Score 4**

**Mitigasi:**
- Field "Berbayar / Gratis" per karung (P2)
- Sementara: catat di field Catatan batch ("5 karung terakhir gratis dari supplier")

### NC-5.5 — Customer return / re-export
**Skenario**: Block sudah dikirim ke export, customer return karena kualitas. Block balik ke gudang. Sistem tidak track inflow karena sistem belum ada outflow tracking.

**P=1, I=3 → Score 3** (low frequency tapi membingungkan)

**Mitigasi:**
- Modul Penjualan & Return (future)
- Sementara: catat manual di sheet terpisah

### NC-5.6 — Block setengah jadi (kering tapi belum dipres)
**Skenario**: Pengeringan sukses, hasil kering 280 kg. Tapi mesin block rusak, tidak bisa pres. Kering disimpan di gudang.

**P=3, I=3 → Score 9**

**Mitigasi:**
- Field tambahan: "Hasil kering belum dipres jadi block (kg)" — track work-in-progress
- Atau: 3-tier stock card (basah / kering siap-block / block jadi) — solve by Dashboard CEO modul

---

## Bagian 6 — DISASTER RECOVERY

### NC-6.1 — Google account Tony ter-suspend
**Skenario**: Akun Google Tony ter-suspend (terms violation, hack, dll.). Spreadsheet & Apps Script tidak bisa diakses.

**P=1, I=5 → Score 5**

**Mitigasi:**
- Backup spreadsheet otomatis ke akun lain (Drive sync)
- Multiple owner di spreadsheet (tambah istri / pasangan / co-founder sebagai owner)
- 2FA di akun Google Tony

### NC-6.2 — Cloudflare Worker down
**Skenario**: Cloudflare regional outage. URL `vsk-sistem.workers.dev` tidak respond. Operator tidak bisa input.

**P=1, I=3 → Score 3** (Cloudflare uptime 99.99%+)

**Mitigasi:**
- SOP fallback: operator catat di kertas dulu, input setelah service balik
- Cloudflare status page bookmark untuk Tony

### NC-6.3 — Tony non-aktif (sakit, liburan panjang, etc.)
**Skenario**: Tony tidak available untuk koreksi data atau approve change. Sistem tetap jalan, tapi error tertumpuk.

**P=2, I=3 → Score 6**

**Mitigasi:**
- Backup admin: orang lain (anggota keluarga / co-founder) yang dipercaya bisa edit sheet & deploy
- Documented runbook untuk "kalau Tony tidak available, lakukan ini"

---

## Bagian 7 — UX TRAPS (psikologis)

### NC-7.1 — Operator stress submit asal-asalan
**Skenario**: Akhir shift, operator ngantuk, terburu-buru, submit dengan angka kira-kira tanpa cek timbangan.

**P=4, I=3 → Score 12 ⚠**

**Mitigasi:**
- "Are you sure?" confirm pop-up dengan summary angka sebelum final submit
- Random audit sample dari Tony (misal 10% input dicek ulang)

### NC-7.2 — Operator nunda submit sampai accumulate
**Skenario**: Operator submit shift dari 3 hari sekaligus (lupa / malas). Tanggal di sheet jadi semua hari ini.

**P=3, I=3 → Score 9**

**Mitigasi:**
- Backdate field di submit (R-1.4 di PRD Produksi)
- Reminder/notif ke Tony kalau shift hari ini belum tersubmit jam X
- SOP: submit sebelum pulang shift

### NC-7.3 — Notif fatigue (Telegram)
**Skenario**: Saat fitur notif Telegram jadi (R-1.3), Tony dapat notif tiap karung disubmit (misal 30 karung × 2 truk/hari = 60 notif/hari). Berhenti baca notif.

**P=4, I=2 → Score 8** (kalau salah implementasi)

**Mitigasi:**
- Notif batch: 1x summary saat batch closed (bukan per karung)
- Categorize: critical (saldo minus, batch idle >2 jam) vs informational (shift submitted)
- Daily digest jam 18:00 (1 notif rangkum hari itu)

---

## Bagian 8 — COMPLIANCE / REGULATORY (untuk export tier-1)

### NC-8.1 — Audit dari customer export tier-1
**Skenario**: Customer Eropa minta certificate of origin per shipment, dengan traceability ke batch raw material spesifik.

**P=3 (kalau ekspansi export), I=3 → Score 9**

**Mitigasi:**
- Modul "Linkage shift produksi → batch rawmat" (R-2.5 di PRD Produksi)
- Export-able audit trail per shipment
- Sertifikasi ISO 22000 atau sejenis (proses lain)

### NC-8.2 — Data retention regulation
**Skenario**: Indonesia mulai apply data privacy law (UU PDP). Data supplier (PII) harus di-handle dengan policy retention.

**P=2, I=3 → Score 6**

**Mitigasi:**
- Data retention policy: hapus data >5 tahun otomatis
- Anonymisasi nama operator setelah karyawan keluar
- Privacy notice untuk supplier

---

## Bagian 9 — STRATEGIC RISKS

### NC-9.1 — Tony sebagai single point of failure
**Skenario**: Tony adalah CEO + sole dev + sole admin. Kalau Tony tidak ada (sakit, liburan), tidak ada yang bisa fix bug, deploy update, koreksi data.

**P=3 (saat ini), I=4 → Score 12 ⚠**

**Mitigasi:**
- Hire/contract dev junior untuk knowledge transfer (jangka 6-12 bulan)
- Documentation comprehensive (sebagian sudah dibuat — PRD, SOP)
- Repository di GitHub yang accessible ke 1+ trusted person

### NC-9.2 — Vendor lock-in (Apps Script + Sheets + Cloudflare)
**Skenario**: Salah satu provider (Google atau Cloudflare) berubah pricing/policy yang tidak favorable. Migrasi sulit karena Apps Script API tied ke Sheets.

**P=2, I=3 → Score 6**

**Mitigasi:**
- Architecture review tiap 2 tahun
- Plan B: kalau Apps Script jadi mahal/limited, migrate ke Cloudflare Worker + D1 atau Supabase. Schema sudah ter-document, migrasi feasible.

### NC-9.3 — Feature creep — sistem jadi terlalu kompleks
**Skenario**: Setelah 2 tahun, sistem punya 8 modul. Operator overwhelmed. Adoption turun.

**P=3, I=3 → Score 9**

**Mitigasi:**
- Stick to "operator UI = simple, admin UI = advanced" — split UI berdasarkan role
- Periodic UX review: tiap 6 bulan tanya operator "fitur apa yang bingung / tidak dipakai"
- Sunset feature yang tidak dipakai

---

## Top 10 Critical Cases (priority — score-based)

| # | Case | Score | Recommended Action |
|---|---|---|---|
| 1 | NC-2.3 — Manual sheet edit rusak schema | 15 | **Implement spreadsheet protection + audit log NOW** |
| 2 | NC-2.2 — Apps Script timeout (6-min) | 12 | Stress-test STAGING dengan 5000 dummy rows |
| 3 | NC-4.1 — Riwayat lambat saat data besar | 12 | Schedule refactor di Q4 2026 |
| 4 | NC-7.1 — Operator submit asal-asalan | 12 | Add confirm pop-up dengan summary |
| 5 | NC-9.1 — Tony single point of failure | 12 | Hire junior dev / document everything |
| 6 | NC-1.1 — Pergantian operator | 9 | SOP + onboarding (sudah dibuat) |
| 7 | NC-5.2 — Bahan baku rusak | 9 | Tab Adjustment (P1) |
| 8 | NC-5.6 — Block setengah jadi | 9 | 3-tier stock card di Dashboard CEO |
| 9 | NC-7.2 — Submit accumulate | 9 | Backdate field + reminder |
| 10 | NC-9.3 — Feature creep | 9 | Periodic UX review tiap 6 bulan |

---

## Cheap Experiments untuk validate riskiest assumptions

| Assumption | Cheap Experiment | Cost | Timeline |
|---|---|---|---|
| A1 (operator jujur) | Random audit fisik 1x/minggu, bandingkan dengan sistem | 30 min/minggu | Mulai sekarang |
| A3 (basah = consumed) | Track 1 minggu kasus pengeringan gagal, ukur dampak ke saldo | 0 | 1 minggu |
| A4 (stock fisik = sistem) | Stock opname akhir bulan ini | 2 jam | Akhir bulan |
| A6 (Tony available) | Simulasi: Tony liburan 1 minggu, siapa fallback? | 0 | Pikirkan now |
| NC-2.2 (timeout) | Generate 5000 dummy rows di staging, ukur response | 1 jam | Minggu depan |

---

## Rekomendasi prioritas eksekusi (4-8 minggu ke depan)

**Minggu 1-2 (lock down basics):**
1. Spreadsheet protection (lock cells/columns, only Tony edit) — fix NC-2.3 (paling tinggi score)
2. Backup otomatis spreadsheet ke Drive folder lain (script trigger harian)
3. SOP enforce: Tony saja yang edit sheet manual

**Minggu 3-4 (carry-over fix):**
1. Implement R-1.1 + R-1.2 (carry-over basah + outcome pengeringan) di PRD Produksi — fix NC-G utama
2. Tab `Adjustment` minimal (manual koreksi stock dengan reason) — fix NC-5.1 + NC-5.2

**Minggu 5-6 (resilience):**
1. Server-side LockService di doPost — fix NC-2.1 (race condition)
2. Confirm pop-up di submit shift — fix NC-7.1
3. Stress-test apps script dengan dummy rows — validate NC-2.2

**Minggu 7-8 (governance):**
1. Authentication minimal (password page) — fix NC-3.x
2. Document fallback admin (siapa yang bisa edit jika Tony non-aktif) — fix NC-9.1

---

## Yang sengaja DI-PARK (interesting tapi belum prioritas)

- Multi-warehouse support — saat ini 1 gudang
- Multi-language UI — operator semua Indonesia
- Mobile-first redesign — desktop-first sekarang OK
- Real-time multi-user collaborative editing
- Bluetooth scale integration
- QR/barcode per karung
- Customer-facing portal untuk track shipment

---

## Provocative Questions (untuk re-think strategy)

Beberapa pertanyaan yang Tony sebagai CEO harus pikirkan, di luar tactical:

1. **"Kalau VSK 10x lebih besar dalam 2 tahun (3 pabrik, 50 karyawan), apakah arsitektur ini masih jalan?"**
   - Probably no. Apps Script + Sheets break di scale. Plan migration path sekarang.

2. **"Apa yang akan dilakukan kompetitor setelah lihat sistem ini?"**
   - Kalau VSK ekspansi, kompetitor mungkin ikut digitalisasi. Sistem ini bukan moat — bukan competitive advantage jangka panjang. Moat real-nya: kualitas produk + relationship customer + brand.

3. **"Apa ROI sistem ini dalam 1 tahun?"**
   - Hitung: time saved Tony (30 min/hari × 365 = 180 jam) × hourly rate Tony + reduction billing dispute + faster decision making → masuk akal vs cost development?

4. **"Apa hal paling mahal yang bisa terjadi dari sistem ini gagal?"**
   - Stock minus → wrong sourcing decision → over-buying → tied-up cash flow
   - Wrong reporting ke board/investor → loss of credibility
   - Audit failure dari customer export → lose tier-1 contract

5. **"Apakah operator senang pakai sistem ini? Atau mereka menganggapnya beban?"**
   - Tanya langsung. Kalau beban, mereka akan mencari short-cut yang merusak data integrity.

---

## Closing — riskiest single bet

Dari semua case di atas, **risiko paling besar yang bisa unlock atau menumbangkan banyak hal sekaligus** adalah:

> **NC-2.3 (manual sheet edit rusak schema) + NC-9.1 (Tony single point of failure) gabungan.**
>
> Kalau Tony lupa lock sheet ATAU asisten salah edit ATAU Tony tidak ada untuk fix, sistem rusak diam-diam selama berhari-hari sebelum ketahuan. Reporting bulanan jadi salah, decision bisnis jadi salah.

**Cheapest fix yang harus segera dilakukan:**
1. Lock sheet protection (15 menit setting di Google Sheets)
2. Daily auto-backup ke Drive folder terpisah (Apps Script trigger, 30 menit setup)
3. Tulis 1-page runbook "Kalau Tony tidak available, lakukan ini" — share ke 1 trusted person

Total effort: <2 jam. Total risk reduction: signifikan.

---

**Done. Lanjut diskusi case mana yang mau di-deep-dive, atau mulai eksekusi minggu 1-2?**
