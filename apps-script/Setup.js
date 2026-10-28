// Chạy 1 lần từ Apps Script editor (hoặc `clasp run setupSheets`):
// tạo đủ các tab + header, sinh API token, tạo tab báo cáo QUERY().
function setupSheets() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(TABLES).forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = TABLES[name];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
  });
  var blank = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) props.setProperty('API_TOKEN', Utilities.getUuid());
  createReports();
  Logger.log('API_TOKEN = ' + props.getProperty('API_TOKEN'));
  return 'OK';
}

// Tab "reports": hàm QUERY() của Google Sheets dùng cú pháp gần giống SQL (Google Visualization Query Language).
// Lưu ý: QUERY chỉ đọc 1 vùng dữ liệu, KHÔNG JOIN được nhiều bảng — đây là giới hạn của Sheets so với RDBMS.
function createReports() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName('reports') || ss.insertSheet('reports');
  sheet.clear();
  var reports = [
    ['Listing PSA 10 rẻ nhất', '=QUERY(listings!A:P, "select A, I, H where F = 10 order by H asc limit 10", 1)'],
    ['Số listing theo sàn', '=QUERY(listings!A:P, "select D, count(A), avg(H) where A is not null group by D", 1)'],
    ['Số listing theo grade', '=QUERY(listings!A:P, "select F, count(A) where A is not null group by F order by F desc", 1)'],
    ['Seller nhiều giao dịch nhất', '=QUERY(sellers!A:F, "select B, E, F order by E desc limit 10", 1)'],
  ];
  var col = 1;
  reports.forEach(function (r) {
    sheet.getRange(1, col).setValue(r[0]).setFontWeight('bold');
    sheet.getRange(2, col).setFormula(r[1]);
    col += 5;
  });
}
