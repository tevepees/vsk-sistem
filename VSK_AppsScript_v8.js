/**
 * VSK — Google Apps Script Backend v8
 *
 * UPDATE dari v7:
 * - SCHEMA EC SPLIT: semua field produksi sekarang punya breakdown per EC type
 *   (High EC / Low EC). Karung, Basah, Kering ditambah High/Low. Block sudah
 *   ada dari v7.
 * - SCHEMA RAWMAT: tambah kolom "EC Type" di tab Rawmat_Kedatangan, di-set
 *   per batch (1 truk = 1 jenis cocopeat).
 * - STOCK: getRawmatStock() return saldo per EC + total. Frontend tampil
 *   2 sub-card side-by-side.
 * - LEGACY DATA: semua row pra-v8 ditag sebagai LOW EC (sesuai konfirmasi
 *   Tony bahwa rawmat dan produksi sebelum migrasi adalah Low EC).
 *
 * INSTALL DI 2 SPREADSHEET (staging + production):
 *   1. Buka spreadsheet → Extensions → Apps Script
 *   2. Replace seluruh kode v7 dengan isi file ini
 *   3. Save (Ctrl+S)
 *   4. PENTING: Pilih function `migrateToV8` di dropdown, klik Run.
 *      Authorize kalau diminta. Lihat View → Logs untuk konfirmasi.
 *   5. Deploy → Manage Deployments → Edit → New Version → Deploy
 *
 * URUTAN MIGRASI YANG AMAN:
 *   - STAGING dulu — migrate, deploy frontend, test
 *   - Setelah confirm, baru migrasi PRODUCTION
 */

const SHEET_PRODUKSI       = 'Produksi';
const SHEET_RAW_KEDATANGAN = 'Rawmat_Kedatangan';
const SHEET_RAW_KARUNG     = 'Rawmat_Karung';
const SHEET_SUPPLIERS      = 'Suppliers';
const TZ = 'Asia/Jakarta';

const HEADERS_PRODUKSI = [
  'Timestamp Server', 'Tanggal', 'Shift', 'Operator',
  'Karung', 'Karung High EC', 'Karung Low EC',
  'Basah (kg)', 'Basah High EC (kg)', 'Basah Low EC (kg)',
  'Kering (kg)', 'Kering High EC (kg)', 'Kering Low EC (kg)',
  'Block (pcs)', 'Block High EC', 'Block Low EC',
  'Susut (%)', 'Catatan', 'Input Time',
  'Outcome', 'Carry-In High EC (kg)', 'Carry-In Low EC (kg)',
  'Block 1kg High EC', 'Block 1kg Low EC', 'Block 5kg High EC', 'Block 5kg Low EC'
];

// Indeks kolom 0-based untuk kemudahan referensi
const PROD_COL = {
  TS: 0, TANGGAL: 1, SHIFT: 2, OPERATOR: 3,
  KARUNG: 4, KARUNG_H: 5, KARUNG_L: 6,
  BASAH: 7, BASAH_H: 8, BASAH_L: 9,
  KERING: 10, KERING_H: 11, KERING_L: 12,
  BLOCK: 13, BLOCK_H: 14, BLOCK_L: 15,
  SUSUT: 16, NOTES: 17, TIME: 18,
  OUTCOME: 19, CARRYIN_H: 20, CARRYIN_L: 21,
  BLOCK_1KG_H: 22, BLOCK_1KG_L: 23, BLOCK_5KG_H: 24, BLOCK_5KG_L: 25
};

const HEADERS_RAW_KEDATANGAN = [
  'Timestamp Server', 'Batch ID', 'Tanggal', 'Supplier',
  'Surat Jalan', 'EC Type',
  'Total Karung', 'Total Berat (kg)',
  'Status', 'Operator', 'Catatan', 'Closed Time'
];

const KEDATANGAN_COL = {
  TS: 0, BATCH_ID: 1, TANGGAL: 2, SUPPLIER: 3,
  SURAT_JALAN: 4, EC_TYPE: 5,
  TOTAL_KARUNG: 6, TOTAL_BERAT: 7,
  STATUS: 8, OPERATOR: 9, NOTES: 10, CLOSED_TIME: 11
};

const HEADERS_RAW_KARUNG = [
  'Timestamp Server', 'Batch ID', 'Urut', 'Berat (kg)',
  'Flagged', 'Flag Reason', 'Operator', 'Time'
];

const HEADERS_SUPPLIERS = [
  'Timestamp Server', 'Nama', 'Kontak', 'Alamat', 'Harga/kg', 'Aktif', 'Catatan'
];

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04',
  May: '05', Jun: '06', Jul: '07', Aug: '08',
  Sep: '09', Oct: '10', Nov: '11', Dec: '12'
};

// ── Router GET ─────────────────────────────────────────────
function doGet(e) {
  const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'test';

  if (action === 'rekap')   return jsonOut(getRekapByDate(todayDate()));
  if (action === 'riwayat') return jsonOut(getRiwayat());
  if (action === 'debug')   return jsonOut(getDebugInfo());

  if (action === 'rawmat-stock')   return jsonOut(getRawmatStock());
  if (action === 'rawmat-batches') return jsonOut(getRawmatBatches());
  if (action === 'rawmat-batch')   return jsonOut(getRawmatBatch(e.parameter.id));
  if (action === 'rawmat-active')  return jsonOut(getRawmatActive());
  if (action === 'rawmat-debug')   return jsonOut(getRawmatDebug());

  return jsonOut({
    ok: true,
    service: 'VSK Backend v8',
    schemaVersion: 'v8',
    serverToday: todayDate(),
    time: new Date().toISOString(),
    modules: ['produksi', 'rawmat']
  });
}

