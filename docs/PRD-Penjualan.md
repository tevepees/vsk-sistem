# PRD — Modul Penjualan VSK

> **Status:** Draft v1.0  
> **Tanggal:** 2026-05-19  
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
- Field opsional: Catatan, Upload foto surat jalan.
- Acceptance criteria:
  - [ ] Form tidak bisa disubmit tanpa Tanggal, Buyer, PO, DO, dan minimal 1 produk valid.
  - [ ] Dropdown produk mencakup semua 3 jenis + pilihan EC type.
  - [ ] Validasi: qty > 0 dan tidak boleh melebihi stok tersedia saat submit.
  - [ ] Jika stok tidak cukup, muncul pesan error spesifik: "Stok [produk] [EC] tidak cukup. Tersedia: X, diminta: Y."

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
- Admin (atau Tony) dapat membatalkan transaksi yang sudah submit selama masih di hari yang sama.
- Cancel mengembalikan stok ke posisi sebelum transaksi tersebut.
- Harus isi alasan cancel (text field, wajib).
- Acceptance criteria:
  - [ ] Transaksi yang di-cancel ditandai status `cancelled`, tidak hilang dari riwayat.
  - [ ] Stok dikembalikan otomatis setelah cancel.
  - [ ] Cancel di hari berbeda tidak diperbolehkan — tampil pesan "Hubungi admin untuk koreksi data lama."

### Nice-to-Have — P1

**5.6 Upload foto surat jalan**
- Foto diupload ke Google Drive, link disimpan di sheet.
- Maksimal 1 foto per transaksi di v1.

**5.7 Rekap penjualan bulanan**
- Tabel ringkasan: total volume per produk, total nilai, breakdown per EC type.
- Export-ready (bisa di-copy ke Excel).

**5.8 Notifikasi Telegram**
- Kirim pesan ke grup management setiap kali penjualan dicatat: "✅ Penjualan baru — [Buyer] — [DO] — [produk summary]"

**5.9 Autocomplete nama buyer**
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
6  Kering High EC (kg)    — qty kering high EC yang dijual
7  Kering Low EC (kg)     — qty kering low EC yang dijual
8  Block 1kg High EC      — pcs block 1kg high EC yang dijual
9  Block 1kg Low EC       — pcs block 1kg low EC yang dijual
10 Block 5kg High EC      — pcs block 5kg high EC yang dijual
11 Block 5kg Low EC       — pcs block 5kg low EC yang dijual
12 Harga Kering/kg        — harga per kg kering (IDR)
13 Harga Block 1kg        — harga per pcs block 1kg (IDR)
14 Harga Block 5kg        — harga per pcs block 5kg (IDR)
15 Total Nilai (IDR)      — auto-computed: sum semua produk × harga
16 Status                 — 'submitted' / 'cancelled'
17 Cancel Reason          — alasan cancel (kosong jika submitted)
18 Foto DO URL            — link Google Drive foto surat jalan (opsional)
19 Operator               — nama yang input
20 Catatan                — notes bebas
21 Input Time             — waktu input oleh user (client-side)
22 Cancel Time            — timestamp cancel (kosong jika submitted)
23 Cancel By              — nama yang cancel (kosong jika submitted)
```

### 6.2 Formula stok finished goods

Stok dihitung on-the-fly di Apps Script, tidak disimpan di sheet (sama dengan pola rawmat-stock):

```
Saldo Kering High  = SUM(Produksi.Kering_High_EC) − SUM(Output_Penjualan.Kering_High_EC WHERE status='submitted')
Saldo Kering Low   = SUM(Produksi.Kering_Low_EC)  − SUM(Output_Penjualan.Kering_Low_EC  WHERE status='submitted')
Saldo Block 1kg H  = SUM(Produksi.Block_1kg_H)    − SUM(Output_Penjualan.Block_1kg_H    WHERE status='submitted')
Saldo Block 1kg L  = SUM(Produksi.Block_1kg_L)    − SUM(Output_Penjualan.Block_1kg_L    WHERE status='submitted')
Saldo Block 5kg H  = SUM(Produksi.Block_5kg_H)    − SUM(Output_Penjualan.Block_5kg_H    WHERE status='submitted')
Saldo Block 5kg L  = SUM(Produksi.Block_5kg_L)    − SUM(Output_Penjualan.Block_5kg_L    WHERE status='submitted')
```

**Catatan kritis:** Formula ini bergantung pada kolom `Block_1kg_H/L` dan `Block_5kg_H/L` di tab Produksi (index 22–25, sudah ada di HEADERS_PRODUKSI v8). Jangan geser index kolom tersebut.

---

## 7. Endpoints Apps Script

### GET endpoints baru:
- `?action=penjualan-stock` — return saldo finished goods semua produk per EC
- `?action=penjualan-riwayat` — return semua transaksi, diurutkan terbaru
- `?action=penjualan-rekap&bulan=YYYY-MM` — rekap bulanan per produk

### POST types baru:
- `type: 'penjualan-save'` — simpan transaksi baru (validasi stok di server)
- `type: 'penjualan-cancel'` — cancel transaksi + kembalikan stok

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

| # | Pertanyaan | Owner | Blocking? |
|---|---|---|---|
| OQ-1 | Apakah harga jual wajib diisi, atau bisa kosong untuk transaksi yang belum deal harga? | Tony | P0 — affects validation |
| OQ-2 | Siapa saja yang boleh cancel transaksi? Admin saja, atau Tony juga? | Tony | P0 — affects auth design |
| OQ-3 | Bolehkah 1 DO number dipakai untuk 2 transaksi berbeda? (misalnya DO yang sama untuk 2 pengiriman parsial?) | Tony | P0 — affects uniqueness constraint |
| OQ-4 | Apakah stok Kering dan Block dihitung dalam unit yang sama atau berbeda? (Kering dalam kg, Block dalam pcs — sudah diasumsikan terpisah di schema ini) | Tony | konfirmasi saja |
| OQ-5 | Bagaimana handle retur dari buyer? (Barang dikembalikan, stok perlu naik lagi) | Tony | P2 — tidak blocking v1 |
| OQ-6 | Foto DO upload ke Drive folder mana? Perlu setup permission khusus? | Tony | P1 — blocking untuk feature upload |

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
