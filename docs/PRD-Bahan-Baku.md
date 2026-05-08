# PRD — Modul Bahan Baku (Rawmat)
**Versi:** v8 (live di production per 2026-04-29)
**Status:** Existing module — dokumentasi state saat ini + identifikasi gap untuk iterasi berikutnya
**Author:** Tony (CEO + sole dev)
**Last updated:** 2026-05-03

---

## Problem Statement

Sebelum sistem ini, kedatangan bahan baku cocopeat di pabrik VSK dicatat manual di buku tulis oleh kepala gudang. Akibatnya: (1) **tidak ada audit trail** per-karung — kalau supplier menagih 100 karung tapi yang tercatat 90, sulit untuk dispute; (2) **tidak ada visibility real-time** atas stock cocopeat yang menumpuk di gudang, sehingga keputusan beli rawmat sering reactive (beli ketika stock hampir habis, padahal harga lagi tinggi); (3) **rekonsiliasi billing supplier vs penerimaan riil** memakan waktu hari-hari kerja per akhir bulan.

Modul Bahan Baku v8 menggantikan proses manual tersebut dengan PWA yang mencatat tiap karung individual, membedakan jenis cocopeat (High EC / Low EC), dan menghitung saldo stock secara real-time.

---

## Goals

1. **100% kedatangan tertagging digital** — tidak ada lagi kedatangan yang dicatat di buku tulis. Setiap karung punya record dengan timestamp, batch ID, supplier, EC type, operator yang menimbang.
2. **Audit trail tiap karung** — kalau ada dispute supplier (jumlah/berat), bisa cek per-karung di spreadsheet kapan saja.
3. **Saldo stock real-time per EC** — Tony (sebagai CEO) bisa cek dari HP kapanpun: berapa kg High EC dan Low EC tersisa di gudang.
4. **Validasi anti-anomali otomatis** — kalau berat 1 karung deviation > 25% dari rata-rata, tampil warning untuk operator (cegah typo).
5. **Rekonsiliasi billing 5x lebih cepat** — dari 2-3 hari per akhir bulan jadi <1 jam (export riwayat batch + match dengan invoice supplier).

---

## Non-Goals

1. **Tracking penjualan/keluar bahan kering & block** — cuma track inflow rawmat. Penjualan keluar gudang masih di luar scope (akan jadi modul "Penjualan" terpisah nanti).
2. **Multi-supplier validation per batch** — saat ini 1 batch = 1 supplier. Tidak support truk yang bawa cocopeat dari 2 supplier sekaligus.
3. **Integrasi langsung ke timbangan elektronik** — operator masih input berat manual. Bluetooth/serial scale integration ada di roadmap tapi tidak P0.
4. **Foto surat jalan / dokumentasi visual** — saat ini cuma teks (no DO). Foto upload akan jadi P1.
5. **Master supplier dengan auto-fill alamat & harga/kg** — saat ini supplier diisi free-text. Master supplier tab sudah disiapkan di spreadsheet tapi belum dipakai aktif.

---

## Target Users

| Persona | Volume penggunaan | Concern utama |
|---|---|---|
| **Operator gudang** (1-2 orang) | Setiap kedatangan truk (~3-5x/minggu) | Cepat & tidak ribet, tidak takut salah input |
| **CEO/Direktur** (Tony) | Setiap pagi cek stock + akhir bulan rekonsiliasi | Akurasi data, visibility tanpa harus telpon operator |
| **Kepala gudang** (akan datang) | Audit + supervisi | Bisa flag karung yang error, tidak boleh hapus data |

---

## User Stories

### Operator gudang (high priority)
- **US-1.1** — Sebagai operator, saya ingin **mulai batch kedatangan baru dengan memilih supplier dan jenis EC** supaya semua karung yang akan saya timbang otomatis ter-attach ke batch yang benar.
- **US-1.2** — Sebagai operator, saya ingin **timbang karung satu per satu dengan urutan otomatis** supaya tidak perlu input nomor manual tiap kali.
- **US-1.3** — Sebagai operator, saya ingin **diberi warning kalau berat karung jauh dari rata-rata** supaya bisa cek ulang sebelum simpan (cegah typo).
- **US-1.4** — Sebagai operator, saya ingin **flag karung yang salah timbang tanpa bisa menghapusnya** supaya audit trail tetap utuh tapi total tidak terkontaminasi.
- **US-1.5** — Sebagai operator, saya ingin **menutup batch saat selesai timbang** supaya tidak ada risiko karung dari truk berikutnya nyangkut ke batch ini.