// ── Router POST ────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type || 'produksi';

    if (type === 'rawmat-start')   return jsonOut(rawmatStart(data));
    if (type === 'rawmat-karung')  return jsonOut(rawmatAddKarung(data));
    if (type === 'rawmat-flag')    return jsonOut(rawmatFlagKarung(data));
    if (type === 'rawmat-close')   return jsonOut(rawmatCloseBatch(data));
    if (type === 'rawmat-cancel')  return jsonOut(rawmatCancelBatch(data));

    return jsonOut(produksiSaveShift(data));
  } catch (err) {
    return jsonOut({ ok: false, error: err.toString() });
  }
}

// ═══════════════════════════════════════════════════════════
// DIAGNOSTIC — jalankan untuk lihat status schema saat ini
// ═══════════════════════════════════════════════════════════

/**
 * Throw error berisi snapshot schema kedua sheet — output PASTI kelihatan
 * di execution log panel sebagai "Error: VSK SCHEMA: ..." karena Apps Script
 * selalu tampil error message dengan jelas.
 *
 * Cara pakai: pilih `cekStatus` di function dropdown → klik Run →
 * output akan muncul sebagai error (bukan masalah, ini cuma trick supaya pesannya kelihatan).
 */
function cekStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let report = '\n=== VSK SCHEMA STATUS ===\n';

  const prod = ss.getSheetByName(SHEET_PRODUKSI);
  if (prod) {
    const h = prod.getRange(1, 1, 1, prod.getLastColumn()).getValues()[0].map(String);
    report += '\n[Produksi headers]\n  ' + h.join(' | ') + '\n';
    report += '\n  Karung High EC : ' + (h.indexOf('Karung High EC')      !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Karung Low EC  : ' + (h.indexOf('Karung Low EC')       !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Basah High EC  : ' + (h.indexOf('Basah High EC (kg)')  !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Basah Low EC   : ' + (h.indexOf('Basah Low EC (kg)')   !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Kering High EC : ' + (h.indexOf('Kering High EC (kg)') !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Kering Low EC  : ' + (h.indexOf('Kering Low EC (kg)')  !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Block High EC  : ' + (h.indexOf('Block High EC')       !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Block Low EC   : ' + (h.indexOf('Block Low EC')        !== -1 ? 'ADA ✓' : 'BELUM ✗');
    report += '\n  Outcome        : ' + (h.indexOf('Outcome')             !== -1 ? 'ADA ✓' : 'BELUM ✗ — jalankan migrateCarryOver()');
    report += '\n  Carry-In High  : ' + (h.indexOf('Carry-In High EC (kg)') !== -1 ? 'ADA ✓' : 'BELUM ✗');
  } else {
    report += '\n[Produksi] sheet tidak ditemukan';
  }

  const raw = ss.getSheetByName(SHEET_RAW_KEDATANGAN);
  if (raw) {
    const h = raw.getRange(1, 1, 1, raw.getLastColumn()).getValues()[0].map(String);
    report += '\n\n[Rawmat_Kedatangan headers]\n  ' + h.join(' | ') + '\n';
    report += '\n  EC Type        : ' + (h.indexOf('EC Type') !== -1 ? 'ADA ✓' : 'BELUM ✗');
  } else {
    report += '\n\n[Rawmat_Kedatangan] sheet tidak ditemukan';
  }

  report += '\n\nScript version: v8';
  report += '\n=== END STATUS ===\n';

  // Throw supaya pesannya pasti tampil di execution log
  throw new Error(report);
}

// ═══════════════════════════════════════════════════════════
// MIGRATION v7/v6 → v8
// ═══════════════════════════════════════════════════════════

/**
 * Top-level migration: jalankan ini sekali per spreadsheet via Apps Script editor.
 * Akan migrate Produksi + Rawmat_Kedatangan ke schema v8.
 * Idempotent — aman dijalankan berulang.
 *
 * Output akan ditampilkan via THROW (intentional) supaya pesannya pasti
 * terlihat di execution log panel — bukan error sungguhan.
 */
function migrateToV8() {
  const result = {
    ok: true,
    schemaVersion: 'v8.2',
    produksi: migrateProduksiToV8(),
    rawmat: migrateRawmatToV8(),
    carryOver: migrateCarryOver(),
    blockVariants: migrateBlockVariants()
  };
  console.log('=== VSK MIGRATION v8.2 ===');
  console.log(JSON.stringify(result, null, 2));
  throw new Error('MIGRATION RESULT (bukan error sungguhan, ini cara supaya hasilnya kelihatan):\n\n' + JSON.stringify(result, null, 2));
}

/**
 * v8.2 — Tambah 4 kolom: Block 1kg High EC, Block 1kg Low EC,
 * Block 5kg High EC, Block 5kg Low EC. Append di akhir. Idempotent.
 * Backfill: data legacy → semua varian = 0. Kolom Block High/Low EC lama
 * tetap utuh sebagai legacy total (frontend handle backward-compat).
 */
function migrateBlockVariants() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUKSI);
  if (!sheet) return { skipped: true, reason: 'Sheet Produksi tidak ada' };

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  if (headers.indexOf('Block 1kg High EC') !== -1 && headers.indexOf('Block 5kg Low EC') !== -1) {
    return { alreadyMigrated: true, message: 'Block varian kolom sudah ada' };
  }

  const newCols = ['Block 1kg High EC', 'Block 1kg Low EC', 'Block 5kg High EC', 'Block 5kg Low EC'];
  const startCol = lastCol + 1;
  newCols.forEach(function(name, i){
    sheet.getRange(1, startCol + i).setValue(name);
  });
  sheet.getRange(1, startCol, 1, 4)
    .setFontWeight('bold').setBackground('#048419').setFontColor('#ffffff');

  // Backfill row legacy: semua varian = 0
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dataCount = lastRow - 1;
    const fillData = [];
    for (let i = 0; i < dataCount; i++) fillData.push([0, 0, 0, 0]);
    sheet.getRange(2, startCol, dataCount, 4).setValues(fillData);
  }

  return {
    migrated: true,
    rowsAffected: lastRow - 1,
    columnsAdded: newCols,
    message: 'Schema v8.2 — Block varian (1kg/5kg) siap pakai'
  };
}

