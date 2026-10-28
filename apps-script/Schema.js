// Mỗi tab trong Google Sheet = một bảng. Hàng 1 = tên cột (header).
// Cột đầu tiên là khóa chính, trừ các bảng có khóa ghép (PK_COLUMNS).
// Giữ đồng bộ với docs/labs/lab1-sql-sheets/schema.sql.
var TABLES = {
  sets: ['set_id', 'set_name'],
  cards: ['card_id', 'character', 'set_id', 'card_name', 'variant', 'year'],
  sellers: ['seller_id', 'seller_name', 'store_url', 'badge', 'transactions', 'feedback_pct'],
  listings: [
    'listing_id', 'card_id', 'seller_id', 'marketplace', 'listing_type', 'grade', 'grade_label',
    'price_usd', 'listing_title', 'listing_url', 'ebay_item_url', 'ebay_item_price', 'image_path',
    'tier_score', 'notes', 'investment_thesis',
  ],
  price_references: ['card_id', 'grade', 'source', 'price_usd', 'url'],
  pop_reports: ['card_id', 'psa10_pop', 'psa_total'],
  // Bảng mở rộng cho website bán thẻ (dữ liệu do người dùng tạo)
  users: ['user_id', 'email', 'display_name', 'created_at'],
  favorites: ['user_id', 'listing_id', 'created_at'],
  orders: ['order_id', 'user_id', 'status', 'total_usd', 'created_at'],
  order_items: ['order_id', 'listing_id', 'quantity', 'unit_price_usd'],
};

var PK_COLUMNS = {
  price_references: ['card_id', 'grade', 'source'],
  favorites: ['user_id', 'listing_id'],
  order_items: ['order_id', 'listing_id'],
};

// Bảng mà client được phép ghi qua API (doPost action=insert). Các bảng catalog chỉ nạp bằng action=import.
var WRITABLE_TABLES = ['users', 'favorites', 'orders', 'order_items'];

function pkOf(table) {
  return PK_COLUMNS[table] || [TABLES[table][0]];
}
