# SOP — Cara Pakai VSK Sistem untuk Operator

**Untuk:** Operator gudang & operator produksi VSK
**Owner:** Kepala produksi / kepala gudang
**Last Updated:** 2026-05-05
**Review Cadence:** Setiap 3 bulan, atau setiap ada update sistem

---

## Tujuan SOP Ini

Panduan langkah-demi-langkah supaya **semua operator VSK** (level staf gudang & produksi) bisa input data dengan **benar dan konsisten** ke web app VSK Sistem. Jangan takut salah — sistem sudah dibuat sederhana, dan SOP ini menjelaskan **apa yang harus dilakukan kalau ada hal aneh**.

**Aturan emas:**
> Lebih baik lapor ke Bos kalau ragu, daripada submit data yang salah. Data yang salah susah dibetulkan dan bisa bikin hitungan stock kacau.

---

## Cakupan

✅ **Yang ada di SOP ini:**
- Cara buka aplikasi VSK Sistem
- Cara input kedatangan bahan baku (modul **Bahan Baku**)
- Cara input data shift produksi (modul **Produksi**)
- Cara kirim laporan ke grup WA
- Apa yang harus dilakukan kalau ada masalah (mati listrik, internet putus, salah input, dll.)

❌ **Yang TIDAK ada di SOP ini:**
- Cara setting akun / login (saat ini tidak perlu login, tinggal buka URL)
- Edit data yang sudah masuk ke sheet (itu tugas Bos, **operator JANGAN edit Google Sheets**)
- Approval keluar barang / penjualan

---

## Siapa Bertugas Apa (RACI)

| Tugas | Siapa yang **Kerjakan** | Siapa yang **Bertanggung Jawab** | Siapa yang **Ditanya kalau bingung** | Siapa yang **Dikabari kalau selesai** |
|------|------------|-------------|-----------|----------|
| Timbang bahan baku masuk | Operator gudang | Kepala gudang | Kepala gudang | Tony (via grup WA) |
| Input data shift produksi | Operator produksi shift itu | Kepala produksi | Kepala produksi | Tony (via grup WA) |
| Tutup batch / submit shift | Operator yang sama | Kepala terkait | Kepala terkait | Otomatis (kirim laporan WA) |
| Edit data yang salah | **Bos / Tony** (BUKAN operator) | Tony | Tony | — |

---

# BAGIAN 1 — Modul Bahan Baku (untuk Operator Gudang)

## Kapan dipakai

Setiap kali **truk bahan baku cocopeat datang** ke gudang VSK.

## Apa yang dipersiapkan dulu

1. Timbangan sudah on dan kalibrasi
2. HP atau tablet untuk buka VSK Sistem (URL: `vsk-sistem.variantony1.workers.dev`)
3. Surat jalan / Delivery Order (DO) dari supplier
4. Pastikan ingat: bahan baku ini **High EC** atau **Low EC**? Kalau ragu, **tanya supir truk** atau **panggil Kepala gudang**.

## Flowchart Singkat

```
                ┌─────────────────────────────┐
                │  Truk bahan baku datang     │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Buka aplikasi VSK Sistem   │
                │  Klik menu "Bahan Baku"     │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Tab "Kedatangan"           │
                │  Klik "Mulai Timbang"       │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Isi form:                  │
                │  - Nama operator (kamu)     │
                │  - Supplier                 │
                │  - No. DO (surat jalan)     │
                │  - Pilih: HIGH EC / LOW EC  │
                │  - Catatan (opsional)       │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Klik "Mulai Timbang"       │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Timbang karung 1           │◄────┐
                │  Input berat (kg)           │     │
                │  Klik "Simpan & Lanjut"     │     │
                └──────────────┬──────────────┘     │
                               │                    │
                       ┌───────┴───────┐            │
                       │ Masih ada     │            │
                       │ karung lain?  │            │
                       └───┬───────┬───┘            │
                       Ya  │       │ Tidak          │
                           └───────┘                │
                           │       │                │
                           ▼       │                │
                    Ulang langkah  │                │
                    timbang ──────┴────────────────┘
                           │
                           ▼
                ┌─────────────────────────────┐
                │  Klik "Selesai —            │
                │   Tutup Kedatangan"         │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │  Selesai ✓                  │
                │  Kabari Bos via WA          │
                └─────────────────────────────┘
```

## Langkah Detail