### CEO/Direktur
- **US-2.1** — Sebagai CEO, saya ingin **lihat saldo stock real-time per jenis EC dari HP** supaya tidak perlu telpon operator untuk tanya stock.
- **US-2.2** — Sebagai CEO, saya ingin **lihat 10 mutasi terakhir (masuk/keluar)** supaya bisa pantau aktivitas pabrik tanpa buka spreadsheet.
- **US-2.3** — Sebagai CEO, saya ingin **buka detail batch lama** untuk verifikasi kalau ada complaint dari supplier soal jumlah karung.

### Kepala gudang (future)
- **US-3.1** — (P2) Sebagai kepala gudang, saya ingin **upload foto surat jalan saat mulai batch** supaya bisa cross-reference dengan tagihan supplier.
- **US-3.2** — (P2) Sebagai kepala gudang, saya ingin **edit metadata batch yang sudah closed** (misal koreksi nama supplier) tanpa bisa mengubah karung-nya.

---

## Requirements

### P0 — Must-have (sudah live di v8)

| ID | Requirement | Status |
|---|---|---|
| R-0.1 | Operator bisa mulai batch baru dengan field: nama operator, supplier, no. surat jalan (DO), EC type (high/low), catatan opsional | ✅ Live |
| R-0.2 | Hanya 1 batch boleh `open` di waktu yang sama; server tolak start kalau sudah ada open batch | ✅ Live |
| R-0.3 | Tiap karung input tunggal: berat (kg) wajib. Urut otomatis sequential per batch. Operator default ke nama dari batch (bisa override) | ✅ Live |
| R-0.4 | Warning anomaly muncul kalau berat karung deviation > 25% dari rata-rata (minimum 5 karung sudah ditimbang sebelum aktif) | ✅ Live |
| R-0.5 | Karung tidak bisa dihapus, hanya bisa di-flag (toggle). Karung flagged tidak dihitung total/saldo, tapi tetap tersimpan untuk audit | ✅ Live |
| R-0.6 | Cancel batch hanya boleh kalau belum ada karung. Sudah ada karung → harus tutup batch saja | ✅ Live |
| R-0.7 | Total karung & total berat di header batch auto-recompute setiap perubahan karung (add/flag) | ✅ Live |
| R-0.8 | Saldo stock per EC = SUM(Rawmat_Karung.Berat WHERE batch.EC=X AND not flagged) − SUM(Produksi.Basah_X) | ✅ Live |
| R-0.9 | Tab Stock tampilkan: hero saldo total, 2 sub-card (High EC + Low EC) dengan saldo + total masuk/pakai, mutasi 10 terakhir | ✅ Live |
| R-0.10 | Tab Riwayat tampilkan 50 batch terbaru dengan kolom: Tanggal, Supplier, EC, Karung, Berat, Status. Klik row → drawer detail batch | ✅ Live |

**Acceptance criteria untuk R-0.1 (Mulai Batch):**
- Given tidak ada batch yang `open`,
- When operator isi nama, supplier, EC type, klik "Mulai Timbang",
- Then batch baru dibuat dengan status `open`, batch ID format `B-YYYYMMDD-NNN`, EC type tersimpan, dan UI berpindah ke mode timbang.

**Acceptance criteria untuk R-0.5 (Flag karung):**
- Given karung #5 berat 25kg sudah tersimpan dan ada di total batch,
- When operator klik flag pada karung #5 dengan reason "tumpah",
- Then karung #5 ditandai flagged=TRUE di Rawmat_Karung, total batch di-recompute (turun 25kg), karung tetap muncul di list dengan style flagged (strikethrough), audit trail menyimpan timestamp flag.

### P1 — Nice-to-have (next iteration)

| ID | Requirement | Rasional |
|---|---|---|
| R-1.1 | Foto surat jalan: operator upload foto saat mulai batch, simpan link di Drive | Critical untuk dispute supplier |
| R-1.2 | Master supplier UI: input/edit supplier dengan auto-fill alamat & harga/kg standar | Cegah typo nama supplier (misal "PT ABC" vs "ABC PT") yang bikin reporting kacau |
| R-1.3 | Edit metadata batch yang sudah closed (catatan, supplier name) — kolom "Edited By" + timestamp | Operator bisa koreksi typo tanpa mengganggu audit karung |
| R-1.4 | Notifikasi Telegram saat batch ditutup — kirim ke grup management dengan ringkasan total | Tony dapat real-time tanpa harus buka app |
| R-1.5 | Bulk action di mode timbang — input "10 karung @ 25kg" sekaligus untuk batch homogen | Hemat waktu kalau truk bawa karung dengan berat sama persis |

### P2 — Future considerations

