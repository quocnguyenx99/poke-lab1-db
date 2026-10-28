// Lab 1 — Nạp data/normalized/*.json lên Google Sheets qua Web App Apps Script (doPost action=import).
// Cần trong .env.local: SHEETS_API_URL (…/exec) và SHEETS_API_TOKEN (in ra khi chạy setupSheets()).
// Chạy: node scripts/labs/push-to-sheets.mjs
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { SHEETS_API_URL: url, SHEETS_API_TOKEN: token } = process.env;
if (!url || !token) {
  console.error('Thiếu SHEETS_API_URL hoặc SHEETS_API_TOKEN trong .env.local');
  process.exit(1);
}

const TABLES = ['sets', 'cards', 'sellers', 'listings', 'price_references', 'pop_reports'];
const BATCH = 200; // tránh vượt giới hạn kích thước request / thời gian chạy 6 phút của Apps Script

const post = async (body) => {
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ token, ...body }), redirect: 'follow' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không phải JSON (kiểm tra quyền truy cập Web App = "Anyone"): ${text.slice(0, 200)}`);
  }
};

for (const table of TABLES) {
  const rows = JSON.parse(readFileSync(`data/normalized/${table}.json`, 'utf8'));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const r = await post({ action: 'import', table, rows: rows.slice(i, i + BATCH), replace: i === 0 });
    if (!r.ok) throw new Error(`${table}: ${r.error}`);
    inserted += r.inserted;
  }
  console.log(`${table.padEnd(17)} ${String(inserted).padStart(4)} dòng`);
}

const check = await (await fetch(`${url}?table=listings`)).json();
console.log(`\nKiểm tra GET ?table=listings → ${check.count} dòng`);