function migrateProduksiToV8() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUKSI);
  if (!sheet) return { skipped: true, reason: 'Sheet "Produksi" tidak ada' };

  let lastCol = sheet.getLastColumn();
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  if (headers.indexOf('Karung High EC') !== -1) {
    return { alreadyMigrated: true, message: 'Karung High EC sudah ada — skip' };
  }

  // Helper: insert 2 kolom setelah kolom dengan nama tertentu
  function insertAfter(headerName, newHigh, newLow) {
    const idx = headers.indexOf(headerName);
    if (idx === -1) throw new Error('Kolom "' + headerName + '" tidak ditemukan');
    const insertPos = idx + 1; // 1-based
    sheet.insertColumnsAfter(insertPos, 2);
    sheet.getRange(1, insertPos + 1).setValue(newHigh);
    sheet.getRange(1, insertPos + 2).setValue(newLow);
    sheet.getRange(1, insertPos + 1, 1, 2)
      .setFontWeight('bold').setBackground('#048419').setFontColor('#ffffff');
    // Re-fetch headers karena urutan berubah
    lastCol = sheet.getLastColumn();
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  }

  insertAfter('Karung',      'Karung High EC',     'Karung Low EC');
  insertAfter('Basah (kg)',  'Basah High EC (kg)', 'Basah Low EC (kg)');
  insertAfter('Kering (kg)', 'Kering High EC (kg)','Kering Low EC (kg)');

  // Backfill: untuk row legacy, copy total ke Low EC (Tony konfirmasi: legacy = Low)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dataCount = lastRow - 1;
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const colOf = (name) => headers.indexOf(name) + 1; // 1-based

    // Bulk copy: Karung → Karung Low EC
    sheet.getRange(2, colOf('Karung Low EC'), dataCount, 1)
      .setValues(sheet.getRange(2, colOf('Karung'), dataCount, 1).getValues());

    // Basah → Basah Low EC
    sheet.getRange(2, colOf('Basah Low EC (kg)'), dataCount, 1)
      .setValues(sheet.getRange(2, colOf('Basah (kg)'), dataCount, 1).getValues());

    // Kering → Kering Low EC
    sheet.getRange(2, colOf('Kering Low EC (kg)'), dataCount, 1)
      .setValues(sheet.getRange(2, colOf('Kering (kg)'), dataCount, 1).getValues());

    // Block: kalau Block High + Low === 0 (data v6 atau v7 tanpa breakdown), copy Block → Block Low EC
    const blockVals     = sheet.getRange(2, colOf('Block (pcs)'),    dataCount, 1).getValues();
    const blockHighVals = sheet.getRange(2, colOf('Block High EC'),  dataCount, 1).getValues();
    const blockLowVals  = sheet.getRange(2, colOf('Block Low EC'),   dataCount, 1).getValues();
    const newBlockLow = [];
    for (let i = 0; i < dataCount; i++) {
      const high = parseNum(blockHighVals[i][0]);
      const low  = parseNum(blockLowVals[i][0]);
      const tot  = parseNum(blockVals[i][0]);
      if (high + low === 0 && tot > 0) {
        newBlockLow.push([tot]);
      } else {
        newBlockLow.push([blockLowVals[i][0]]);
      }
    }
    sheet.getRange(2, colOf('Block Low EC'), dataCount, 1).setValues(newBlockLow);
  }

  return {
    migrated: true,
    rowsAffected: lastRow - 1,
    message: 'Schema v8 + backfill semua legacy data sebagai Low EC'
  };
}

function migrateRawmatToV8() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RAW_KEDATANGAN);
  if (!sheet) return { skipped: true, reason: 'Sheet "Rawmat_Kedatangan" tidak ada' };

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  if (headers.indexOf('EC Type') !== -1) {
    return { alreadyMigrated: true, message: 'EC Type sudah ada — skip' };
  }

  const sjIdx = headers.indexOf('Surat Jalan');
  if (sjIdx === -1) return { ok: false, error: 'Kolom Surat Jalan tidak ditemukan' };

  const insertPos = sjIdx + 1; // 1-based
  sheet.insertColumnsAfter(insertPos, 1);
  sheet.getRange(1, insertPos + 1).setValue('EC Type');
  sheet.getRange(1, insertPos + 1)
    .setFontWeight('bold').setBackground('#048419').setFontColor('#ffffff');

  // Backfill: semua existing batch tag sebagai 'low'
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dataCount = lastRow - 1;
    const fillVals = [];
    for (let i = 0; i < dataCount; i++) fillVals.push(['low']);
    sheet.getRange(2, insertPos + 1, dataCount, 1).setValues(fillVals);
  }

  return {
    migrated: true,
    rowsAffected: lastRow - 1,
    defaultEC: 'low',
    message: 'EC Type column ditambahkan, semua batch existing tag sebagai Low EC'
  };
}

