# PRD — Modul Penjualan VSK

> **Status:** v1.1 — OQ Resolved  
> **Tanggal:** 2026-05-21  
> **Author:** Tony Variantony (CEO, PT Varian Sumber Karya)  
> **Scope:** Modul baru di vsk-sistem — mencatat penjualan / keluar gudang finished goods dan mengurangkan stok secara real-time.

---

## 1. Problem Statement

Setelah proses produksi selesai, finished goods (Kering, Block 1kg, Block 5kg) tersimpan di gudang. Saat ini tidak ada sistem yang mencatat kapan dan berapa banyak barang tersebut keluar ke buyer. Akibatnya:

- **Stok finished goods tidak terlacak** — Tony tidak tahu berapa saldo Kering dan Block yang tersedia kapan saja.
- **Tidak ada audit trail penjualan** — tidak ada rekap per buyer, per bulan, atau per EC type untuk keperluan laporan dan analisis.
- **Keputusan produksi menjadi buta** — tanpa data keluar, sulit menentukan kapan perlu produksi lebih banyak atau lebih sedikit.

Jika tidak diselesaikan: risiko over-promise ke buyer, stok "menghilang" tanpa jejak, dan laporan keuangan tidak akurat.

---

## 2. Goals

1. **Stok finished goods selalu akurat** — setiap kali admin input penjualan, saldo Kering dan Block (per EC type dan per ukuran) berkurang otomatis.
2. **Setiap transaksi penjualan tercatat lengkap** — buyer, PO, DO, tanggal, produk, kuantitas, harga jual, dan foto surat jalan.
3. **Admin dapat menyelesaikan input penjualan dalam < 2 menit** per transaksi tanpa error.
4. **Tony dapat melihat rekap penjualan per bulan** — total volume, nilai, dan breakdown per EC type dari halaman riwayat.
5. **Dashboard stok finished goods real-time** — kapan saja Tony buka, angka sudah benar tanpa perlu hitung manual.

---

## 3. Non-Goals (v1)

| Item | Alasan Out of Scope |
|---|---|
| Modul invoice / faktur penjualan | Kompleksitas keuangan terpisah; butuh integrasi akuntansi |
| Manajemen buyer / master customer | Cukup input teks dulu; master customer di fase berikutnya |
| Integrasi ekspor / Customs declaration | Proses terpisah di luar sistem operasional gudang |
| Notifikasi Telegram saat penjualan dicatat | Bisa ditambah di P1; tidak blocking v1 |
| Edit transaksi penjualan yang sudah submit | Dibahas di open questions; batasi dulu ke "flag/cancel" |
| Laporan keuangan / margin per transaksi | Di luar scope operasional; masuk ke modul Finance masa depan |

---

## 4. User Stories

### Persona: Admin (operator input di kantor)

- Sebagai admin, aku ingin mencatat penjualan finished goods dengan mengisi form buyer, PO, DO, tanggal, dan detail produk, supaya setiap transaksi keluar gudang punya jejak yang lengkap.
- Sebagai admin, aku ingin sistem langsung memvalidasi apakah stok yang mau dijual tersedia, supaya aku tidak bisa input lebih dari saldo yang ada.
- Sebagai admin, aku ingin upload foto surat jalan saat input penjualan, supaya bukti fisik tersimpan digital dan bisa ditelusuri kapan saja.
- Sebagai admin, aku ingin melihat daftar penjualan yang sudah diinput hari ini dan bulan ini, supaya aku bisa verifikasi sebelum laporan ke Tony.

### Persona: Tony (CEO)

- Sebagai Tony, aku ingin melihat stok finished goods saat ini (Kering High/Low EC, Block 1kg High/Low EC, Block 5kg High/Low EC) di satu layar, supaya aku bisa membuat keputusan produksi dan penjualan dengan cepat.
- Sebagai Tony, aku ingin melihat riwayat penjualan per bulan dengan total volume dan nilai, supaya aku punya data untuk laporan dan negosiasi dengan buyer.
- Sebagai Tony, aku ingin sistem menolak input penjualan jika stok tidak cukup, supaya tidak ada data negatif yang merusak laporan stok.

