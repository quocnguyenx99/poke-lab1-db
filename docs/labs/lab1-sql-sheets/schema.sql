-- Lab 1 — Lược đồ quan hệ cho catalog thẻ PSA (chuẩn 3NF)
-- Tương thích SQLite và PostgreSQL.

PRAGMA foreign_keys = ON; -- SQLite: bật kiểm tra khóa ngoại (PostgreSQL bỏ dòng này)

-- Set phát hành (Jungle, Team Rocket Returns, ...)
CREATE TABLE IF NOT EXISTS sets (
  set_id    TEXT PRIMARY KEY,
  set_name  TEXT NOT NULL
);

-- Một bản in thẻ cụ thể. year nằm ở đây vì cùng tên set có thể có nhiều năm (bản Nhật / bản Mỹ / reprint).
CREATE TABLE IF NOT EXISTS cards (
  card_id    TEXT PRIMARY KEY,
  character  TEXT NOT NULL CHECK (character IN ('Snorlax', 'Munchlax')),
  set_id     TEXT NOT NULL REFERENCES sets(set_id),
  card_name  TEXT NOT NULL,
  variant    TEXT,
  year       INTEGER
);

-- Người bán trên sàn
CREATE TABLE IF NOT EXISTS sellers (
  seller_id     TEXT PRIMARY KEY,
  seller_name   TEXT NOT NULL,
  store_url     TEXT,
  badge         TEXT,
  transactions  INTEGER,
  feedback_pct  REAL
);

-- Một tin đăng bán (listing) của một slab PSA cụ thể
CREATE TABLE IF NOT EXISTS listings (
  listing_id         TEXT PRIMARY KEY,
  card_id            TEXT NOT NULL REFERENCES cards(card_id),
  seller_id          TEXT NOT NULL REFERENCES sellers(seller_id),
  marketplace        TEXT NOT NULL CHECK (marketplace IN ('ebay', 'fanatics')),
  listing_type       TEXT NOT NULL CHECK (listing_type IN ('BUY_IT_NOW', 'BUY_NOW')),
  grade              REAL NOT NULL CHECK (grade BETWEEN 1 AND 10),
  grade_label        TEXT,
  price_usd          REAL CHECK (price_usd > 0),
  listing_title      TEXT,
  listing_url        TEXT,
  ebay_item_url      TEXT,
  ebay_item_price    REAL,
  image_path         TEXT,
  tier_score         INTEGER CHECK (tier_score BETWEEN 0 AND 100),
  notes              TEXT,
  investment_thesis  TEXT
);

-- Giá tham chiếu theo (thẻ, grade) — một thẻ PSA 10 và PSA 9 có giá khác nhau
CREATE TABLE IF NOT EXISTS price_references (
  card_id    TEXT NOT NULL REFERENCES cards(card_id),
  grade      REAL NOT NULL,
  source     TEXT NOT NULL DEFAULT 'PriceCharting',
  price_usd  REAL NOT NULL CHECK (price_usd > 0),
  url        TEXT,
  PRIMARY KEY (card_id, grade, source)
);

-- Số lượng slab PSA đã chấm của một thẻ (population report)
CREATE TABLE IF NOT EXISTS pop_reports (
  card_id    TEXT PRIMARY KEY REFERENCES cards(card_id),
  psa10_pop  INTEGER CHECK (psa10_pop >= 0),
  psa_total  INTEGER CHECK (psa_total >= 0)
);

-- Bảng mở rộng cho website bán thẻ
CREATE TABLE IF NOT EXISTS users (
  user_id      TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(user_id),
  listing_id TEXT NOT NULL REFERENCES listings(listing_id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id   TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(user_id),
  status     TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_usd  REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id       TEXT NOT NULL REFERENCES orders(order_id),
  listing_id     TEXT NOT NULL REFERENCES listings(listing_id),
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price_usd REAL NOT NULL,
  PRIMARY KEY (order_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_card   ON listings(card_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_cards_set       ON cards(set_id);

-- Giá trị dẫn xuất (tier, % chênh lệch, đánh giá deal) KHÔNG lưu trong bảng — tính bằng VIEW.
DROP VIEW IF EXISTS v_listing_deals;
CREATE VIEW v_listing_deals AS
SELECT
  l.listing_id,
  c.character,
  s.set_name,
  c.card_name,
  c.year,
  l.grade,
  l.price_usd,
  p.price_usd AS pricecharting_usd,
  ROUND((l.price_usd / p.price_usd - 1) * 100, 1) AS diff_pct,
  CASE
    WHEN l.tier_score >= 90 THEN 'S'
    WHEN l.tier_score >= 80 THEN 'A'
    WHEN l.tier_score >= 70 THEN 'B'
    WHEN l.tier_score >= 63 THEN 'C'
    ELSE 'D'
  END AS tier,
  CASE
    WHEN p.price_usd IS NULL THEN NULL
    WHEN (l.price_usd / p.price_usd - 1) * 100 <= -15 THEN 'SIÊU HỜI'
    WHEN (l.price_usd / p.price_usd - 1) * 100 < 0 THEN 'GIÁ TỐT'
    WHEN (l.price_usd / p.price_usd - 1) * 100 <= 15 THEN 'GIÁ CHUẨN'
    ELSE 'PREMIUM'
  END AS deal_rating,
  se.seller_name,
  l.marketplace
FROM listings l
JOIN cards c        ON c.card_id = l.card_id
JOIN sets s         ON s.set_id = c.set_id
JOIN sellers se     ON se.seller_id = l.seller_id
LEFT JOIN price_references p ON p.card_id = l.card_id AND p.grade = l.grade;