// ═══════════════════════════════════════════════════════════
// MIGRATION — Carry-Over (NC-G)
// Jalankan 1x di Apps Script editor setelah deploy kode ini.
// Idempotent — aman dijalankan ulang.
// ═══════════════════════════════════════════════════════════

function migrateCarryOver() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PRODUKSI);
  if (!sheet) throw new Error('Sheet "Produksi" tidak ditemukan');

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  if (headers.indexOf('Outcome') !== -1) {
    throw new Error('SKIP — Kolom Outcome sudah ada, tidak perlu migrasi ulang.');
  }

  sheet.getRange(1, lastCol + 1).setValue('Outcome');
  sheet.getRange(1, lastCol + 2).setValue('Carry-In High EC (kg)');
  sheet.getRange(1, lastCol + 3).setValue('Carry-In Low EC (kg)');
  sheet.getRange(1, lastCol + 1, 1, 3)
    .setFontWeight('bold').setBackground('#048419').setFontColor('#ffffff');

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const dataCount = lastRow - 1;
    const fill = [];
    for (let i = 0; i < dataCount; i++) fill.push(['berhasil', 0, 0]);
    sheet.getRange(2, lastCol + 1, dataCount, 3).setValues(fill);
  }

  throw new Error(
    'MIGRASI SELESAI (bukan error sungguhan):\n' +
    '  Kolom Outcome, Carry-In High EC, Carry-In Low EC ditambahkan.\n' +
    '  Rows backfill: ' + (lastRow - 1) + ' (semua outcome="berhasil", carryIn=0)\n' +
    '  Schema sekarang: 22 kolom.'
  );
}

// ═══════════════════════════════════════════════════════════
// MODULE: PRODUKSI v8
// ═══════════════════════════════════════════════════════════

function produksiSaveShift(data) {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);

  // Helper: ekstrak breakdown atau fallback ke total
  // Backward-compat: kalau frontend lama kirim cuma `karung`, treat as Low EC
  function splitField(highKey, lowKey, totalKey) {
    const h = parseNum(data[highKey]);
    const l = parseNum(data[lowKey]);
    if (h + l > 0) {
      return { high: h, low: l, total: h + l };
    }
    const t = parseNum(data[totalKey]);
    return { high: 0, low: t, total: t };
  }

  const krg = splitField('karungHigh', 'karungLow', 'karung');
  const bas = splitField('basahHigh',  'basahLow',  'basah');
  const ker = splitField('keringHigh', 'keringLow', 'kering');

  // v8.2 — Block per varian (1kg, 5kg) × per EC (high, low)
  const block1kgH = parseNum(data.block1kgHigh);
  const block1kgL = parseNum(data.block1kgLow);
  const block5kgH = parseNum(data.block5kgHigh);
  const block5kgL = parseNum(data.block5kgLow);
  const variantTotal = block1kgH + block1kgL + block5kgH + block5kgL;

  // Backward-compat: kalau frontend lama kirim blockHigh/blockLow tanpa varian,
  // tetap accept. Total Block = sum 4 varian. Per EC = sum varian dalam EC tsb.
  let blk;
  if (variantTotal > 0) {
    blk = {
      high:  block1kgH + block5kgH,
      low:   block1kgL + block5kgL,
      total: variantTotal
    };
  } else {
    blk = splitField('blockHigh', 'blockLow', 'block');
  }

  const validOutcomes = ['berhasil', 'parsial', 'gagal'];
  const outcome = validOutcomes.indexOf(String(data.outcome || '').toLowerCase()) !== -1
    ? String(data.outcome).toLowerCase() : 'berhasil';
  const carryInH = parseNum(data.carryInHigh);
  const carryInL = parseNum(data.carryInLow);

  // Susut formula — basis = TOTAL BASAH YANG DIJEMUR hari ini
  // = basah baru (dari rawmat hari ini) + carry-over (dari hari/shift sebelumnya)
  // Tanpa carry-in di basis, susut bisa keluar negatif (sampai >1000%)
  // saat carry-over besar tapi basah baru kecil.
  const totalBasahDijemur = bas.total + carryInH + carryInL;
  const susut = totalBasahDijemur > 0
    ? ((totalBasahDijemur - ker.total) / totalBasahDijemur * 100).toFixed(1)
    : '';
  const tanggal = todayDate();

  sheet.appendRow([
    new Date(), tanggal, data.shift, data.operator,
    krg.total, krg.high, krg.low,
    bas.total, bas.high, bas.low,
    ker.total, ker.high, ker.low,
    blk.total, blk.high, blk.low,
    susut, data.notes || '', data.time,
    outcome, carryInH, carryInL,
    block1kgH, block1kgL, block5kgH, block5kgL
  ]);

  return {
    ok: true,
    savedDate: tanggal,
    outcome: outcome,
    carryInHigh: carryInH, carryInLow: carryInL,
    karungTotal: krg.total, karungHigh: krg.high, karungLow: krg.low,
    basahTotal:  bas.total, basahHigh:  bas.high, basahLow:  bas.low,
    keringTotal: ker.total, keringHigh: ker.high, keringLow: ker.low,
    blockTotal:  blk.total, blockHigh:  blk.high, blockLow:  blk.low,
    block1kgHigh: block1kgH, block1kgLow: block1kgL,
    block5kgHigh: block5kgH, block5kgLow: block5kgL
  };
}

