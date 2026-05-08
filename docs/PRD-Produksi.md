# PRD — Modul Produksi
**Versi:** v8 (live di production per 2026-04-29; full EC split per 2026-05-03)
**Status:** Existing module — dokumentasi state saat ini + identifikasi gap untuk iterasi berikutnya
**Author:** Tony (CEO + sole dev)
**Last updated:** 2026-05-05

---

## Problem Statement

Sebelum sistem ini, rekap produksi harian VSK dicatat manual di buku tulis oleh kepala produksi setiap akhir shift, lalu di-WA-kan ke Tony dalam format bebas. Akibatnya: (1) **report ke management lambat** — sering baru sampai jam 9 malam padahal shift pagi selesai jam 4 sore, (2) **tidak ada visibility realtime** atas progress harian terhadap target produksi (60 pcs/hari), dan (3) **tidak bisa membedakan output High EC vs Low EC**, padahal price point dan permintaan customer berbeda untuk kedua grade. Ini menghambat kemampuan VSK untuk **scale & sertifikasi export tier-1**, di mana traceability per-grade jadi syarat.

Modul Produksi v8 menggantikan rekap manual dengan PWA per-shift yang membreak down setiap field (karung, basah, kering, block) by EC type, otomatis hitung susut dan progress vs target, dan generate laporan WA siap-kirim dengan 1 klik.

---

## Goals

1. **Report harian ke management dalam <15 menit setelah shift selesai** — operator klik "Salin laporan" → buka grup WA → paste → send. Total step <30 detik.
2. **100% shift produksi tercatat digital** — tidak ada lagi shift yang lolos dari pencatatan.
3. **Breakdown per EC type pada semua field** — Karung, Basah, Kering, Block masing-masing punya angka High EC + Low EC yang akurat dan dapat di-trace ke spreadsheet.
4. **Visibility progress vs target real-time** — Tony bisa lihat % achievement target 60 pcs / 300 kg kering kapanpun dari HP.
5. **Susut auto-calculate** dengan formula konsisten — hilangkan ambiguity perhitungan manual yang sering beda antar operator.

---

## Non-Goals

1. **Tracking penjualan / output keluar gudang** — modul ini hanya track produksi (input shift). Penjualan akan jadi modul terpisah.
2. **Quality control flagging per-block** — kalau ada block reject, saat ini tidak ada UI untuk mark itu. Operator catat di field Catatan.
3. **Workforce attendance / payroll integration** — siapa yang shift, jam berapa masuk, lembur — tidak di-track di sini. Akan jadi modul Absensi terpisah.
4. **Mesin/equipment tracking** — kalau pengeringan gagal karena mesin rusak, tidak ada record mesin mana yang masalah. Sementara dicatat di field Catatan.
5. **Multi-day shift / shift malam** — sistem assume hanya 2 shift (Pagi 07-16, Sore 16-00). Shift malam (00-07) belum di-design.

---

## Target Users

| Persona | Volume penggunaan | Concern utama |
|---|---|---|
| **Operator produksi** (1-2 orang per shift) | Setiap akhir shift (2x/hari) | Cepat input, tidak takut salah angka, susut otomatis |
| **CEO/Direktur** (Tony) | Cek rekap pagi & sore + akhir bulan analisis | Akurasi, visibility, breakdown per EC untuk pricing decision |
| **Customer / klien export** (indirect) | — | Traceability per grade EC kalau diminta (P2) |

---

## User Stories

### Operator produksi (priority tertinggi)
- **US-1.1** — Sebagai operator, saya ingin **input data shift dengan field terpisah High EC dan Low EC** supaya saya tidak perlu hitung manual gabungan untuk reporting.
- **US-1.2** — Sebagai operator, saya ingin **susut otomatis terhitung saat saya isi basah & kering** supaya tidak salah hitung di kepala.
- **US-1.3** — Sebagai operator, saya ingin **klik 1 tombol untuk copy laporan + buka grup WA** supaya tidak perlu ketik ulang format laporan.
- **US-1.4** — Sebagai operator, saya ingin **isi 0 di EC type yang tidak diproduksi hari ini** supaya tetap bisa submit walau hanya 1 jenis (mis. cuma Low EC dalam shift itu).
- **US-1.5** — Sebagai operator, saya ingin **catatan opsional kalau ada hal khusus** (misal mesin rusak, listrik mati) supaya management tahu konteks angka yang tampil minim.