| ID | Requirement | Rasional |
|---|---|---|
| R-2.1 | Bluetooth/serial scale integration | Hemat 1-2 detik per karung × ratusan karung = signifikan |
| R-2.2 | Offline-first dengan IndexedDB queue | Pabrik di lokasi yang internet kurang stabil; jangan blok timbang karena no signal |
| R-2.3 | Multi-supplier per batch (truk gabungan) | Edge case operasional yang muncul kalau VSK ekspansi sourcing |
| R-2.4 | Karung campuran EC dalam 1 batch | Kalau supplier mulai mix, kita perlu support |
| R-2.5 | QR/barcode per karung | Trace ke konsumen export — value-add untuk klien export tier-1 |

---

## Negative Cases & Edge Cases

Section ini PALING PENTING untuk Tony — supaya operator tidak panik saat skenario tak ideal terjadi, dan kita tahu apa yang sistem belum handle.

### Sudah ditangani sistem
| # | Skenario | Behavior sistem |
|---|---|---|
| NC-1 | Berat karung 0 / negatif | Server tolak (validation `berat <= 0`) |
| NC-2 | 2 batch open bersamaan | Server tolak start batch ke-2; operator harus close yang pertama dulu |
| NC-3 | Cancel batch yang sudah ada karung | Server tolak; harus pakai close batch dengan flag semua karung kalau dianggap salah |
| NC-4 | Submit karung saat batch sudah closed | Server tolak (`batch.status !== 'open'`) |
| NC-5 | Anomaly berat (deviation > 25%) | Warning di UI, tapi tidak blok submit (operator bisa override kalau memang valid) |

### Belum ditangani — RISIKO PRODUKSI

| # | Skenario | Dampak | Mitigasi sementara | Solusi long-term (P1/P2) |
|---|---|---|---|---|
| NC-6 | Operator salah pilih EC type saat mulai batch (misal pilih High padahal Low) | Saldo stock per EC jadi salah; reporting bocor | Edit manual di spreadsheet kolom EC Type | Add edit button di batch card (R-1.3) |
| NC-7 | Karung pecah/tumpah saat timbang, sebagian tertumpah | Berat tidak akurat | Operator timbang sisanya yang masih bisa diukur, lalu **flag karung** dengan reason "tumpah sebagian" | Tambah field "berat hilang (kg)" di flag form |
| NC-8 | Listrik mati / koneksi internet putus saat timbang batch | Karung yang sedang ditimbang tidak tersimpan, batch tetap open di server | Reload halaman saat connection back; sistem akan re-fetch state. Karung yang belum tersimpan harus ditimbang ulang | Offline queue (R-2.2) |
| NC-9 | Truk pulang sebelum semua karung sempat ditimbang | Batch tetap open dengan jumlah karung kurang | Operator close batch dengan total yang sudah ditimbang; sisa karung tidak akan tercatat (kalau supplier tagih full, jadi dispute) | Notifikasi auto-close batch jika idle > X jam |
| NC-10 | Operator timbang karung dari truk B di batch truk A (lupa tutup batch lama) | Karung salah supplier; saldo & EC mungkin salah | Flag karung yang salah supplier, lalu mulai batch baru | Sistem belum bisa mendeteksi otomatis |
| NC-11 | Truk datang saat ada batch open dari truk sebelumnya yang lupa di-close | Operator tidak bisa start batch baru | Close batch lama (semua karung jadi closed), baru start batch baru | Auto-prompt "Anda yakin batch X masih open?" jika ada attempt start saat ada open >2 jam |
| NC-12 | Operator typo digit (1000 instead of 100) yang lolos warning anomaly | Total batch overinflated | Manual: flag karung itu, tambah karung dengan berat benar | Hard validation: berat per karung harus <max threshold (mis. 250kg) |
| NC-13 | 2 karung dengan urut sama (race condition kalau operator klik save 2x cepat) | Duplicate karung di sheet | Sistem belum lock — possibility ada | Server-side increment lock dengan retry |
| NC-14 | Karung sudah dipakai untuk produksi sebelum batch di-close (status open masih dihitung "in stock") | Stock berlebih dihitung; saldo > realita | Operator harus close batch segera setelah selesai timbang | Status "open" should NOT count to saldo (yang dihitung hanya "closed") — perlu ubah formula |
| NC-15 | Operator A mulai batch, ganti shift, operator B yang close batch | Field operator di batch tidak akurat (cuma 1 nama tersimpan) | Tambah catatan "closed by [B]" manual | Tambah field "closed_by" terpisah |

---

## Limitations (acknowledged trade-offs)

