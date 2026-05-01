/**
 * VSK — Google Apps Script Backend v7
 *
 * UPDATE dari v6:
 * - Schema Produksi tambah 2 kolom: "Block High EC" + "Block Low EC"
 *   (di-insert SETELAH kolom "Block (pcs)")
 * - Kolom "Block (pcs)" dipertahankan sebagai TOTAL (= High + Low untuk
 *   data baru; untuk data legacy v6 ke bawah, tetap berisi nilai asli)
 * - Backward-compat: kalau frontend lama kirim cuma `block` (tanpa
 *   blockHigh/blockLow), tetap diterima dan disimpan di kolom Block (pcs);
 *   kolom High/Low dikosongkan
 * - Endpoint `?action=riwayat` sekarang juga return blockHigh, blockLow
 *   per tanggal (sebelumnya cuma block)
 * - Tambah fungsi migrateProduksiToV7() untuk insert 2 kolom baru ke
 *   sheet existing tanpa kehilangan data
 *
 * INSTALL DI 2 SPREADSHEET (staging + production):
 *   1. Buka spreadsheet → Extensions → Apps Script
 *   2. Replace seluruh kode v6 dengan isi file ini
 *   3. Save (Ctrl+S)
 *   4. PENTING: Pilih function `migrateProduksiToV7` di dropdown,
 *      klik Run. Authorize kalau diminta. Lihat Logger (View → Logs)
 *      untuk konfirmasi sukses.
 *   5. Deploy → Manage Deployments → Edit → New Version → Deploy
 *
 * URUTAN MIGRASI YANG AMAN:
 *   - Lakukan dulu di STAGING spreadsheet, test lewat web app staging
 *   - Setelah confirm hasil benar, baru migrate PRODUCTION
 */

const SHEET_PRODUKSI       = 'Produksi';
const SHEET_RAW_KEDATANGAN = 'Rawmat_Kedatangan';
const SHEET_RAW_KARUNG     = 'Rawmat_Karung';
const SHEET_SUPPLIERS      = 'Suppliers';
const TZ = 'Asia/Jakarta';

const HEADERS_PRODUKSI = [
  'Timestamp Server', 'Tanggal', 'Shift', 'Operator',
  'Karung', 'Basah (kg)', 'Kering (kg)', 'Block (pcs)',
  'Block High EC', 'Block Low EC',
  'Susut (%)', 'Catatan', 'Input Time'
];