### CEO / Direktur
- **US-2.1** — Sebagai CEO, saya ingin **lihat rekap hari ini dengan breakdown per EC** untuk decision pricing/sourcing harian.
- **US-2.2** — Sebagai CEO, saya ingin **lihat % achievement target block (60 pcs/hari) realtime** supaya bisa intervene kalau di tengah hari progress lambat.
- **US-2.3** — Sebagai CEO, saya ingin **buka riwayat 30 hari terakhir** dalam bentuk card per tanggal dengan sub-row per EC, supaya mudah trend-check sambil scroll.
- **US-2.4** — Sebagai CEO, saya ingin **dapat laporan WA otomatis** setiap shift selesai input (P1 — Telegram bot, sementara manual via tombol).

### Klien export (future)
- **US-3.1** — (P2) Sebagai klien export tier-1, saya ingin **certificate of origin per shipment yang merefer ke specific batch produksi** supaya bisa traceability ke field/farm asal cocopeat.

---

## Requirements

### P0 — Must-have (sudah live di v8)

| ID | Requirement | Status |
|---|---|---|
| R-0.1 | Input shift dengan field: shift (pagi/sore), operator, catatan | ✅ Live |
| R-0.2 | Section "Produksi High EC" — 4 field (Karung, Basah, Kering, Block) | ✅ Live |
| R-0.3 | Section "Produksi Low EC" — 4 field (Karung, Basah, Kering, Block) | ✅ Live |
| R-0.4 | Susut auto-calculate dari (Basah_total − Kering_total) / Basah_total × 100% | ✅ Live |
| R-0.5 | Validation: minimal 1 dari (karung/basah/block) terisi sebelum submit | ✅ Live |
| R-0.6 | Tab Rekap Hari Ini: hero block total + 2 sub-card per EC (Karung, Basah, Kering, Block) + prog-card target Block & Kering + log per shift | ✅ Live |
| R-0.7 | Tab Riwayat: card per tanggal dengan 2 sub-row HIGH EC + LOW EC, tiap sub-row punya stats (krg, basah, kering, block, susut). 30 hari terakhir | ✅ Live |
| R-0.8 | WA report button: copy ke clipboard + buka grup WA di tab baru. Format laporan ada breakdown HIGH EC + LOW EC + total + footer confidential | ✅ Live |
| R-0.9 | Backward-compat: data legacy (pra-v8) ditampilkan apa adanya. Backfill migrasi tag semua sebagai Low EC | ✅ Live |

**Acceptance criteria untuk R-0.4 (Susut calculation):**
- Given operator isi Basah High = 100kg, Basah Low = 200kg, Kering High = 60kg, Kering Low = 130kg,
- When focus pindah dari field kering,
- Then field "Susut penjemuran (total)" tampil "(300−190)/300 × 100% = 36.7%".
- Edge case: Basah_total = 0 → Susut tampil "—" (avoid divide by zero).

**Acceptance criteria untuk R-0.6 (Rekap):**
- Given hari ini sudah ada 2 shift submitted (Pagi & Sore) masing-masing dengan breakdown,
- When user buka tab Rekap Hari Ini,
- Then hero tampil total block sum dari kedua shift, 2 sub-card tampil aggregate per EC, log per shift menampilkan kedua entry sorted Pagi → Sore.

### P1 — Nice-to-have (next iteration)