---

## 5. Requirements

### Must-Have — P0

**5.1 Form input penjualan**
- Field wajib: Tanggal, Buyer/Customer, Nomor PO, Nomor Surat Jalan (DO), dan minimal 1 baris produk.
- Field produk per baris: Jenis produk (dropdown), EC Type (High/Low), Jumlah (unit/pcs/kg), Harga per unit.
- Produk yang tersedia di dropdown: `Kering (kg)`, `Block 1kg`, `Block 5kg`.
- **Harga wajib diisi** (OQ-1 resolved). Pengecualian: harga = 0 diperbolehkan untuk *sample shipment* — sistem otomatis mendeteksi jika semua harga = 0 dan memberlakukan batas qty sample (max 2 pcs Block total, max 5 kg Kering).
- Field opsional: Catatan, Upload foto surat jalan.
- Acceptance criteria:
  - [ ] Form tidak bisa disubmit tanpa Tanggal, Buyer, PO, DO, dan minimal 1 produk valid.
  - [ ] Dropdown produk mencakup semua 3 jenis + pilihan EC type.
  - [ ] Validasi: qty > 0 dan tidak boleh melebihi stok tersedia saat submit.
  - [ ] Jika stok tidak cukup, muncul pesan error spesifik: "Stok [produk] [EC] tidak cukup. Tersedia: X, diminta: Y."
  - [ ] Jika semua harga = 0 (sample), tampil indikator kuning + validasi max qty sample.
  - [ ] Sample shipment yang melebihi batas qty → ditolak dengan pesan error spesifik.

**5.2 Pengurangan stok otomatis**
- Setelah penjualan berhasil disimpan, saldo finished goods berkurang sesuai qty yang dijual.
- Saldo Kering dihitung dari: `total Kering yang diproduksi − total Kering yang terjual`.
- Saldo Block (per ukuran dan EC) dihitung dari: `total Block diproduksi − total Block terjual`.
- Acceptance criteria:
  - [ ] Setelah submit penjualan, halaman stok menampilkan angka yang sudah berkurang.
  - [ ] Tidak ada double-count — 1 transaksi = 1 pengurangan stok.
  - [ ] Transaksi yang di-cancel tidak mempengaruhi saldo.

**5.3 Tampilan stok finished goods**
- Card stok menampilkan saldo per produk per EC type: Kering High, Kering Low, Block 1kg High, Block 1kg Low, Block 5kg High, Block 5kg Low.
- Tampil di halaman utama modul Penjualan sebagai referensi sebelum input.
- Acceptance criteria:
  - [ ] Semua 6 sub-stok tampil dengan angka yang benar.
  - [ ] Stok negatif ditandai dengan warna merah sebagai alert.

**5.4 Riwayat penjualan**
- Daftar semua transaksi penjualan, diurutkan terbaru di atas.
- Tampil: tanggal, buyer, nomor DO, total produk, total nilai penjualan, status.
- Filter: per bulan.
- Acceptance criteria:
  - [ ] Riwayat muncul tanpa harus refresh halaman setelah submit baru.
  - [ ] Filter bulan mengubah daftar tanpa full reload.

**5.5 Cancel / void transaksi**
- Admin **dan** Tony dapat membatalkan transaksi yang sudah submit (OQ-2 resolved).
- Cancel mengembalikan stok ke posisi sebelum transaksi tersebut.
- Harus isi alasan cancel (text field, wajib).
- Acceptance criteria:
  - [ ] Transaksi yang di-cancel ditandai status `cancelled`, tidak hilang dari riwayat.
  - [ ] Stok dikembalikan otomatis setelah cancel.
  - [ ] Cancel di hari berbeda tidak diperbolehkan — tampil pesan "Hubungi admin untuk koreksi data lama."

