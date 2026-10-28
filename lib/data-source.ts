import catalogData from '@/data/catalog/catalog.json';
import { PokemonCard } from '@/types/card';
import { gradeToTier } from './utils';

// Nguồn catalog chọn bằng biến môi trường DATA_SOURCE:
//   json   (mặc định) — đọc data/catalog/catalog.json bundle sẵn
//   sheets (Lab 1)    — gọi Web App Apps Script ?view=catalog, ghép các bảng lại thành PokemonCard
export type DataSource = 'json' | 'sheets';

export const dataSource = (): DataSource => (process.env.DATA_SOURCE === 'sheets' ? 'sheets' : 'json');

export async function getCatalog(): Promise<PokemonCard[]> {
  if (dataSource() === 'sheets') return getCatalogFromSheets();
  return catalogData as unknown as PokemonCard[];
}

// Một dòng của ?view=catalog: mỗi bảng là một object, giống kết quả JOIN chưa "làm phẳng".
interface SheetsCatalogRow {
  listing: Record<string, any>;
  card: Record<string, any>;
  set: Record<string, any>;
  seller: Record<string, any>;
  price: Record<string, any>;
  pop: Record<string, any>;
}

const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(+v) ? null : +v);

async function getCatalogFromSheets(): Promise<PokemonCard[]> {
  const url = process.env.SHEETS_API_URL;
  if (!url) throw new Error('DATA_SOURCE=sheets nhưng chưa có SHEETS_API_URL trong .env.local');
  
  // Dùng cache: 'no-store' để mỗi lần reload app sẽ luôn gọi trực tiếp Google Sheets lấy dữ liệu mới nhất
  const res = await fetch(`${url}?view=catalog`, {
    cache: 'no-store',
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`Sheets API lỗi: ${body.error}`);
  return (body.rows as SheetsCatalogRow[]).map(toPokemonCard);
}

// Biến dữ liệu đã chuẩn hóa trở lại dạng phẳng mà giao diện đang dùng.
// Các giá trị dẫn xuất (tier, diffPercent) được tính lại, không đọc từ bảng.
export function toPokemonCard({ listing: l, card, set, seller, price, pop }: SheetsCatalogRow): PokemonCard {
  const listingPrice = num(l.price_usd);
  const pc = num(price.price_usd);
  const tierScore = num(l.tier_score);
  return {
    id: String(l.listing_id),
    name: card.card_name,
    character: card.character,
    year: num(card.year) ?? 0,
    set: set.set_name,
    variant: card.variant ?? '',
    grade: num(l.grade) ?? 10,
    gradeLabel: l.grade_label ?? undefined,
    slabCompany: 'PSA',
    tierScore,
    tier: tierScore != null ? gradeToTier(tierScore) : undefined,
    pricecharting: pc,
    priceChartingUrl: price.url ?? undefined,
    listingPriceUSD: listingPrice,
    diffPercent: listingPrice != null && pc ? Math.round((listingPrice / pc - 1) * 1000) / 10 : null,
    psa10pop: num(pop.psa10_pop),
    psaTotal: num(pop.psa_total),
    image: l.image_path ?? undefined,
    notes: l.notes ?? undefined,
    investmentThesis: l.investment_thesis ?? undefined,
    seller: seller.seller_name,
    sellerHref: seller.store_url ?? undefined,
    sellerBadge: seller.badge ?? undefined,
    sellerTransactions: num(seller.transactions) ?? undefined,
    sellerFeedback: num(seller.feedback_pct) ?? undefined,
    listingUrl: l.listing_url ?? undefined,
    listingTitle: l.listing_title ?? undefined,
    listingType: l.listing_type,
    ebayItemUrl: l.ebay_item_url ?? undefined,
    ebayItemPrice: num(l.ebay_item_price),
  };
}