### Step 1: Buka Aplikasi
- **Siapa**: Operator gudang yang menerima truk
- **Kapan**: Begitu truk masuk gerbang
- **Caranya**:
  1. Buka browser (Chrome di HP)
  2. Ketik URL: `vsk-sistem.variantony1.workers.dev`
  3. Pastikan **TIDAK ADA tulisan "STAGING"** di pojok bawah sidebar — kalau ada, itu sistem latihan, **JANGAN dipakai untuk data asli**
  4. Di sidebar kiri, klik menu **"Bahan Baku"** (icon 📦)
- **Output**: Sudah masuk ke modul Bahan Baku

### Step 2: Mulai Batch Baru
- **Siapa**: Operator yang sama
- **Kapan**: Sebelum mulai timbang karung pertama
- **Caranya**:
  1. Pastikan kamu di **tab "Kedatangan"** (paling kiri di atas)
  2. Kalau muncul form "Kedatangan baru", lanjut ke step 3. Kalau muncul card batch yang masih open dari kemarin, **panggil Bos dulu** — jangan timbang sebelum batch lama di-close.
- **Output**: Form kedatangan baru terbuka

### Step 3: Isi Form
- **Caranya**:
  1. **Operator**: ketik nama lengkap kamu (misal "Pak Dio")
  2. **Supplier**: ketik nama supplier sesuai surat jalan (misal "PT XYZ Sumber Cocopeat")
  3. **No. surat jalan**: ketik nomor DO dari surat jalan supplier (misal "DO-2026-0512")
  4. **Pilih jenis cocopeat**: klik salah satu kotak — **High EC** (kotak hijau) atau **Low EC** (kotak kuning). **DEFAULT: Low EC** — kalau bahan ini Low EC, langsung lanjut. Kalau High EC, klik kotak High dulu.
  5. **Catatan**: opsional. Isi kalau ada hal khusus (misal "karung agak basah" atau "nomor truk B-1234")
  6. Klik tombol hijau **"Mulai Timbang"**
- **Output**: Layar berpindah ke mode timbang. Muncul card hijau bertuliskan Batch ID (misal "B-20260505-001") dan jenis EC.

### Step 4: Timbang Karung Satu Per Satu
- **Siapa**: Operator
- **Kapan**: Setiap karung diturunkan dari truk
- **Caranya**:
  1. Naik karung ke timbangan
  2. Tunggu angka berat di timbangan stabil
  3. Di app, ketik berat di kotak besar (misal "25.5")
  4. Cek display "Karung berikutnya: #1" — pastikan nomor urut sesuai (otomatis dari sistem)
  5. Klik tombol hijau **"Simpan & Lanjut"**
  6. Ulangi untuk karung berikutnya
- **Output**: Setiap kali Simpan, total karung dan total berat di card atas naik. Daftar karung yang sudah ditimbang muncul di bawah.

> **PERHATIAN — kalau muncul kotak kuning "Berat lebih tinggi/rendah dari rata-rata":**
> Sistem deteksi ada anomaly (mungkin typo). **CEK ULANG ANGKA** sebelum klik Simpan. Kalau memang berat segitu, klik Simpan tetap. Kalau salah ketik, koreksi dulu.

### Step 5: Kalau Karung Salah / Tumpah / Pecah
- **Skenario**: Karung sudah ditimbang dan tersimpan, tapi ternyata salah berat atau pecah
- **Caranya**:
  1. Cari karung yang salah di daftar (scroll ke atas, kotaknya di bawah weigh-input)
  2. Klik tombol kecil **"flag"** di sebelah kanan karung itu
  3. Konfirmasi di pop-up
  4. Karung itu jadi abu-abu / coret. **Total berat otomatis turun.**
- **Output**: Audit trail tetap aman — karung tidak hilang, hanya tidak dihitung. **JANGAN EDIT GOOGLE SHEETS.**

### Step 6: Tutup Batch (Penting!)
- **Kapan**: Setelah karung TERAKHIR ditimbang
- **Caranya**:
  1. Scroll ke bawah
  2. Klik tombol **"Selesai — Tutup Kedatangan"**
  3. Konfirmasi pop-up "Tutup kedatangan ini?"
- **Output**: Status batch berubah jadi `closed`. Kembali ke layar awal (siap untuk batch berikutnya).

> **PENTING**: Kalau lupa tutup batch, **batch berikutnya tidak bisa dibuka** sampai batch lama di-close. Jangan lupa step ini.

### Step 7: Kabari Bos
- **Caranya**: Kirim WA ke grup management (atau ke Tony langsung) format singkat:
  ```
  Bahan baku masuk ✓
  Batch: B-20260505-001
  Supplier: PT XYZ
  Total: 30 karung, 750 kg
  Jenis: Low EC
  ```