**5.6 Retur barang dari buyer** *(diimplementasi v1.1 setelah OQ-5 resolved)*
- Admin dapat mencatat retur masuk dari buyer, mengacu pada TRX-ID transaksi asal.
- Retur dapat **partial** — qty yang dikembalikan boleh lebih sedikit dari qty yang dijual.
- Stok otomatis naik setelah retur dicatat (formula stock memperhitungkan `jenis='retur'` sebagai pengembalian).
- Alasan retur wajib diisi.
- Acceptance criteria:
  - [ ] Admin dapat input retur dari halaman Riwayat → tombol "↩ Catat Retur Barang" pada drawer detail.
  - [ ] Qty retur tidak bisa melebihi qty original per produk — error spesifik per produk.
  - [ ] Transaksi retur tercatat sebagai baris baru di Output_Penjualan dengan `Jenis = 'retur'` dan `TRX Referensi` = TRX-ID asal.
  - [ ] Stok saldo naik otomatis setelah retur disimpan.
  - [ ] Rekap bulanan menampilkan angka net (penjualan − retur).
  - [ ] Riwayat menampilkan badge "Retur" berwarna oranye untuk membedakan dari penjualan biasa.

### Nice-to-Have — P1

**5.7 Upload foto surat jalan** *(OQ-6 resolved)*
- Foto diupload ke Google Drive folder `1g-Fw_N14WrV4mEBKUNv9nxeHwBU_r41c` (akses: variantony1@gmail.com).
- Konstanta `DRIVE_FOLDER_FOTO_DO` sudah ada di Apps Script v9, siap digunakan.
- Maksimal 1 foto per transaksi di v1.

**5.8 Rekap penjualan bulanan**
- Tabel ringkasan: total volume net per produk (sudah dikurangi retur), total nilai, breakdown per EC type.
- Export-ready (bisa di-copy ke Excel).

**5.9 Notifikasi Telegram**
- Kirim pesan ke grup management setiap kali penjualan dicatat: "✅ Penjualan baru — [Buyer] — [DO] — [produk summary]"

**5.10 Autocomplete nama buyer**
- Sistem menyimpan history nama buyer dan menawarkan autocomplete saat input.

### Future Considerations — P2

- **Master Customer** — profil buyer dengan alamat, kontak, term pembayaran, dan riwayat transaksi.
- **Integrasi laporan keuangan** — margin per transaksi, piutang buyer.
- **Approval flow** — penjualan > threshold tertentu butuh konfirmasi Tony sebelum commit.
- **Export PDF Surat Jalan** — generate dokumen DO langsung dari sistem.

---

## 6. Schema — Tab Baru: `Output_Penjualan`

Tab ini dibuat di Google Sheets (staging + production) sebagai storage utama modul Penjualan.

### 6.1 Header kolom (26 kolom, index 0-based)