| ID | Requirement | Rasional |
|---|---|---|
| R-1.1 | **Field "carry-over basah dari hari sebelumnya"** — operator bisa input bahan basah yang dipakai hari ini tapi sebenarnya sudah ditimbang di batch hari sebelumnya | **Critical untuk fix NC-G** (lihat negative cases). Tanpa ini, formula stock akan salah saat carry-over terjadi |
| R-1.2 | **Field "outcome pengeringan"**: berhasil / gagal / parsial | Cegah scenario NC-G; kalau gagal, basah tidak counted sebagai outflow |
| R-1.3 | Notifikasi Telegram otomatis ke grup management saat shift submitted | Tony tidak perlu menunggu operator klik export WA |
| R-1.4 | Edit shift submitted (hanya hari yang sama, dengan audit log "edited by") | Cegah operator submit dummy lalu submit lagi |
| R-1.5 | Export Excel/PDF rekap mingguan/bulanan | Untuk laporan formal ke board / banker |
| R-1.6 | Validasi hard: berat per field max threshold (Basah max 5000kg/shift, Kering max 3000kg/shift) | Cegah typo signifikan |

### P2 — Future considerations

| ID | Requirement | Rasional |
|---|---|---|
| R-2.1 | **QC flag per-block** — operator bisa mark berapa block reject, alasan apa | Track quality, bahan ke "Block Reject" inventory |
| R-2.2 | **Multi-shift pattern** (3 shift / shift malam / lembur) | Kalau ekspansi kapasitas |
| R-2.3 | **Mesin tracking** — operator pilih mesin yang dipakai per shift, history downtime per mesin | Maintenance prediction |
| R-2.4 | **Photo input** — foto block hasil produksi atau kondisi anomaly | Audit + dispute |
| R-2.5 | **Linkage ke batch raw material spesifik** — tiap shift bisa attribute "menggunakan batch B-20260503-001" | Full traceability untuk export |
| R-2.6 | **Real-time multi-user collab** — kalau 2 operator input bareng, perubahan auto-sync | Kalau pabrik scale ada multi-line |

---

## Negative Cases & Edge Cases

### Sudah ditangani sistem
| # | Skenario | Behavior sistem |
|---|---|---|
| NC-1 | Operator submit tanpa nama operator | Toast "Isi nama operator dulu", submit dibatalkan |
| NC-2 | Submit dengan semua field kosong (0) | Toast "Isi minimal satu data produksi", submit dibatalkan |
| NC-3 | Basah > Kering (impossible) — sistem hitung negatif susut | Susut formula `((b-k)/b)*100`, kalau k>b hasilnya negatif tampil minus % (operator tahu salah input) |
| NC-4 | Tidak isi salah satu EC type (hanya Low) | OK — sistem terima, total = high (0) + low. Block target tetap dihitung dari total |

### Belum ditangani — RISIKO PRODUKSI

#### NC-G — **Pengeringan gagal (kasus utama dari Tony)**

**Skenario:** Operator pakai 100 karung, total basah 400kg untuk dijemur. Karena kendala (hujan deras, kelembaban tinggi, mesin trouble), hasil kering = 0kg. Block tidak diproduksi (atau 0). Operator submit data apa adanya: 100 krg, 400 kg basah, 0 kg kering, 0 block.

**Dampak ke sistem:**
- Susut = (400-0)/400 = **100%** (impossible secara realita)
- Stock formula: SUM(Rawmat masuk) − SUM(Produksi.Basah) → 400 kg dianggap **terpakai/keluar** dari stock
- Padahal: bahan basah 400 kg **masih ada di lapangan** dan akan dipakai ke esokan harinya

**Akibatnya:**
- Saldo stock di sistem **400 kg lebih rendah** dari realita
- Kalau besok operator pakai bahan yang sama lagi (dengan hasil sukses), sistem akan **double-count** outflow → saldo minus
- Reporting bulanan ke management akan **misleading**

**Solusi long-term (P1):**
- **R-1.2 Field "outcome"**: kalau operator pilih "gagal", sistem treat: Basah masuk, tapi tidak counted sebagai outflow stock. Susut tidak dihitung (NaN atau N/A).
- **R-1.1 Field "carry-over basah"**: hari berikutnya operator input "carry-over dari kemarin: 400 kg", sistem tahu jangan double-count.

