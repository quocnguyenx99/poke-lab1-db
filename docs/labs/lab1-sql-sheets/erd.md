# ERD — Catalog thẻ PSA (sau chuẩn hóa)

## Từ 1 bảng phẳng thành 6 bảng quan hệ (3NF)

Mỗi object trong `data/catalog/catalog.json` ban đầu trộn lẫn nhiều thực thể. Ví dụ: thông tin seller "Official PSA Store" bị lặp lại ở **338 dòng**. Khi seller cập nhật điểm feedback hay số lượng giao dịch, ta sẽ phải sửa đồng loạt 338 chỗ (**update anomaly**). Nếu xóa hết tin đăng của seller đó thì thông tin seller cũng biến mất (**deletion anomaly**).

| Nhóm field trong JSON | Phụ thuộc vào | Bảng quan hệ | Ghi chú chuẩn hóa |
|---|---|---|---|
| `set` | Tên set phát hành | `sets` | 1 set có nhiều thẻ |
| `character`, `name`, `variant`, `year` | Bản in thẻ | `cards` | `year` phụ thuộc vào từng thẻ (cùng set Jungle có cả bản 1996 và 1999) |
| `seller`, `sellerHref`, `sellerBadge`, `sellerTransactions`, `sellerFeedback` | Người bán | `sellers` | Tránh lặp lại thông tin seller hàng trăm lần |
| `id`, `grade`, `listingPriceUSD`, `listingUrl`, `image`, `tierScore`... | Tin đăng bán | `listings` | Mỗi tin đăng là một slab cụ thể có grade và giá riêng |
| `pricecharting`, `priceChartingUrl` | Cặp (thẻ, grade) | `price_references` | Cùng một thẻ nhưng PSA 10 và PSA 9 có giá tham chiếu khác nhau |
| `psa10pop`, `psaTotal` | Thẻ | `pop_reports` | Báo cáo dân số PSA của mẫu thẻ (1-1 với cards) |
| `tier`, `diffPercent`, `dealRating` | Tính từ `tierScore` & giá | *(Không lưu)* | Trường suy dẫn -> dùng VIEW `v_listing_deals` |

---

## Sơ đồ ERD trực quan (Full 10 bảng quan hệ)

![Sơ đồ ERD](assets/erd_diagram.png)

---

## Sơ đồ ERD cốt lõi (Catalog PSA)

```mermaid
erDiagram
    sets ||--o{ cards : "chứa (1-n)"
    cards ||--o{ listings : "được đăng bán (1-n)"
    sellers ||--o{ listings : "đăng bán (1-n)"
    cards ||--o{ price_references : "giá tham chiếu theo grade (1-n)"
    cards ||--o| pop_reports : "population report (1-1)"

    sets {
        TEXT set_id PK
        TEXT set_name
    }
    cards {
        TEXT card_id PK
        TEXT character "Snorlax | Munchlax"
        TEXT set_id FK
        TEXT card_name
        TEXT variant
        INTEGER year
    }
    sellers {
        TEXT seller_id PK
        TEXT seller_name
        TEXT store_url
        TEXT badge
        INTEGER transactions
        REAL feedback_pct
    }
    listings {
        TEXT listing_id PK
        TEXT card_id FK
        TEXT seller_id FK
        TEXT marketplace "ebay | fanatics"
        TEXT listing_type "BUY_IT_NOW | BUY_NOW"
        REAL grade
        REAL price_usd
        TEXT listing_url
        TEXT image_path
        INTEGER tier_score
    }
    price_references {
        TEXT card_id PK, FK
        REAL grade PK
        TEXT source PK "PriceCharting"
        REAL price_usd
        TEXT url
    }
    pop_reports {
        TEXT card_id PK, FK
        INTEGER psa10_pop
        INTEGER psa_total
    }
```

---

## Mở rộng cho hệ thống E-Commerce (Bán thẻ trực tuyến)

Khi xây dựng đầy đủ chức năng giỏ hàng, đặt hàng, danh sách yêu thích và quản lý người dùng:

```mermaid
erDiagram
    users ||--o{ favorites : "thích (1-n)"
    listings ||--o{ favorites : "được thích (1-n)"
    users ||--o{ orders : "tạo đơn (1-n)"
    orders ||--|{ order_items : "chứa (1-n)"
    listings ||--o{ order_items : "được mua (1-n)"

    users {
        TEXT user_id PK
        TEXT email
        TEXT display_name
        TEXT created_at
    }
    favorites {
        TEXT user_id PK, FK
        TEXT listing_id PK, FK
        TEXT created_at
    }
    orders {
        TEXT order_id PK
        TEXT user_id FK
        TEXT status "pending | paid | cancelled"
        REAL total_usd
        TEXT created_at
    }
    order_items {
        TEXT order_id PK, FK
        TEXT listing_id PK, FK
        INTEGER quantity
        REAL unit_price_usd "Snapshot giá tại thời điểm đặt hàng"
    }
```

### Điểm nhấn thiết kế quan hệ & dữ liệu:
1. **Bảng trung gian `favorites` (n-n giữa `users` và `listings`)**: Khóa chính kết hợp `(user_id, listing_id)` ngăn trùng lặp yêu thích.
2. **Quan hệ `orders` và `order_items` (1-n)**: Mỗi đơn hàng có nhiều món hàng.
3. **Phi chuẩn hóa có chủ đích (`order_items.unit_price_usd`)**: Lưu lại chính xác giá của listing tại thời điểm khách bấm đặt hàng. Nếu sau này listing đổi giá hoặc bị xóa, thông tin tài chính và hóa đơn lịch sử vẫn bất biến.