function getRekapByDate(date) {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const rows = sheet.getDataRange().getValues();
  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (formatDate(row[PROD_COL.TANGGAL]) !== date) continue;
    entries.push({
      shift: row[PROD_COL.SHIFT], operator: row[PROD_COL.OPERATOR],
      karung:     parseNum(row[PROD_COL.KARUNG]),
      karungHigh: parseNum(row[PROD_COL.KARUNG_H]),
      karungLow:  parseNum(row[PROD_COL.KARUNG_L]),
      basah:     parseNum(row[PROD_COL.BASAH]),
      basahHigh: parseNum(row[PROD_COL.BASAH_H]),
      basahLow:  parseNum(row[PROD_COL.BASAH_L]),
      kering:     parseNum(row[PROD_COL.KERING]),
      keringHigh: parseNum(row[PROD_COL.KERING_H]),
      keringLow:  parseNum(row[PROD_COL.KERING_L]),
      block:     parseNum(row[PROD_COL.BLOCK]),
      blockHigh: parseNum(row[PROD_COL.BLOCK_H]),
      blockLow:  parseNum(row[PROD_COL.BLOCK_L]),
      block1kgHigh: parseNum(row[PROD_COL.BLOCK_1KG_H]),
      block1kgLow:  parseNum(row[PROD_COL.BLOCK_1KG_L]),
      block5kgHigh: parseNum(row[PROD_COL.BLOCK_5KG_H]),
      block5kgLow:  parseNum(row[PROD_COL.BLOCK_5KG_L]),
      susut: row[PROD_COL.SUSUT] ? String(row[PROD_COL.SUSUT]) : '',
      notes: row[PROD_COL.NOTES] || '',
      time:  row[PROD_COL.TIME]  || '',
      outcome:     String(row[PROD_COL.OUTCOME] || 'berhasil').toLowerCase(),
      carryInHigh: parseNum(row[PROD_COL.CARRYIN_H]),
      carryInLow:  parseNum(row[PROD_COL.CARRYIN_L])
    });
  }
  return { ok: true, date: date, entries: entries };
}

function getRiwayat() {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const rows = sheet.getDataRange().getValues();
  const byDate = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = formatDate(row[PROD_COL.TANGGAL]);
    if (!date) continue;
    if (!byDate[date]) {
      byDate[date] = {
        date: date,
        karung: 0, karungHigh: 0, karungLow: 0,
        basah: 0,  basahHigh: 0,  basahLow: 0,
        kering: 0, keringHigh: 0, keringLow: 0,
        block: 0,  blockHigh: 0,  blockLow: 0,
        block1kgHigh: 0, block1kgLow: 0, block5kgHigh: 0, block5kgLow: 0,
        carryInHigh: 0, carryInLow: 0,
        outcomes: [],
        shifts: []
      };
    }
    const b = byDate[date];
    b.karung     += parseNum(row[PROD_COL.KARUNG]);
    b.karungHigh += parseNum(row[PROD_COL.KARUNG_H]);
    b.karungLow  += parseNum(row[PROD_COL.KARUNG_L]);
    b.basah      += parseNum(row[PROD_COL.BASAH]);
    b.basahHigh  += parseNum(row[PROD_COL.BASAH_H]);
    b.basahLow   += parseNum(row[PROD_COL.BASAH_L]);
    b.kering     += parseNum(row[PROD_COL.KERING]);
    b.keringHigh += parseNum(row[PROD_COL.KERING_H]);
    b.keringLow  += parseNum(row[PROD_COL.KERING_L]);
    b.block      += parseNum(row[PROD_COL.BLOCK]);
    b.blockHigh  += parseNum(row[PROD_COL.BLOCK_H]);
    b.blockLow   += parseNum(row[PROD_COL.BLOCK_L]);
    b.carryInHigh += parseNum(row[PROD_COL.CARRYIN_H]);
    b.carryInLow  += parseNum(row[PROD_COL.CARRYIN_L]);
    b.block1kgHigh += parseNum(row[PROD_COL.BLOCK_1KG_H]);
    b.block1kgLow  += parseNum(row[PROD_COL.BLOCK_1KG_L]);
    b.block5kgHigh += parseNum(row[PROD_COL.BLOCK_5KG_H]);
    b.block5kgLow  += parseNum(row[PROD_COL.BLOCK_5KG_L]);
    const rowOutcome = row[PROD_COL.OUTCOME] || 'berhasil';
    if (b.outcomes.indexOf(rowOutcome) === -1) b.outcomes.push(rowOutcome);
    if (b.shifts.indexOf(row[PROD_COL.SHIFT]) === -1) b.shifts.push(row[PROD_COL.SHIFT]);
  }
  return {
    ok: true,
    rows: Object.values(byDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  };
}

