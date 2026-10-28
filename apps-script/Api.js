// Web App API — deploy bằng `clasp deploy`, URL dạng https://script.google.com/macros/s/<id>/exec
//
// GET  ?table=listings                      → toàn bộ bảng
// GET  ?table=listings&grade=10&tier_score=95 → lọc bằng (so sánh chuỗi)
// GET  ?view=catalog                        → JOIN listings + cards + sets + sellers + price_references + pop_reports
// POST {action:'import', token, table, rows, replace}  → nạp dữ liệu hàng loạt (script export-normalized)
// POST {action:'insert', token, table, row}             → thêm 1 dòng vào bảng người dùng (WRITABLE_TABLES)
// POST {action:'delete', token, table, key}             → xóa 1 dòng theo khóa chính
//
// Apps Script Web App luôn trả HTTP 200; lỗi được báo trong JSON { ok: false, error }.

function doGet(e) {
  try {
    var p = e.parameter || {};
    if (p.view === 'catalog') return json_({ ok: true, rows: catalogView_() });
    if (!TABLES[p.table]) return json_({ ok: false, error: 'Bảng không tồn tại: ' + p.table });
    var rows = readTable_(p.table);
    var filters = Object.keys(p).filter(function (k) { return k !== 'table' && TABLES[p.table].indexOf(k) >= 0; });
    rows = rows.filter(function (r) {
      return filters.every(function (k) { return String(r[k]) === String(p[k]); });
    });
    return json_({ ok: true, count: rows.length, rows: rows });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== PropertiesService.getScriptProperties().getProperty('API_TOKEN')) {
      return json_({ ok: false, error: 'Sai token' });
    }
    if (!TABLES[body.table]) return json_({ ok: false, error: 'Bảng không tồn tại: ' + body.table });

    var lock = LockService.getScriptLock(); // tránh 2 request ghi cùng lúc (Sheets không có transaction)
    lock.waitLock(20000);
    try {
      if (body.action === 'import') return json_(importRows_(body.table, body.rows, body.replace));
      if (WRITABLE_TABLES.indexOf(body.table) < 0) return json_({ ok: false, error: 'Bảng chỉ đọc: ' + body.table });
      if (body.action === 'insert') return json_(insertRow_(body.table, body.row));
      if (body.action === 'delete') return json_(deleteRow_(body.table, body.key));
      return json_({ ok: false, error: 'action không hợp lệ' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(table) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(table);
  if (!sheet) throw new Error('Chưa có tab ' + table + ' — chạy setupSheets() trước');
  return sheet;
}

function readTable_(table) {
  var values = sheet_(table).getDataRange().getValues();
  var header = values.shift();
  return values
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) {
      var obj = {};
      header.forEach(function (h, i) { obj[h] = row[i] === '' ? null : row[i]; });
      return obj;
    });
}

function keyOf_(table, obj) {
  return pkOf(table).map(function (k) { return String(obj[k]); }).join('|');
}

function importRows_(table, rows, replace) {
  var sheet = sheet_(table);
  var cols = TABLES[table];
  if (replace && sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  if (!rows || !rows.length) return { ok: true, table: table, inserted: 0 };
  var values = rows.map(function (r) {
    return cols.map(function (c) { return r[c] == null ? '' : r[c]; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, cols.length).setValues(values);
  return { ok: true, table: table, inserted: values.length };
}

function insertRow_(table, row) {
  var cols = TABLES[table];
  if (cols.indexOf('created_at') >= 0 && !row.created_at) row.created_at = new Date().toISOString();
  var key = keyOf_(table, row);
  // Sheets không có ràng buộc PRIMARY KEY — phải tự kiểm tra trùng.
  var exists = readTable_(table).some(function (r) { return keyOf_(table, r) === key; });
  if (exists) return { ok: false, error: 'Trùng khóa chính: ' + key };
  sheet_(table).appendRow(cols.map(function (c) { return row[c] == null ? '' : row[c]; }));
  return { ok: true, table: table, key: key };
}

function deleteRow_(table, key) {
  var sheet = sheet_(table);
  var values = sheet.getDataRange().getValues();
  var header = values[0];
  for (var i = values.length - 1; i >= 1; i--) {
    var obj = {};
    header.forEach(function (h, j) { obj[h] = values[i][j]; });
    if (keyOf_(table, obj) === key) {
      sheet.deleteRow(i + 1);
      return { ok: true, deleted: key };
    }
  }
  return { ok: false, error: 'Không tìm thấy: ' + key };
}

// "VIEW" tự viết: Sheets không JOIN được nên ghép các bảng trong code.
function catalogView_() {
  var index = function (rows, keyFn) {
    var m = {};
    rows.forEach(function (r) { m[keyFn(r)] = r; });
    return m;
  };
  var cards = index(readTable_('cards'), function (r) { return r.card_id; });
  var sets = index(readTable_('sets'), function (r) { return r.set_id; });
  var sellers = index(readTable_('sellers'), function (r) { return r.seller_id; });
  var prices = index(readTable_('price_references'), function (r) { return r.card_id + '#' + Number(r.grade); });
  var pops = index(readTable_('pop_reports'), function (r) { return r.card_id; });

  return readTable_('listings').map(function (l) {
    var card = cards[l.card_id] || {};
    var price = prices[l.card_id + '#' + Number(l.grade)] || {};
    return {
      listing: l,
      card: card,
      set: sets[card.set_id] || {},
      seller: sellers[l.seller_id] || {},
      price: price,
      pop: pops[l.card_id] || {},
    };
  });
}