**Mitigasi sementara (sambil P1 belum ready):**
- **JANGAN submit shift dengan kering 0 saat pengeringan gagal**
- Kalau pengeringan gagal: operator tulis di field Catatan: "Pengeringan gagal hari ini, basah 400kg dipakai besok", **submit dengan field basah/kering kosong** (0)
- Esok harinya: input basah seperti normal — sistem tidak akan double-count karena hari kemarin tidak ter-record sebagai outflow
- Risiko: laporan harian "tidak ada produksi hari ini" — Tony perlu interpretasi context dari Catatan

#### Other negative cases (operasional)

| # | Skenario | Dampak | Mitigasi sementara | Solusi long-term |
|---|---|---|---|---|
| NC-A | Operator typo digit (basah 4000 instead of 400) yang lolos validation | Susut salah, stock outflow over-stated | Operator manual koreksi di spreadsheet | Hard validation max threshold (R-1.6) |
| NC-B | Operator salah pilih shift (shift Pagi diinput sebagai Sore) | Reporting per shift kacau | Manual edit di spreadsheet | Edit shift submitted (R-1.4) |
| NC-C | Submit ganda untuk shift yang sama (operator klik 2x) | 2 row di sheet untuk 1 shift, double count | Manual delete row di sheet | Server-side dedup: 1 shift = 1 row per (date, shift, operator) |
| NC-D | Operator submit tengah malam (00:30) untuk shift Sore yang baru selesai jam 00:00 | Tanggal di sheet jadi besok-nya, padahal shift kemarin | Edit tanggal manual di sheet | Backdate option: operator pilih tanggal kalau submit late |
| NC-E | Block diproduksi tapi tidak jadi (rejected/rusak saat QC) | Inflated block count | Catat di field Catatan, kurangi manual | QC flag (R-2.1) |
| NC-F | Hasil kering kemarin masih nyimpen di gudang, hari ini diolah jadi block — sistem tidak track stage "kering siap di-block" | Tidak ada visibility kering vs block conversion | None | 3-tier stock card (basah/kering/block) — Dashboard CEO |
| NC-H | Karung dipakai tidak match dengan jumlah karung di Bahan Baku batch (selisih) | Saldo karung beda antara modul | Bandingkan manual | Cross-validation rules |
| NC-I | Listrik mati / koneksi internet putus saat submit | Submit gagal silently (no-cors mode tidak return error) | Operator wajib refresh & cek Riwayat untuk verify | Add success ping sebelum reset form |
| NC-J | Shift Pagi belum di-submit, operator Sore submit duluan | OK — sistem tidak require ordering | None | None (acceptable) |
| NC-K | Operator A submit untuk shift Pagi, tapi sebenarnya yang shift adalah B (operator A salah pakai akun B) | Operator name di sheet salah | Edit manual di spreadsheet | Auth/login (P2) |
| NC-L | Lembur — shift Sore kerja sampai jam 02:00 dini hari, hasil masuk ke "hari berikutnya" | Tanggal di sheet tidak match dengan tanggal kalender shift | Backdate option | R-1.4 |

---

## Limitations (acknowledged trade-offs)

1. **Asumsi "Basah at Produksi" = bahan baku terpakai (consumed)** — formula stock di Bahan Baku assume ini. Kalau pengeringan gagal, asumsi ini break (lihat NC-G).
2. **No carry-over tracking** — sistem tidak punya konsep "bahan basah yang sudah ditimbang tapi belum dijemur".
3. **No reject/quality control** — block yang rusak setelah produksi tidak ter-track.
4. **No outflow tracking** untuk hasil kering & block (penjualan/keluar pabrik). Stock 3-tier (basah/kering/block) hanya parsial — basah ada modulnya, kering & block belum.
5. **No real-time multi-user** — kalau 2 operator buka app bareng untuk shift sama, race condition mungkin terjadi.
6. **Hardcoded targets** — TARGET_BLOCK = 60, TARGET_KERING = 300 di-hardcode di JS. Harus edit code untuk update target.
7. **Tidak ada reminder untuk operator** — kalau shift selesai tapi operator lupa submit, sistem tidak warn siapa-siapa.