function getDebugInfo() {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const rows = sheet.getDataRange().getValues();
  const sample = [];
  const start = Math.max(1, rows.length - 5);
  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    sample.push({
      rowNumber: i + 1,
      tanggal: formatDate(row[PROD_COL.TANGGAL]),
      shift: row[PROD_COL.SHIFT],
      operator: row[PROD_COL.OPERATOR],
      karung: { total: row[PROD_COL.KARUNG], high: row[PROD_COL.KARUNG_H], low: row[PROD_COL.KARUNG_L] },
      basah:  { total: row[PROD_COL.BASAH],  high: row[PROD_COL.BASAH_H],  low: row[PROD_COL.BASAH_L] },
      kering: { total: row[PROD_COL.KERING], high: row[PROD_COL.KERING_H], low: row[PROD_COL.KERING_L] },
      block:  { total: row[PROD_COL.BLOCK],  high: row[PROD_COL.BLOCK_H],  low: row[PROD_COL.BLOCK_L] },
      outcome:    row[PROD_COL.OUTCOME]   || 'berhasil',
      carryIn:    { high: row[PROD_COL.CARRYIN_H], low: row[PROD_COL.CARRYIN_L] }
    });
  }
  return {
    ok: true, schemaVersion: 'v8',
    serverToday: todayDate(), timezone: TZ,
    totalRows: rows.length - 1,
    sampleLast5: sample
  };
}

// ═══════════════════════════════════════════════════════════
// MODULE: RAWMAT v8
// ═══════════════════════════════════════════════════════════

function rawmatStart(data) {
  const active = getRawmatActive();
  if (active.batch) {
    return { ok: false, error: 'Masih ada batch aktif: ' + active.batch.batchId, activeBatch: active.batch };
  }

  // Validasi EC type
  const ecType = String(data.ecType || '').toLowerCase();
  if (ecType !== 'high' && ecType !== 'low') {
    return { ok: false, error: 'EC Type harus "high" atau "low" — diberikan: ' + data.ecType };
  }

  const headerSheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const tanggal = todayDate();
  const batchId = generateBatchId(headerSheet, tanggal);

  headerSheet.appendRow([
    new Date(), batchId, tanggal,
    data.supplier || '', data.suratJalan || '', ecType,
    0, 0, 'open', data.operator || '',
    data.notes || '', ''
  ]);

  return { ok: true, batchId: batchId, tanggal: tanggal, ecType: ecType };
}

function rawmatAddKarung(data) {
  if (!data.batchId) return { ok: false, error: 'batchId required' };
  if (!data.berat || data.berat <= 0) return { ok: false, error: 'berat invalid' };

  const batch = findBatchHeader(data.batchId);
  if (!batch) return { ok: false, error: 'Batch not found: ' + data.batchId };
  if (batch.status !== 'open') return { ok: false, error: 'Batch sudah ' + batch.status };

  const karungSheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  const urut = countKarungInBatch(data.batchId) + 1;
  const time = Utilities.formatDate(new Date(), TZ, 'HH:mm:ss');

  karungSheet.appendRow([
    new Date(), data.batchId, urut,
    parseNum(data.berat), false, '',
    data.operator || batch.operator, time
  ]);

  updateBatchTotals(data.batchId);

  return { ok: true, urut: urut, batchId: data.batchId };
}

function rawmatFlagKarung(data) {
  if (!data.batchId || !data.urut) return { ok: false, error: 'batchId & urut required' };

  const karungSheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  const rows = karungSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(data.batchId) && Number(rows[i][2]) === Number(data.urut)) {
      const newFlag = !rows[i][4];
      karungSheet.getRange(i + 1, 5).setValue(newFlag);
      karungSheet.getRange(i + 1, 6).setValue(newFlag ? (data.reason || 'flagged') : '');
      updateBatchTotals(data.batchId);
      return { ok: true, batchId: data.batchId, urut: data.urut, flagged: newFlag };
    }
  }
  return { ok: false, error: 'Karung not found' };
}

function rawmatCloseBatch(data) {
  if (!data.batchId) return { ok: false, error: 'batchId required' };

  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][KEDATANGAN_COL.BATCH_ID]) === String(data.batchId)) {
      sheet.getRange(i + 1, KEDATANGAN_COL.STATUS + 1).setValue('closed');
      sheet.getRange(i + 1, KEDATANGAN_COL.CLOSED_TIME + 1)
        .setValue(Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'));
      updateBatchTotals(data.batchId);
      return { ok: true, batchId: data.batchId, status: 'closed' };
    }
  }
  return { ok: false, error: 'Batch not found' };
}

function rawmatCancelBatch(data) {
  if (!data.batchId) return { ok: false, error: 'batchId required' };

  const totalKarung = countKarungInBatch(data.batchId);
  if (totalKarung > 0) {
    return { ok: false, error: 'Tidak bisa cancel batch yang sudah ada karung. Tutup batch saja.' };
  }

  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][KEDATANGAN_COL.BATCH_ID]) === String(data.batchId)) {
      sheet.getRange(i + 1, KEDATANGAN_COL.STATUS + 1).setValue('cancelled');
      sheet.getRange(i + 1, KEDATANGAN_COL.CLOSED_TIME + 1)
        .setValue(Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'));
      return { ok: true, batchId: data.batchId, status: 'cancelled' };
    }
  }
  return { ok: false, error: 'Batch not found' };
}

