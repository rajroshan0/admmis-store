// Pure TypeScript types shared by the web app and (later) the React Native app.
// Keep this folder free of Next.js / DOM imports so it can be reused as-is.

export type Lang = "en" | "ne";

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_ne: string;
  sort_order: number;
}

export interface Variant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name_en: string;
  name_ne: string | null;
  description_en: string | null;
  description_ne: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  product_variants?: Variant[];
  categories?: Pick<Category, "id" | "slug" | "name_en" | "name_ne"> | null;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "esewa";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  name: string;
  size: string | null;
  color: string | null;
  unit_price: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: string;
  order_number: number;
  user_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  promo_code: string | null;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_district: string | null;
  notes: string | null;
  esewa_transaction_uuid: string | null;
  esewa_ref_id: string | null;
  paid_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  shipping_fee: number;
  free_shipping_over: number;
  cod_enabled: boolean;
  esewa_enabled: boolean;
}

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name_en: string;
  name_ne: string | null;
  price: number;
  size: string | null;
  color: string | null;
  image: string | null;
  quantity: number;
  maxStock: number;
}
