// Lab 1 — Nạp dữ liệu đã chuẩn hóa vào SQLite (có sẵn trong Node 22+) và chạy các query mẫu.
// Chạy: node scripts/labs/sqlite-demo.mjs [đường-dẫn-file.db]
// Mặc định dùng database trong RAM; truyền tên file (vd data/normalized/atlas.db) để lưu ra đĩa và mở bằng DB Browser / DBeaver.
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const LAB = 'docs/labs/lab1-sql-sheets';
const DATA = 'data/normalized';
const TABLES = ['sets', 'cards', 'sellers', 'listings', 'price_references', 'pop_reports']; // thứ tự theo khóa ngoại

if (!existsSync(`${DATA}/listings.json`)) {
  console.error('Chưa có dữ liệu chuẩn hóa. Chạy trước: node scripts/labs/export-normalized.mjs');
  process.exit(1);
}

const file = process.argv[2] ?? ':memory:';
if (file !== ':memory:' && existsSync(file)) rmSync(file);
const db = new DatabaseSync(file);

db.exec(readFileSync(`${LAB}/schema.sql`, 'utf8'));

for (const table of TABLES) {
  const rows = JSON.parse(readFileSync(`${DATA}/${table}.json`, 'utf8'));
  const cols = Object.keys(rows[0]);
  const insert = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
  db.exec('BEGIN');
  for (const r of rows) insert.run(...cols.map((k) => (r[k] === '' ? null : r[k])));
  db.exec('COMMIT');
}

// Tách queries.sql thành từng câu theo dòng tiêu đề "-- Qn:"
const blocks = readFileSync(`${LAB}/queries.sql`, 'utf8').split(/^(?=-- Q\d+:)/m).filter((b) => b.startsWith('-- Q'));
for (const block of blocks) {
  const [title, ...sql] = block.split('\n');
  console.log(`\n${title.replace(/^-- /, '')}`);
  console.table(db.prepare(sql.join('\n')).all());
}

if (file !== ':memory:') console.log(`\nĐã lưu database: ${file}`);
db.close();