const HEADERS_RAW_KEDATANGAN = [
  'Timestamp Server', 'Batch ID', 'Tanggal', 'Supplier',
  'Surat Jalan', 'Total Karung', 'Total Berat (kg)',
  'Status', 'Operator', 'Catatan', 'Closed Time'
];

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

  // Produksi
  if (action === 'rekap')   return jsonOut(getRekapByDate(todayDate()));
  if (action === 'riwayat') return jsonOut(getRiwayat());
  if (action === 'debug')   return jsonOut(getDebugInfo());

  // Rawmat
  if (action === 'rawmat-stock')   return jsonOut(getRawmatStock());
  if (action === 'rawmat-batches') return jsonOut(getRawmatBatches());
  if (action === 'rawmat-batch')   return jsonOut(getRawmatBatch(e.parameter.id));
  if (action === 'rawmat-active')  return jsonOut(getRawmatActive());
  if (action === 'rawmat-debug')   return jsonOut(getRawmatDebug());

  return jsonOut({
    ok: true,
    service: 'VSK Backend v7',
    serverToday: todayDate(),
    time: new Date().toISOString(),
    modules: ['produksi', 'rawmat'],
    schemaVersion: 'v7'
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
// MIGRATION — JALANKAN MANUAL SEKALI per spreadsheet
// ═══════════════════════════════════════════════════════════

/**
 * Insert 2 kolom baru (Block High EC, Block Low EC) SETELAH
 * kolom "Block (pcs)". Data lama tidak berubah; kolom baru
 * akan kosong untuk row legacy.
 *
 * Jalankan via Apps Script editor:
 *   - Pilih `migrateProduksiToV7` di dropdown function
 *   - Klik tombol Run (▶)
 *   - Authorize kalau diminta
 *   - Lihat View → Logs untuk hasil
 *
 * Idempotent — aman dijalankan berulang kali (cek dulu apakah
 * kolom sudah ada sebelum insert).
 */
function migrateProduksiToV7() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUKSI);
  if (!sheet) {
    const msg = 'Sheet "Produksi" belum ada. Tidak ada migrasi diperlukan.';
    Logger.log(msg);
    return { ok: true, skipped: true, message: msg };
  }

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    Logger.log('Sheet kosong, skip migrasi.');
    return { ok: true, skipped: true };
  }

  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  // Sudah ter-migrate?
  if (headerRow.indexOf('Block High EC') !== -1 && headerRow.indexOf('Block Low EC') !== -1) {
    const msg = 'Sudah ter-migrate (Block High EC + Block Low EC sudah ada). Skip.';
    Logger.log(msg);
    return { ok: true, alreadyMigrated: true, message: msg };
  }

  // Cari posisi kolom "Block (pcs)"
  const blockIdx = headerRow.indexOf('Block (pcs)');
  if (blockIdx === -1) {
    const err = 'Kolom "Block (pcs)" tidak ditemukan di header. Cek dulu sheet manual.';
    Logger.log(err);
    return { ok: false, error: err, currentHeaders: headerRow };
  }

  // Insert 2 kolom SETELAH "Block (pcs)" (1-based: blockIdx + 1)
  const insertAfter = blockIdx + 1;
  sheet.insertColumnsAfter(insertAfter, 2);

  const highCol = insertAfter + 1;  // 1-based
  const lowCol  = insertAfter + 2;
  sheet.getRange(1, highCol).setValue('Block High EC');
  sheet.getRange(1, lowCol).setValue('Block Low EC');

  // Styling header (brand India Green)
  sheet.getRange(1, highCol, 1, 2)
    .setFontWeight('bold')
    .setBackground('#048419')
    .setFontColor('#ffffff');

  const dataRows = Math.max(0, sheet.getLastRow() - 1);
  const result = {
    ok: true,
    migrated: true,
    message: 'Migrasi v7 sukses. 2 kolom baru ditambahkan setelah "Block (pcs)".',
    insertedAfterColumn: insertAfter,
    newColumns: ['Block High EC (col ' + highCol + ')', 'Block Low EC (col ' + lowCol + ')'],
    legacyDataRows: dataRows
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

// ═══════════════════════════════════════════════════════════
// MODULE: PRODUKSI
// ═══════════════════════════════════════════════════════════

function produksiSaveShift(data) {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);

  // Backward-compat: kalau frontend kirim blockHigh/blockLow, pakai breakdown.
  // Kalau cuma `block` (legacy frontend), simpan sebagai total, breakdown kosong.
  const blockHigh = parseNum(data.blockHigh);
  const blockLow  = parseNum(data.blockLow);
  let blockTotal;
  let storeHigh, storeLow;

  if (blockHigh > 0 || blockLow > 0) {
    blockTotal = blockHigh + blockLow;
    storeHigh = blockHigh;
    storeLow  = blockLow;
  } else {
    blockTotal = parseNum(data.block);
    storeHigh = '';   // kosongin kalau legacy payload
    storeLow  = '';
  }

  const susut = data.basah > 0
    ? ((data.basah - data.kering) / data.basah * 100).toFixed(1)
    : '';
  const tanggal = todayDate();

  sheet.appendRow([
    new Date(), tanggal, data.shift, data.operator,
    data.karung, data.basah, data.kering, blockTotal,
    storeHigh, storeLow,
    susut, data.notes || '', data.time
  ]);

  return {
    ok: true,
    savedDate: tanggal,
    blockTotal: blockTotal,
    blockHigh: blockHigh,
    blockLow: blockLow
  };
}