---

## Exception (Bahan Baku) — Apa yang Dilakukan Kalau...

| Situasi | Yang Harus Dilakukan |
|---|---|
| Internet putus saat timbang | **STOP. Tunggu internet pulih.** Karung yang sudah Simpan tetap tersimpan di server. Karung yang belum Simpan **wajib ditimbang ulang.** Refresh app saat internet pulih. |
| Listrik mati di tengah timbang | Sama seperti internet putus — server tidak terganggu. Saat listrik balik, refresh app, lanjut timbang sisanya. |
| Salah pilih jenis EC saat mulai batch | **JANGAN tutup batch.** Telpon / WA Bos. Bos akan edit di Google Sheets. |
| Salah ketik nama supplier | Sama — telpon Bos. **JANGAN edit sheet.** |
| Truk pulang sebelum semua karung sempat timbang | Tutup batch saja dengan jumlah karung yang sudah sempat ditimbang. Catat di field Catatan: "Sisa X karung tidak sempat ditimbang, akan dikejar besok." Lapor Bos. |
| Timbangan rusak / off | **JANGAN INPUT MANUAL ESTIMASI** ke sistem. Catat di kertas dulu. Kalau timbangan diperbaiki di hari yang sama, masih bisa input. Kalau besok, lapor Bos. |
| Truk datang saat ada batch dari kemarin yang masih `open` | Berarti operator kemarin lupa tutup. **JANGAN langsung mulai batch baru** (sistem akan tolak). Tutup batch lama dulu (cek isi karung-nya benar dulu — kalau ragu, telpon Bos). |
| Karung berat 0 / sangat ringan (mis. <5 kg) | Cek karungnya — mungkin kosong / sobek. Kalau bukan untuk dihitung, jangan input. Kalau memang harus dicatat (untuk audit), input dengan berat sebenarnya, lalu **flag** dengan reason "karung kosong/sobek". |

---

# BAGIAN 2 — Modul Produksi (untuk Operator Produksi)

## Kapan dipakai

Setiap **akhir shift produksi**:
- Shift Pagi (07:00 — 16:00) → input setelah shift selesai
- Shift Sore (16:00 — 00:00) → input setelah shift selesai

## Apa yang dipersiapkan dulu

1. Catatan jumlah karung yang dijemur hari ini (per EC)
2. Catatan berat basah masuk pengeringan (per EC)
3. Catatan berat kering hasil keluar (per EC)
4. Catatan jumlah block jadi (per EC)
5. Catatan kalau ada masalah (mesin rusak, hujan, dll.)

## Flowchart Singkat

```
        ┌─────────────────────────────┐
        │  Shift produksi selesai     │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Buka VSK Sistem            │
        │  Sidebar → "Produksi" 🏭    │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Tab "Input Shift"          │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Pilih shift: PAGI / SORE   │
        │  Isi nama operator          │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Section "Produksi High EC" │
        │  - Karung dijemur           │
        │  - Bahan basah (kg)         │
        │  - Hasil kering (kg)        │
        │  - Block jadi (pcs)         │
        │                             │
        │  (kalau hari ini tidak ada  │
        │   produksi High EC, isi 0)  │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Section "Produksi Low EC"  │
        │  - Karung dijemur           │
        │  - Bahan basah (kg)         │
        │  - Hasil kering (kg)        │
        │  - Block jadi (pcs)         │
        │                             │
        │  (sama: isi 0 kalau tidak)  │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Tulis catatan kalau perlu  │
        │  (misal: "hujan, kering 0") │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Klik "Simpan Data Shift"   │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Sistem auto pindah ke      │
        │  tab "Rekap Hari Ini"       │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Scroll ke bawah → klik     │
        │  "Salin laporan untuk WA"   │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │  Tab WA grup terbuka otomatis│
        │  Tap & tahan kotak chat →   │
        │  Paste → Send               │
        └──────────────┬──────────────┘
                       │
                       ▼
                  Selesai ✓
```

## Langkah Detail

### Step 1: Buka Modul Produksi
1. Buka URL `vsk-sistem.variantony1.workers.dev`
2. Pastikan TIDAK ada badge "STAGING"
3. Di sidebar kiri, klik **"Produksi"** (icon 🏭)
4. Pastikan kamu di tab **"Input Shift"** (paling kiri)