```
0  Timestamp Server       — ISO 8601, auto-set server
1  Transaction ID         — Format: TRX-YYYYMMDD-NNN (auto-generate)
2  Tanggal                — yyyy-MM-dd (input user)
3  Buyer                  — nama buyer / customer (text)
4  Nomor PO               — Purchase Order number (text)
5  Nomor DO               — Delivery Order / Surat Jalan (text)
6  Kering High EC (kg)    — qty kering high EC yang dijual / diretur
7  Kering Low EC (kg)     — qty kering low EC yang dijual / diretur
8  Block 1kg High EC      — pcs block 1kg high EC yang dijual / diretur
9  Block 1kg Low EC       — pcs block 1kg low EC yang dijual / diretur
10 Block 5kg High EC      — pcs block 5kg high EC yang dijual / diretur
11 Block 5kg Low EC       — pcs block 5kg low EC yang dijual / diretur
12 Harga Kering/kg        — harga per kg kering (IDR); 0 = sample shipment
13 Harga Block 1kg        — harga per pcs block 1kg (IDR); 0 = sample shipment
14 Harga Block 5kg        — harga per pcs block 5kg (IDR); 0 = sample shipment
15 Total Nilai (IDR)      — auto-computed: sum semua produk × harga
16 Status                 — 'submitted' / 'cancelled'
17 Cancel Reason          — alasan cancel (kosong jika submitted)
18 Foto DO URL            — link Google Drive foto surat jalan (opsional)
19 Operator               — nama yang input
20 Catatan                — notes bebas; untuk retur = alasan retur
21 Input Time             — waktu input oleh user (client-side)
22 Cancel Time            — timestamp cancel (kosong jika submitted)
23 Cancel By              — nama yang cancel (kosong jika submitted)
24 Jenis                  — 'penjualan' | 'sample' | 'retur'
25 TRX Referensi          — TRX-ID transaksi asal (diisi hanya untuk jenis='retur')
```

### 6.2 Formula stok finished goods

Stok dihitung on-the-fly di Apps Script, tidak disimpan di sheet (sama dengan pola rawmat-stock).

Formula memperhitungkan `jenis` kolom (24): penjualan/sample mengurangi stok, retur mengembalikan stok:

```
Saldo Kering High  = SUM(Produksi.Kering_High_EC)
                   − SUM(Output_Penjualan.Kering_High  WHERE status='submitted' AND jenis IN ('penjualan','sample'))
                   + SUM(Output_Penjualan.Kering_High  WHERE status='submitted' AND jenis='retur')

Saldo Kering Low   = (formula sama, Kering Low EC)
Saldo Block 1kg H  = (formula sama, Block 1kg High)
Saldo Block 1kg L  = (formula sama, Block 1kg Low)
Saldo Block 5kg H  = (formula sama, Block 5kg High)
Saldo Block 5kg L  = (formula sama, Block 5kg Low)
```

**Implementasi di Apps Script (v9):** menggunakan `multiplier = (jenis === 'retur') ? -1 : 1` pada loop akumulasi. Logika yang sama diterapkan di `getPenjualanRekap()` untuk rekap bulanan net.

**Konstanta batas sample shipment (dapat diubah di Apps Script):**
- `SAMPLE_MAX_BLOCK_PCS = 2` — max total Block pcs untuk sample
- `SAMPLE_MAX_KERING_KG = 5` — max total Kering kg untuk sample

**Catatan kritis:** Formula bergantung pada kolom `Block_1kg_H/L` dan `Block_5kg_H/L` di tab Produksi (index 22–25). Jangan geser index kolom tersebut.

---

## 7. Endpoints Apps Script

### GET endpoints baru:
- `?action=penjualan-stock` — return saldo finished goods semua produk per EC
- `?action=penjualan-riwayat` — return semua transaksi, diurutkan terbaru
- `?action=penjualan-rekap&bulan=YYYY-MM` — rekap bulanan per produk

### POST types baru:
- `type: 'penjualan-save'` — simpan transaksi baru; auto-detect sample jika semua harga=0; validasi stok + sample max qty di server
- `type: 'penjualan-cancel'` — cancel transaksi + kembalikan stok
- `type: 'penjualan-retur'` — catat retur masuk; validasi partial qty vs original; stok naik otomatis

---

## 8. Success Metrics

### Leading (minggu pertama setelah deploy)

| Metrik | Target |
|---|---|
| Adoption rate (transaksi tercatat via sistem vs. manual) | 100% dalam 7 hari setelah training |
| Error rate saat input | < 5% (form submit gagal karena validasi) |
| Waktu input per transaksi | < 2 menit |

### Lagging (bulan pertama)

| Metrik | Target |
|---|---|
| Stok accuracy | Selisih antara fisik gudang vs. sistem < 2% |
| Tony dapat lihat rekap penjualan bulanan tanpa tanya admin | Ya, dalam 1 klik |
| Zero transaksi tanpa DO number | 0 kasus per bulan |

