-- Lab 1 — Câu truy vấn mẫu. Mỗi câu bắt đầu bằng một dòng chú thích "-- Qn: ..." làm tiêu đề.

-- Q1: Đếm số dòng mỗi bảng (kiểm tra nạp dữ liệu)
SELECT 'listings' AS tbl, COUNT(*) AS n FROM listings
UNION ALL SELECT 'cards', COUNT(*) FROM cards
UNION ALL SELECT 'sets', COUNT(*) FROM sets
UNION ALL SELECT 'sellers', COUNT(*) FROM sellers;

-- Q2: 10 listing PSA 10 rẻ nhất (WHERE + ORDER BY + LIMIT)
SELECT listing_id, grade, price_usd, listing_title
FROM listings
WHERE grade = 10
ORDER BY price_usd ASC
LIMIT 10;

-- Q3: Số listing và giá trung bình theo set, chỉ set có từ 10 listing (JOIN + GROUP BY + HAVING)
SELECT s.set_name, COUNT(*) AS so_listing, ROUND(AVG(l.price_usd), 2) AS gia_tb_usd
FROM listings l
JOIN cards c ON c.card_id = l.card_id
JOIN sets s  ON s.set_id = c.set_id
GROUP BY s.set_name
HAVING COUNT(*) >= 10
ORDER BY so_listing DESC;

-- Q4: Top 10 deal rẻ hơn PriceCharting nhiều nhất (dùng VIEW)
SELECT listing_id, card_name, grade, price_usd, pricecharting_usd, diff_pct, deal_rating
FROM v_listing_deals
WHERE diff_pct IS NOT NULL
ORDER BY diff_pct ASC
LIMIT 10;

-- Q5: Phân bố tier theo nhân vật (GROUP BY nhiều cột)
SELECT character, tier, COUNT(*) AS so_listing
FROM v_listing_deals
GROUP BY character, tier
ORDER BY character, tier;

-- Q6: Seller có nhiều listing nhất (JOIN + GROUP BY)
SELECT se.seller_name, COUNT(*) AS so_listing, ROUND(SUM(l.price_usd), 0) AS tong_gia_tri_usd
FROM listings l
JOIN sellers se ON se.seller_id = l.seller_id
GROUP BY se.seller_name
ORDER BY so_listing DESC
LIMIT 10;

-- Q7: Thẻ hiếm nhất có PSA 10 pop ≤ 50 và đang được bán (subquery IN)
SELECT c.card_name, c.year, p.psa10_pop, p.psa_total
FROM cards c
JOIN pop_reports p ON p.card_id = c.card_id
WHERE p.psa10_pop <= 50
  AND c.card_id IN (SELECT card_id FROM listings)
ORDER BY p.psa10_pop ASC
LIMIT 10;

-- Q8: Thẻ có nhiều hơn 1 listing — so sánh giá thấp nhất và cao nhất (aggregate)
SELECT c.card_name, COUNT(*) AS so_listing, MIN(l.price_usd) AS re_nhat, MAX(l.price_usd) AS dat_nhat
FROM listings l
JOIN cards c ON c.card_id = l.card_id
GROUP BY c.card_id
HAVING COUNT(*) > 1
ORDER BY so_listing DESC
LIMIT 10;

-- Q9: Danh mục P/P — listing dưới 400 triệu VNĐ (tỷ giá 25.460) theo tier tốt nhất
SELECT listing_id, card_name, tier, price_usd, ROUND(price_usd * 25460 / 1000000, 1) AS gia_trieu_vnd
FROM v_listing_deals
WHERE price_usd * 25460 <= 400000000
ORDER BY tier ASC, diff_pct ASC
LIMIT 10;

-- Q10: Kiểm tra chất lượng dữ liệu — giá rẻ bất thường (< 5% giá PriceCharting) cần xác minh lại trên sàn
SELECT listing_id, card_name, grade, price_usd, pricecharting_usd, diff_pct, seller_name
FROM v_listing_deals
WHERE price_usd < pricecharting_usd * 0.05
ORDER BY diff_pct ASC;