### Step 2: Pilih Shift & Operator
1. Klik kotak **"Pagi"** atau **"Sore"** sesuai shift kamu
2. Ketik nama operator (kamu) di kotak "Nama operator"

### Step 3: Isi Section "Produksi High EC"
Kalau hari ini ada produksi High EC, isi 4 angka:
- **Karung dijemur**: jumlah karung bahan basah High EC yang masuk pengeringan hari ini
- **Bahan basah (kg)**: total kg basah yang masuk pengeringan
- **Hasil kering (kg)**: total kg kering yang keluar dari pengeringan
- **Block jadi (pcs)**: jumlah block High EC yang berhasil dipres

> **Kalau hari ini TIDAK ADA produksi High EC**: biarkan 4 field ini kosong (atau isi 0 — sama saja).

### Step 4: Isi Section "Produksi Low EC"
Sama persis seperti High EC — 4 angka untuk Low EC.

> **Kalau hari ini TIDAK ADA produksi Low EC**: biarkan kosong / isi 0.

### Step 5: Cek Susut Otomatis
Kotak kuning di bawah akan otomatis tampil "Susut penjemuran (total): XX%". Ini hasil hitungan otomatis dari (basah total − kering total) / basah total.

> **Susut wajar**: 30% — 60%.
> **Susut > 70%**: kemungkinan ada masalah (hujan, mesin trouble). Tulis di Catatan.
> **Susut 100%** (kering = 0): lihat **case khusus pengeringan gagal** di bawah.

### Step 6: Tulis Catatan (kalau perlu)
Contoh catatan yang membantu Bos:
- "Hujan deras, hasil kering tidak maksimal"
- "Mesin block A trouble, switch ke mesin B sore"
- "Kering 100kg masih disimpan, belum di-block"
- "Listrik mati 2 jam, target tidak tercapai"

### Step 7: Submit & Kirim Laporan
1. Klik tombol hijau **"Simpan Data Shift"**
2. Sistem otomatis pindah ke tab **"Rekap Hari Ini"**
3. Scroll ke bawah, klik tombol **"Salin laporan untuk WhatsApp"**
4. Toast hijau muncul: "Laporan disalin ✓ — buka WA, paste & send"
5. Otomatis **tab grup WA terbuka di browser baru**
6. Di WhatsApp, **tap & tahan kotak chat** → pilih **Paste** → tekan **Send**
- **Output**: Bos & manajemen langsung dapat laporan lengkap.

---

## Case Khusus — PENGERINGAN GAGAL

### Skenario
Kamu sudah jemur 100 karung dengan total basah 400 kg, tapi karena hujan / mendung total / mesin rusak, hasil kering = 0 kg. Bahan basah masih ada di lapangan, **akan dipakai besok**.

### Yang HARUS DILAKUKAN

❌ **JANGAN input begini:**
```
Karung dijemur: 100
Bahan basah: 400 kg
Hasil kering: 0 kg
Block: 0
```
Kenapa? Sistem akan **menganggap bahan baku 400 kg sudah dipakai** → saldo stock berkurang 400 kg di sistem, padahal fisiknya masih ada di gudang.

✅ **YANG BENAR — Submit dengan field kosong + catatan jelas:**
```
Karung dijemur: 0  (atau kosongkan)
Bahan basah:    0
Hasil kering:   0
Block:          0
Catatan: "Pengeringan GAGAL hari ini — 100 karung / 400 kg basah masih di lapangan, akan dijemur besok"
```

Kemudian **besok**, saat operator besok input shift:
- Karung dijemur: jumlah karung yang dijemur ulang
- Bahan basah: 400 kg (dari kemarin) + tambahan baru kalau ada
- Hasil kering: hasil sukses
- Block: block jadi
- Catatan: "Termasuk 400 kg carry-over dari kemarin yang gagal jemur"

> **Kalau ragu**: telpon Bos sebelum submit. Lebih baik lapor lewat WA dulu, baru submit setelah dapat konfirmasi.

> **Catatan untuk Bos**: ini workaround sementara. Sistem akan dapat field "Outcome pengeringan" (Berhasil/Gagal/Parsial) di update berikutnya supaya operator tidak perlu workaround manual.

---

## Exception (Produksi) — Apa yang Dilakukan Kalau...