function getRekapByDate(date) {
  const sheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const rows = sheet.getDataRange().getValues();
  const entries = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (formatDate(row[1]) !== date) continue;
    entries.push({
      shift: row[2], operator: row[3],
      karung: parseNum(row[4]), basah: parseNum(row[5]),
      kering: parseNum(row[6]), block: parseNum(row[7]),
      blockHigh: parseNum(row[8]), blockLow: parseNum(row[9]),
      susut: row[10] ? String(row[10]) : '',
      notes: row[11] || '', time: row[12] || ''
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
    const date = formatDate(row[1]);
    if (!date) continue;
    if (!byDate[date]) {
      byDate[date] = {
        date: date, karung: 0, basah: 0, kering: 0,
        block: 0, blockHigh: 0, blockLow: 0, shifts: []
      };
    }
    byDate[date].karung    += parseNum(row[4]);
    byDate[date].basah     += parseNum(row[5]);
    byDate[date].kering    += parseNum(row[6]);
    byDate[date].block     += parseNum(row[7]);
    byDate[date].blockHigh += parseNum(row[8]);
    byDate[date].blockLow  += parseNum(row[9]);
    if (!byDate[date].shifts.includes(row[2])) byDate[date].shifts.push(row[2]);
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
      rawDate: String(row[1]),
      formatted: formatDate(row[1]),
      shift: row[2],
      operator: row[3],
      block: row[7],
      blockHigh: row[8],
      blockLow: row[9]
    });
  }
  return {
    ok: true,
    schemaVersion: 'v7',
    serverToday: todayDate(),
    timezone: TZ,
    totalRows: rows.length - 1,
    sampleLast5: sample
  };
}

// ═══════════════════════════════════════════════════════════
// MODULE: RAWMAT — unchanged dari v6
// ═══════════════════════════════════════════════════════════