function getRawmatActive() {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][KEDATANGAN_COL.STATUS] === 'open') {
      const batchId = rows[i][KEDATANGAN_COL.BATCH_ID];
      const karung = getKarungByBatch(batchId);
      return {
        ok: true,
        batch: rowToBatch(rows[i]),
        karung: karung
      };
    }
  }
  return { ok: true, batch: null, karung: [] };
}

function getRawmatStock() {
  const karungSheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  const headerSheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);

  const headers = headerSheet.getDataRange().getValues();

  // Map: batchId → { ec: 'high'|'low', valid: bool }
  const batchInfo = {};
  for (let i = 1; i < headers.length; i++) {
    const status = headers[i][KEDATANGAN_COL.STATUS];
    if (status !== 'open' && status !== 'closed') continue;
    const ec = String(headers[i][KEDATANGAN_COL.EC_TYPE] || 'low').toLowerCase();
    batchInfo[String(headers[i][KEDATANGAN_COL.BATCH_ID])] = ec === 'high' ? 'high' : 'low';
  }

  // ── INFLOW: split by EC ──
  const krg = karungSheet.getDataRange().getValues();
  let inHighKg = 0, inLowKg = 0, inHighKarung = 0, inLowKarung = 0;
  let lastIn = null;
  for (let i = 1; i < krg.length; i++) {
    const batchId = String(krg[i][1]);
    const ec = batchInfo[batchId];
    if (!ec) continue;
    if (krg[i][4]) continue; // flagged
    const kg = parseNum(krg[i][3]);
    if (ec === 'high') {
      inHighKg += kg; inHighKarung += 1;
    } else {
      inLowKg += kg;  inLowKarung += 1;
    }
    if (krg[i][0] && (!lastIn || krg[i][0] > lastIn)) lastIn = krg[i][0];
  }

  // ── OUTFLOW: split by EC dari Produksi ──
  const prodSheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const prod = prodSheet.getDataRange().getValues();
  let outHighKg = 0, outLowKg = 0, outHighKarung = 0, outLowKarung = 0;
  let lastOut = null;
  for (let i = 1; i < prod.length; i++) {
    const carryH = parseNum(prod[i][PROD_COL.CARRYIN_H]);
    const carryL = parseNum(prod[i][PROD_COL.CARRYIN_L]);
    outHighKg     += Math.max(0, parseNum(prod[i][PROD_COL.BASAH_H]) - carryH);
    outLowKg      += Math.max(0, parseNum(prod[i][PROD_COL.BASAH_L]) - carryL);
    outHighKarung += parseNum(prod[i][PROD_COL.KARUNG_H]);
    outLowKarung  += parseNum(prod[i][PROD_COL.KARUNG_L]);
    if (prod[i][PROD_COL.TS] && (!lastOut || prod[i][PROD_COL.TS] > lastOut)) {
      lastOut = prod[i][PROD_COL.TS];
    }
  }

  // ── EVENTS: 10 last (in + out merged), include EC ──
  const events = [];
  for (let i = 1; i < headers.length; i++) {
    const status = headers[i][KEDATANGAN_COL.STATUS];
    if (status !== 'open' && status !== 'closed') continue;
    if (parseNum(headers[i][KEDATANGAN_COL.TOTAL_BERAT]) <= 0) continue;
    const ec = String(headers[i][KEDATANGAN_COL.EC_TYPE] || 'low').toLowerCase();
    events.push({
      type: 'in',
      ec: ec,
      time: headers[i][KEDATANGAN_COL.TS],
      tanggal: formatDate(headers[i][KEDATANGAN_COL.TANGGAL]),
      label: 'Kedatangan ' + (headers[i][KEDATANGAN_COL.SUPPLIER] || 'tanpa supplier'),
      sub: headers[i][KEDATANGAN_COL.BATCH_ID] + ' · ' + headers[i][KEDATANGAN_COL.TOTAL_KARUNG] + ' karung · ' + ec.toUpperCase() + ' EC',
      kg: parseNum(headers[i][KEDATANGAN_COL.TOTAL_BERAT])
    });
  }
  for (let i = 1; i < prod.length; i++) {
    const bh = parseNum(prod[i][PROD_COL.BASAH_H]);
    const bl = parseNum(prod[i][PROD_COL.BASAH_L]);
    const total = bh + bl;
    if (total <= 0) continue;
    const ecLabel = (bh > 0 && bl > 0) ? 'mixed' : (bh > 0 ? 'high' : 'low');
    events.push({
      type: 'out',
      ec: ecLabel,
      time: prod[i][PROD_COL.TS],
      tanggal: formatDate(prod[i][PROD_COL.TANGGAL]),
      label: 'Produksi shift ' + prod[i][PROD_COL.SHIFT],
      sub: prod[i][PROD_COL.OPERATOR] + ' · H:' + bh + 'kg / L:' + bl + 'kg',
      kg: total
    });
  }
  events.sort((a, b) => (b.time > a.time ? 1 : -1));
  const recentEvents = events.slice(0, 10).map(e => ({
    type: e.type, ec: e.ec, tanggal: e.tanggal,
    label: e.label, sub: e.sub, kg: e.kg
  }));

  return {
    ok: true,
    // Per EC
    saldoHighKg: +(inHighKg - outHighKg).toFixed(2),
    saldoLowKg:  +(inLowKg  - outLowKg).toFixed(2),
    inHighKg: +inHighKg.toFixed(2),
    inLowKg:  +inLowKg.toFixed(2),
    outHighKg: +outHighKg.toFixed(2),
    outLowKg:  +outLowKg.toFixed(2),
    inHighKarung: inHighKarung,
    inLowKarung:  inLowKarung,
    outHighKarung: outHighKarung,
    outLowKarung:  outLowKarung,
    // Total (untuk hero card)
    saldoKg: +(inHighKg + inLowKg - outHighKg - outLowKg).toFixed(2),
    totalInKg: +(inHighKg + inLowKg).toFixed(2),
    totalOutKg: +(outHighKg + outLowKg).toFixed(2),
    totalInKarung: inHighKarung + inLowKarung,
    totalOutKarung: outHighKarung + outLowKarung,
    lastIn: lastIn ? Utilities.formatDate(new Date(lastIn), TZ, 'yyyy-MM-dd HH:mm') : null,
    lastOut: lastOut ? Utilities.formatDate(new Date(lastOut), TZ, 'yyyy-MM-dd HH:mm') : null,
    events: recentEvents
  };
}

