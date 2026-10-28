// Lab 1 — Chuẩn hóa data/catalog/catalog.json (1 bảng phẳng) thành 6 bảng quan hệ.
// Kết quả: data/normalized/{table}.csv + {table}.json + _conflicts.csv
// Chạy: node scripts/labs/export-normalized.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SRC = 'data/catalog/catalog.json';
const OUT = 'data/normalized';

const catalog = JSON.parse(readFileSync(SRC, 'utf8'));

const slug = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Một "thẻ" (printing) = nhân vật + set + năm + biến thể + tên. Nhiều listing có thể cùng một thẻ.
const cardKey = (c) => [c.character, c.set, c.year, c.variant, c.name].join('|');
const cardId = (c) => 'c-' + createHash('sha1').update(cardKey(c)).digest('hex').slice(0, 10);
const marketplace = (c) => (String(c.listingUrl).includes('fanaticscollect.com') ? 'fanatics' : 'ebay');

const sets = new Map();
const cards = new Map();
const sellers = new Map();
const listings = [];
const priceRefs = new Map();
const popReports = new Map();
const conflicts = [];

for (const c of catalog) {
  const setId = slug(c.set);
  sets.set(setId, { set_id: setId, set_name: c.set });

  const cid = cardId(c);
  if (!cards.has(cid)) {
    cards.set(cid, {
      card_id: cid,
      character: c.character,
      set_id: setId,
      card_name: c.name,
      variant: c.variant,
      year: c.year,
    });
  }

  const sellerId = slug(c.seller) || 'unknown';
  if (!sellers.has(sellerId)) {
    sellers.set(sellerId, {
      seller_id: sellerId,
      seller_name: c.seller,
      store_url: c.sellerHref ?? '',
      badge: c.sellerBadge ?? '',
      transactions: c.sellerTransactions ?? '',
      feedback_pct: c.sellerFeedback ?? '',
    });
  }

  listings.push({
    listing_id: c.id,
    card_id: cid,
    seller_id: sellerId,
    marketplace: marketplace(c),
    listing_type: c.listingType,
    grade: c.grade,
    grade_label: c.gradeLabel ?? '',
    price_usd: c.listingPriceUSD ?? '',
    listing_title: c.listingTitle ?? '',
    listing_url: c.listingUrl ?? '',
    ebay_item_url: c.ebayItemUrl ?? '',
    ebay_item_price: c.ebayItemPrice ?? '',
    image_path: c.image ?? '',
    tier_score: c.tierScore ?? '',
    notes: c.notes ?? '',
    investment_thesis: c.investmentThesis ?? '',
  });

  // Giá tham chiếu PriceCharting phụ thuộc (thẻ, grade) — không phụ thuộc listing.
  if (c.pricecharting != null) {
    const k = `${cid}#${c.grade}`;
    const prev = priceRefs.get(k);
    if (!prev) {
      priceRefs.set(k, {
        card_id: cid,
        grade: c.grade,
        source: 'PriceCharting',
        price_usd: c.pricecharting,
        url: c.priceChartingUrl ?? '',
        first_listing_id: c.id,
      });
    } else if (prev.price_usd !== c.pricecharting) {
      // Không tự chọn giá "đúng" — ghi lại để con người/Agent xác minh.
      conflicts.push({
        table: 'price_references',
        key: k,
        kept_listing_id: prev.first_listing_id,
        kept_value: prev.price_usd,
        other_listing_id: c.id,
        other_value: c.pricecharting,
      });
    }
  }

  if (c.psa10pop != null) {
    const prev = popReports.get(cid);
    if (!prev) {
      popReports.set(cid, { card_id: cid, psa10_pop: c.psa10pop, psa_total: c.psaTotal ?? '' });
    } else if (prev.psa10_pop !== c.psa10pop || prev.psa_total !== (c.psaTotal ?? '')) {
      conflicts.push({
        table: 'pop_reports',
        key: cid,
        kept_listing_id: '',
        kept_value: `${prev.psa10_pop}/${prev.psa_total}`,
        other_listing_id: c.id,
        other_value: `${c.psa10pop}/${c.psaTotal}`,
      });
    }
  }
}

const tables = {
  sets: [...sets.values()],
  cards: [...cards.values()],
  sellers: [...sellers.values()],
  listings,
  price_references: [...priceRefs.values()].map(({ first_listing_id, ...r }) => r),
  pop_reports: [...popReports.values()],
};

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((k) => csvCell(r[k])).join(','))].join('\n') + '\n';
};

mkdirSync(OUT, { recursive: true });
for (const [name, rows] of Object.entries(tables)) {
  writeFileSync(`${OUT}/${name}.csv`, toCsv(rows), 'utf8');
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log(`${name.padEnd(17)} ${String(rows.length).padStart(4)} dòng`);
}
writeFileSync(`${OUT}/_conflicts.csv`, toCsv(conflicts), 'utf8');
console.log(`_conflicts        ${String(conflicts.length).padStart(4)} dòng (dữ liệu mâu thuẫn cần xác minh)`);