---

## 9. Open Questions

Semua OQ resolved per 2026-05-21.

| # | Pertanyaan | Jawaban | Implementasi |
|---|---|---|---|
| OQ-1 | Apakah harga jual wajib diisi? | **Wajib.** Harga=0 diperbolehkan → otomatis diklasifikasikan sebagai sample shipment, dibatasi max 2 pcs Block / 5 kg Kering. | ✅ Backend `penjualanSave()` + frontend indicator |
| OQ-2 | Siapa yang boleh cancel transaksi? | **Admin dan Tony** — keduanya boleh. | ✅ Tidak ada auth restriction di v1 |
| OQ-3 | Bolehkah 1 DO number dipakai lebih dari 1 transaksi? | **Ya, boleh** — tidak ada uniqueness constraint pada Nomor DO. | ✅ Tidak perlu perubahan kode |
| OQ-4 | Unit Kering dan Block sama atau berbeda? | **Berbeda** — Kering dalam kg, Block dalam pcs. Asumsi di schema sudah benar. | ✅ Sudah sesuai schema |
| OQ-5 | Bagaimana handle retur dari buyer? | **Opsi A**: transaksi retur sebagai baris baru dengan `jenis='retur'`, partial return OK, admin langsung input tanpa approval. | ✅ Backend `penjualanRetur()` + frontend form di drawer |
| OQ-6 | Foto DO upload ke folder Drive mana? | Folder ID: `1g-Fw_N14WrV4mEBKUNv9nxeHwBU_r41c` — akses variantony1@gmail.com. | ✅ Konstanta `DRIVE_FOLDER_FOTO_DO` sudah di v9 |

---

## 10. Timeline Considerations

| Fase | Item | Estimasi Effort |
|---|---|---|
| **Fase 1 — Core** | Schema + backend (endpoint save/cancel/stock) | 2–3 jam |
| **Fase 1 — Core** | Frontend modul Penjualan (form + stok card + riwayat) | 3–4 jam |
| **Fase 1 — Core** | Deploy ke staging + test manual | 1 jam |
| **Fase 2 — P1** | Upload foto DO (Drive integration) | 2 jam |
| **Fase 2 — P1** | Rekap bulanan + Telegram notif | 2 jam |

Total Fase 1 estimasi: **1 hari kerja** (6–8 jam) jika fokus.

**Dependency kritis:**
- Kolom `Block_1kg_H/L` dan `Block_5kg_H/L` di tab Produksi harus sudah ada (✅ sudah ada di HEADERS_PRODUKSI v8, index 22–25).
- Tab `Output_Penjualan` dibuat otomatis oleh fungsi migrasi saat deploy, tidak perlu buat manual.

---

## 11. Diagram Alur Modul Penjualan

```
Admin buka modul Penjualan
        │
        ▼
  [Cek stok finished goods]  ← ambil dari ?action=penjualan-stock
  Tampil card: Kering H/L, Block 1kg H/L, Block 5kg H/L
        │
        ▼
  [Form Input Penjualan]
  - Buyer, PO, DO, Tanggal
  - Pilih produk + EC type + qty + harga
        │
        ▼
  [Validasi client-side]
  Qty > 0? ── No ──→ Error inline
  Stok cukup? ── No ──→ Error "Stok tidak cukup"
        │ Yes
        ▼
  [POST penjualan-save → Apps Script]
  Server validasi ulang stok ── No ──→ Return error
        │ Stok OK
        ▼
  Tulis ke Output_Penjualan (status='submitted')
  Return TRX-ID + saldo baru
        │
        ▼
  [Frontend refresh stok + tampil notif sukses]
  Riwayat diperbarui
```

---

*PRD ini adalah living document — update sesuai keputusan dari open questions di atas.*