function getRawmatBatches() {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  const batches = [];
  for (let i = 1; i < rows.length; i++) batches.push(rowToBatch(rows[i]));
  batches.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return b.batchId.localeCompare(a.batchId);
  });
  return { ok: true, batches: batches.slice(0, 50) };
}

function getRawmatBatch(batchId) {
  if (!batchId) return { ok: false, error: 'id required' };
  const batch = findBatchHeader(batchId);
  if (!batch) return { ok: false, error: 'Batch not found' };
  return { ok: true, batch: batch, karung: getKarungByBatch(batchId) };
}

function getRawmatDebug() {
  const headerSheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const karungSheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  return {
    ok: true,
    schemaVersion: 'v8',
    serverToday: todayDate(),
    timezone: TZ,
    totalBatches: headerSheet.getLastRow() - 1,
    totalKarung: karungSheet.getLastRow() - 1,
    activeBatch: getRawmatActive().batch
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS — Rawmat
// ═══════════════════════════════════════════════════════════

function rowToBatch(row) {
  return {
    batchId:    row[KEDATANGAN_COL.BATCH_ID],
    tanggal:    formatDate(row[KEDATANGAN_COL.TANGGAL]),
    supplier:   row[KEDATANGAN_COL.SUPPLIER]    || '',
    suratJalan: row[KEDATANGAN_COL.SURAT_JALAN] || '',
    ecType:     String(row[KEDATANGAN_COL.EC_TYPE] || 'low').toLowerCase(),
    totalKarung: parseNum(row[KEDATANGAN_COL.TOTAL_KARUNG]),
    totalBerat:  parseNum(row[KEDATANGAN_COL.TOTAL_BERAT]),
    status:     row[KEDATANGAN_COL.STATUS],
    operator:   row[KEDATANGAN_COL.OPERATOR] || '',
    notes:      row[KEDATANGAN_COL.NOTES]    || ''
  };
}

function generateBatchId(sheet, tanggal) {
  const rows = sheet.getDataRange().getValues();
  const ymd = tanggal.replace(/-/g, '');
  let maxSeq = 0;
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][KEDATANGAN_COL.BATCH_ID] || '');
    const m = id.match(new RegExp('^B-' + ymd + '-(\\d+)$'));
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return 'B-' + ymd + '-' + String(maxSeq + 1).padStart(3, '0');
}

function findBatchHeader(batchId) {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][KEDATANGAN_COL.BATCH_ID]) === String(batchId)) {
      return rowToBatch(rows[i]);
    }
  }
  return null;
}

function getKarungByBatch(batchId) {
  const sheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) !== String(batchId)) continue;
    list.push({
      urut: parseNum(rows[i][2]),
      berat: parseNum(rows[i][3]),
      flagged: !!rows[i][4],
      flagReason: rows[i][5] || '',
      operator: rows[i][6] || '',
      time: rows[i][7] || ''
    });
  }
  list.sort((a, b) => a.urut - b.urut);
  return list;
}

function countKarungInBatch(batchId) {
  const sheet = getOrCreateSheet(SHEET_RAW_KARUNG, HEADERS_RAW_KARUNG);
  const rows = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(batchId)) count++;
  }
  return count;
}

function updateBatchTotals(batchId) {
  const list = getKarungByBatch(batchId);
  let totalKg = 0, totalKrg = 0;
  list.forEach(k => {
    if (k.flagged) return;
    totalKg += k.berat;
    totalKrg += 1;
  });

  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][KEDATANGAN_COL.BATCH_ID]) === String(batchId)) {
      sheet.getRange(i + 1, KEDATANGAN_COL.TOTAL_KARUNG + 1).setValue(totalKrg);
      sheet.getRange(i + 1, KEDATANGAN_COL.TOTAL_BERAT + 1).setValue(+totalKg.toFixed(2));
      return;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS — Generic
// ═══════════════════════════════════════════════════════════

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#048419')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatDate(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object') return parseJsDateString(String(val));
  const s = String(val);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  return parseJsDateString(s);
}

function parseJsDateString(s) {
  const m = s.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/);
  if (!m) return '';
  const mm = MONTHS[m[1]];
  const dd = String(m[2]).padStart(2, '0');
  return m[3] + '-' + mm + '-' + dd;
}

function parseNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function todayDate() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