1. **No offline support** — kalau internet putus, fitur timbang tidak jalan. Pabrik VSK saat ini di lokasi dengan internet stabil; kalau ekspansi ke gudang lain dengan internet kurang, ini jadi blocker.
2. **No role-based access** — semua user yang punya URL bisa start/close batch. Tidak ada autentikasi. Risiko: operator yang sudah keluar masih bisa input data.
3. **No multi-warehouse** — sistem asumsi 1 gudang. Kalau VSK punya 2 gudang nantinya, perlu refactor schema.
4. **Saldo formula assume "Basah at Produksi" = bahan terpakai** — kalau pengeringan gagal (basah jadi balik), saldo akan minus / tidak akurat. Lihat PRD Produksi NC-G untuk detail.
5. **No data retention policy** — semua data sejak awal disimpan di Google Sheets. Kalau dalam 5 tahun ada 100k+ rows, performa Apps Script akan drop (ada limit 6 menit eksekusi).
6. **No real-time multi-user collaboration** — kalau 2 operator buka app bersamaan, perubahan dari 1 user tidak otomatis muncul di app yang lain (perlu refresh).

---

## Success Metrics

### Leading indicators (cek harian/mingguan)
| Metric | Target | Cara ukur |
|---|---|---|
| % kedatangan tercatat di sistem | 100% | Manual cross-check buku gudang vs riwayat batch (bulanan) |
| Adoption operator | 100% (dari 1-2 operator) | Cek aktivitas login per operator |
| Time-to-record per kedatangan | <5 menit (untuk truk 30 karung) | Stopwatch saat truk datang |
| Error rate (batch dengan flag > 5%) | < 5% dari total batch | Query: COUNT batches WHERE flagged_karung/total_karung > 5% |

### Lagging indicators (cek bulanan/kuartalan)
| Metric | Target | Cara ukur |
|---|---|---|
| Waktu rekonsiliasi billing supplier | < 1 jam (dari 2-3 hari sebelumnya) | Stopwatch end-of-month process |
| Stock akurasi (sistem vs aktual fisik gudang) | < 2% deviation | Stock opname tiap akhir bulan, bandingkan |
| Dispute supplier (berapa kali ada complaint vs system) | 0 dispute, atau 100% resolvable dari audit trail | Track per kuartal |

---

## Open Questions

| ID | Question | Owner | Blocking? |
|---|---|---|---|
| OQ-1 | Apakah saldo stock harus exclude batch dengan status `open`? Saat ini termasuk, jadi mungkin overstate | engineering | Non-blocking; revisit setelah operator pengalaman 1 bulan |
| OQ-2 | Threshold maksimum berat per karung (untuk hard validation NC-12) — apa angka realistic? | Tony / kepala gudang | Blocking untuk R-1 |
| OQ-3 | Auto-close batch idle > X jam — X = berapa jam? Pertimbangan: shift malam | Tony | Non-blocking; monitor dulu |
| OQ-4 | Foto surat jalan — disimpan di Drive folder mana? Akses untuk siapa? | Tony | Blocking untuk R-1.1 |
| OQ-5 | Master supplier — minimum field apa saja yang perlu? Harga/kg per supplier atau per produk? | Tony | Blocking untuk R-1.2 |

---

## Timeline Considerations

- **v8 sudah live** per 2026-04-29 (production) dan 2026-05-03 (staging migrate manual). Tidak ada deadline keras untuk iterasi berikutnya.
- **Critical follow-up sebelum 2026-06-30**: NC-14 (status `open` exclude dari saldo) — bug halus yang berpotensi mengacau reporting bulanan pertama.
- **R-1.1 (foto surat jalan)** target Q3 2026 — selaras dengan rencana ekspansi customer export (mereka biasanya minta dokumentasi traceability).
- **Migrasi ke modul Penjualan** (untuk track outflow kering & block) — target Q3-Q4 2026 setelah operasional v8 stable 2 bulan.

---

## Architectural notes (untuk dev lanjutan)

- **Schema**: 4 sheet — `Rawmat_Kedatangan` (header per batch), `Rawmat_Karung` (1 row per karung), `Suppliers` (master), `Produksi` (cross-reference untuk hitung outflow)
- **Backend**: Apps Script v8 — endpoint `?action=rawmat-stock`, `?action=rawmat-batches`, `?action=rawmat-batch&id=X`, `?action=rawmat-active`
- **Frontend**: PWA di Cloudflare Workers, hostname-based env detection
- **Critical invariant**: SUM(Rawmat_Karung.Berat WHERE not flagged) per batch == header.Total Berat (di-maintain via `updateBatchTotals` setelah tiap operasi)