function rawmatStart(data) {
  const active = getRawmatActive();
  if (active.batch) {
    return { ok: false, error: 'Masih ada batch aktif: ' + active.batch.batchId, activeBatch: active.batch };
  }

  const headerSheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const tanggal = todayDate();
  const batchId = generateBatchId(headerSheet, tanggal);

  headerSheet.appendRow([
    new Date(), batchId, tanggal,
    data.supplier || '', data.suratJalan || '',
    0, 0, 'open', data.operator || '',
    data.notes || '', ''
  ]);

  return { ok: true, batchId: batchId, tanggal: tanggal };
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
    if (String(rows[i][1]) === String(data.batchId)) {
      sheet.getRange(i + 1, 8).setValue('closed');
      sheet.getRange(i + 1, 11).setValue(Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'));
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
    if (String(rows[i][1]) === String(data.batchId)) {
      sheet.getRange(i + 1, 8).setValue('cancelled');
      sheet.getRange(i + 1, 11).setValue(Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'));
      return { ok: true, batchId: data.batchId, status: 'cancelled' };
    }
  }
  return { ok: false, error: 'Batch not found' };
}

function getRawmatActive() {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][7] === 'open') {
      const batchId = rows[i][1];
      const karung = getKarungByBatch(batchId);
      return {
        ok: true,
        batch: {
          batchId: batchId,
          tanggal: formatDate(rows[i][2]),
          supplier: rows[i][3],
          suratJalan: rows[i][4],
          totalKarung: rows[i][5],
          totalBerat: rows[i][6],
          status: rows[i][7],
          operator: rows[i][8],
          notes: rows[i][9]
        },
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
  const validBatches = {};
  for (let i = 1; i < headers.length; i++) {
    const status = headers[i][7];
    if (status === 'open' || status === 'closed') {
      validBatches[String(headers[i][1])] = true;
    }
  }

  const krg = karungSheet.getDataRange().getValues();
  let totalInKg = 0, totalInKarung = 0;
  let lastIn = null;
  for (let i = 1; i < krg.length; i++) {
    const batchId = String(krg[i][1]);
    if (!validBatches[batchId]) continue;
    if (krg[i][4]) continue;
    totalInKg += parseNum(krg[i][3]);
    totalInKarung += 1;
    if (krg[i][0] && (!lastIn || krg[i][0] > lastIn)) lastIn = krg[i][0];
  }

  // Total keluar: SUM(Produksi.basah). Index 5 tetap (= Basah kg) karena
  // kolom baru ditambahkan SETELAH Block (pcs), tidak menggeser Basah.
  const prodSheet = getOrCreateSheet(SHEET_PRODUKSI, HEADERS_PRODUKSI);
  const prod = prodSheet.getDataRange().getValues();
  let totalOutKg = 0, totalOutKarung = 0;
  let lastOut = null;
  for (let i = 1; i < prod.length; i++) {
    totalOutKg += parseNum(prod[i][5]);
    totalOutKarung += parseNum(prod[i][4]);
    if (prod[i][0] && (!lastOut || prod[i][0] > lastOut)) lastOut = prod[i][0];
  }

  const events = [];
  for (let i = 1; i < headers.length; i++) {
    const status = headers[i][7];
    if (status !== 'open' && status !== 'closed') continue;
    if (parseNum(headers[i][6]) <= 0) continue;
    events.push({
      type: 'in',
      time: headers[i][0],
      tanggal: formatDate(headers[i][2]),
      label: 'Kedatangan ' + (headers[i][3] || 'tanpa supplier'),
      sub: headers[i][1] + ' · ' + headers[i][5] + ' karung',
      kg: parseNum(headers[i][6])
    });
  }
  for (let i = 1; i < prod.length; i++) {
    if (parseNum(prod[i][5]) <= 0) continue;
    events.push({
      type: 'out',
      time: prod[i][0],
      tanggal: formatDate(prod[i][1]),
      label: 'Produksi shift ' + prod[i][2],
      sub: prod[i][3] + ' · ' + prod[i][4] + ' karung',
      kg: parseNum(prod[i][5])
    });
  }
  events.sort((a, b) => (b.time > a.time ? 1 : -1));
  const recentEvents = events.slice(0, 10).map(e => ({
    type: e.type, tanggal: e.tanggal,
    label: e.label, sub: e.sub, kg: e.kg
  }));

  return {
    ok: true,
    saldoKg: +(totalInKg - totalOutKg).toFixed(2),
    totalInKg: +totalInKg.toFixed(2),
    totalOutKg: +totalOutKg.toFixed(2),
    totalInKarung: totalInKarung,
    totalOutKarung: totalOutKarung,
    lastIn: lastIn ? Utilities.formatDate(new Date(lastIn), TZ, 'yyyy-MM-dd HH:mm') : null,
    lastOut: lastOut ? Utilities.formatDate(new Date(lastOut), TZ, 'yyyy-MM-dd HH:mm') : null,
    events: recentEvents
  };
}

function getRawmatBatches() {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  const batches = [];
  for (let i = 1; i < rows.length; i++) {
    batches.push({
      batchId: rows[i][1],
      tanggal: formatDate(rows[i][2]),
      supplier: rows[i][3] || '',
      suratJalan: rows[i][4] || '',
      totalKarung: parseNum(rows[i][5]),
      totalBerat: parseNum(rows[i][6]),
      status: rows[i][7],
      operator: rows[i][8] || '',
      notes: rows[i][9] || ''
    });
  }
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
    serverToday: todayDate(),
    timezone: TZ,
    totalBatches: headerSheet.getLastRow() - 1,
    totalKarung: karungSheet.getLastRow() - 1,
    activeBatch: getRawmatActive().batch
  };
}

// ═══════════════════════════════════════════════════════════
// HELPERS — Rawmat (unchanged)
// ═══════════════════════════════════════════════════════════

function generateBatchId(sheet, tanggal) {
  const rows = sheet.getDataRange().getValues();
  const ymd = tanggal.replace(/-/g, '');
  let maxSeq = 0;
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][1] || '');
    const m = id.match(new RegExp('^B-' + ymd + '-(\\d+)$'));
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return 'B-' + ymd + '-' + String(maxSeq + 1).padStart(3, '0');
}

function findBatchHeader(batchId) {
  const sheet = getOrCreateSheet(SHEET_RAW_KEDATANGAN, HEADERS_RAW_KEDATANGAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(batchId)) {
      return {
        batchId: rows[i][1],
        tanggal: formatDate(rows[i][2]),
        supplier: rows[i][3] || '',
        suratJalan: rows[i][4] || '',
        totalKarung: parseNum(rows[i][5]),
        totalBerat: parseNum(rows[i][6]),
        status: rows[i][7],
        operator: rows[i][8] || '',
        notes: rows[i][9] || ''
      };
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
    if (String(rows[i][1]) === String(batchId)) {
      sheet.getRange(i + 1, 6).setValue(totalKrg);
      sheet.getRange(i + 1, 7).setValue(+totalKg.toFixed(2));
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
      .setBackground('#048419')   // VSK India Green
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatDate(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object') {
    return parseJsDateString(String(val));
  }
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