---

## Success Metrics

### Leading indicators (cek harian/mingguan)
| Metric | Target | Cara ukur |
|---|---|---|
| % shift tercatat di sistem | 100% (2 shift × 7 hari = 14/minggu) | Query: COUNT shifts in Produksi tab per minggu, vs scheduled |
| Time-to-submit setelah shift selesai | < 15 menit | Self-report operator (sample harian) |
| % shift dengan WA report ke grup | > 95% | Manual count di grup WA |
| Susut rate avg | 30-50% (range realistic) — di luar range = warning, mungkin error input | Aggregate weekly |
| % shift dengan Catatan terisi | > 30% (baik untuk context) | Query |

### Lagging indicators (cek bulanan/kuartalan)
| Metric | Target | Cara ukur |
|---|---|---|
| Time saving Tony per hari (baca laporan) | 30 min/hari saved | Self-tracking |
| Akurasi rekap bulanan vs realita gudang | < 5% deviation | End-of-month stock opname |
| Production target achievement (Block 60 pcs/hari) | > 85% | Aggregate Riwayat |
| % decision pricing yang ter-inform breakdown EC | 100% | Tony self-report |

---

## Open Questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| OQ-1 | Carry-over basah — implementasi UX seperti apa? Field manual atau auto-pull dari "kering=0" hari sebelumnya? | Tony + engineering | **Blocking untuk R-1.1** |
| OQ-2 | Outcome pengeringan — values apa yang relevan? "Berhasil / Gagal / Parsial" atau "Berhasil / Gagal" saja? | Tony | Blocking untuk R-1.2 |
| OQ-3 | Susut threshold normal range (untuk warning anomaly) | Tony / kepala produksi | Non-blocking |
| OQ-4 | Backdate option — sampai berapa hari ke belakang boleh edit? | Tony | Non-blocking |
| OQ-5 | Notifikasi Telegram — kapan trigger? Setiap shift submit, atau per akhir hari? | Tony | Blocking untuk R-1.3 |
| OQ-6 | Target Block 60 / Kering 300 — masih relevan? Atau perlu split per EC? | Tony | Non-blocking |

---

## Timeline Considerations

- **v8 sudah live**. Tidak ada deadline keras untuk improvement berikutnya.
- **R-1.1 + R-1.2 (carry-over + outcome field)** — **prioritas TINGGI** sebelum 2026-06-30 karena kasus NC-G adalah blocker untuk akurasi reporting bulanan. Tony bilang "ada case di lapangan" → artinya pernah terjadi dan akan terjadi lagi.
- **R-1.3 (Telegram notif)** — di-skip dulu sesuai keputusan 2026-05-03 (Tony pilih skip).
- **R-1.4 (Edit shift)** + **R-1.6 (validasi threshold)** — target Q3 2026.
- **Modul Dashboard CEO** (lihat roadmap memori) — inkorporasi NC-F (3-tier stock) target Q3-Q4 2026.

---

## Architectural notes

- **Schema**: 1 sheet `Produksi` dengan 19 kolom (post-v8). Index 0-18 di-track via `PROD_COL` constant di Apps Script.
- **Backend**: Apps Script v8 — endpoint `?action=rekap`, `?action=riwayat`, `?action=debug`. POST default → `produksiSaveShift`.
- **Frontend**: Module `Produksi` di-namespace via IIFE, helper $/qsa scoped ke section `[data-module="produksi"]`.
- **Critical invariant**: Setiap row Produksi: `Karung total = Karung_H + Karung_L`, `Basah total = Basah_H + Basah_L`, dst — di-maintain di `produksiSaveShift` via `splitField` helper.
- **Coupling dengan Bahan Baku**: `getRawmatStock` di Apps Script membaca kolom `Basah High EC` dan `Basah Low EC` dari Produksi untuk hitung outflow per EC. **Schema change Produksi yang menggeser index Basah_H/L akan break stock formula**.