| Situasi | Yang Harus Dilakukan |
|---|---|
| Lupa shift mana yang dipilih | Klik kotak yang sesuai (Pagi atau Sore). Pastikan benar sebelum Simpan. |
| Submit pakai shift salah | Telpon Bos segera. **JANGAN coba submit ulang.** |
| Sudah klik Simpan tapi sadar angka salah | Telpon Bos. Bos akan koreksi di sheet. **JANGAN submit shift yang sama lagi** (akan jadi data ganda). |
| Listrik mati saat lagi input | Tulis catatan di kertas dulu. Saat listrik balik, refresh app, ulang input. **Cek Riwayat dulu untuk pastikan input sebelumnya tidak masuk.** |
| Internet lambat, tombol Submit tidak respon | Tunggu 10 detik. Kalau masih, refresh app. **Cek Riwayat — kalau data sudah masuk, jangan ulang.** Kalau belum, ulang. |
| Block reject / rusak setelah produksi | Catat di field Catatan: "5 block reject karena retak". Saat ini sistem belum punya field reject — workaround manual. |
| Lembur shift sampai dini hari (selesai jam 02:00) | Shift Sore selesai jam 24:00. Lembur dari jam 24:00 ke 02:00 dianggap **belum kebagian shift baru**. Tetap submit di hari yang sama dengan catatan: "Lembur sampai 02:00, hasil X termasuk lembur". |
| Pengeringan gagal (kering = 0) | Lihat **Case Khusus** di atas. Submit kosong, catat di Catatan. |
| Bahan basah hari ini termasuk carry-over kemarin yang gagal | Input total kg yang dijemur hari ini (gabungan kemarin + hari ini). Catat di Catatan: "Termasuk X kg dari kemarin yang gagal jemur." |

---

## Metrics — Apa yang Dipantau

| Metric | Target | Cara ukur |
|---|---|---|
| % shift tercatat | 100% (2/hari) | Bos cek tab Riwayat tiap pagi |
| Time-to-submit setelah shift | < 15 menit | Self-report operator |
| % shift dengan WA report | > 95% | Bos cek di grup WA |
| % shift dengan Catatan terisi | > 30% | Bos cek tab Riwayat |
| Susut rate | 30% — 60% | Auto by sistem |

---

## Aturan Umum (BACA INI!)

1. **Operator HANYA INPUT lewat aplikasi.** Tidak boleh edit data langsung di Google Sheets. Edit hanya boleh dilakukan oleh Tony / Bos.
2. **Selalu pilih EC type yang benar** sebelum mulai batch / shift. Salah pilih = data salah = stock kacau.
3. **Tutup batch / submit shift di hari yang sama** dengan kejadiannya. Jangan ditunda ke besok.
4. **Catatan opsional, tapi sangat membantu.** Kalau ada hal aneh, tulis 1 kalimat singkat. Bos akan baca.
5. **Kalau ragu, telpon Bos.** Lebih baik tunda 5 menit untuk konfirmasi daripada submit data salah yang harus diperbaiki nanti.
6. **Internet wajib stabil saat input.** Kalau internet lemah, tunggu sampai stabil. Sistem belum mendukung mode offline.
7. **Pakai aplikasi VSK SISTEM yang asli (`vsk-sistem.variantony1.workers.dev`)**, bukan yang ada tulisan "STAGING". STAGING itu sistem latihan, datanya tidak masuk ke laporan asli.

---

## Kalau Aplikasi Eror Total

1. Catat semua data di kertas / WA dulu (jangan kehilangan info)
2. Telpon Tony / Bos
3. Setelah aplikasi pulih, **biar Bos yang input ulang** (bukan operator) untuk memastikan tidak ada double-input

---

## Kontak Darurat

| Situasi | Hubungi |
|---|---|
| Sistem error / tidak bisa input | Tony — WA |
| Salah input data | Tony — WA (sebut tanggal, shift, error apa) |
| Pertanyaan SOP | Kepala produksi / kepala gudang |
| Aplikasi tidak buka | Cek internet dulu, lalu telpon Tony |

---

## Related Documents

- **PRD Modul Bahan Baku** — `docs/PRD-Bahan-Baku.md` (untuk Bos / dev — detail teknis)
- **PRD Modul Produksi** — `docs/PRD-Produksi.md` (untuk Bos / dev — detail teknis)
- **Negative Cases Brainstorm** — `docs/Negative-Cases-Brainstorm.md` (case-case yang kemungkinan akan terjadi)
- **Brand Guideline VSK** — di Drive (untuk format laporan eksternal)

---

**Tanda-tangan:**
- Operator: _____________________  Tanggal: ___________
- Kepala produksi/gudang: _____________________  Tanggal: ___________
- CEO/Direktur: _____________________  Tanggal: ___________
