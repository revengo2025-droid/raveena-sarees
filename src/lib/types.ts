export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  bannerUrl?: string;
  itemCount?: number;
  featured?: boolean;
}

export interface SareeProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  fabric: string; // e.g. "Pure Kanchipuram Silk", "Banarasi Brocade", "Tussar Handloom", "Chanderi Cotton Silk", "Pure Organza"
  zariType: string; // e.g. "Pure Gold Zari", "Antique Silver Zari", "Tested Metallic Zari", "Copper Zari"
  weaveType: string; // e.g. "Handloom Jacquard", "Korvai Weave", "Kadwa Technique", "Cutwork"
  sareeLength: string; // "5.5 Meters"
  blouseIncluded: boolean;
  blouseLength: string; // "0.80 Meters (Unstitched)"
  occasion: string; // "Bridal / Wedding", "Grand Festive", "Evening Party", "Reception", "Daily Classic"
  careInstructions: string;
  availableColors: string[];
  primaryColor: string;
  images: string[];
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  tags?: string[];
  createdAt: string;
}

export interface CartItem {
  product: SareeProduct;
  quantity: number;
  selectedColor: string;
}

export interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  /** House number / tower / block */
  houseNumber?: string;
  /** Address / building / street */
  street: string;
  locality?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
  type?: "Home" | "Office" | "Other";
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  selectedColor: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refund_processing"
  | "refunded";

export type PaymentMethod = "razorpay" | "upi" | "card" | "netbanking" | "cod";

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: SavedAddress;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  giftWrapFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "paid" | "pending" | "failed" | "refunded";
  paymentId?: string;
  orderStatus: OrderStatus;
  courierPartner: string;
  trackingNumber: string;
  trackingUrl?: string;
  giftWrap: boolean;
  giftMessage?: string;
  appliedCoupon?: string;
  createdAt: string;
  estimatedDelivery: string;
  /** Normalised shipment status (see lib/services/shipping/status.ts) and the courier's own label. */
  shipmentStatus?: string | null;
  shipmentStatusLabel?: string | null;
  deliveredAt?: string | null;
  /** Admin-only operational fields (never mapped for customers). */
  ops?: OrderOps;
}

export interface OrderOps {
  shiprocketOrderId: number | null;
  shipmentId: number | null;
  awb: string | null;
  shiprocketStatus: string | null;
  pickupStatus: string | null;
  fulfillmentStatus: string | null;
  fulfillmentError: string | null;
  fulfillmentOperation: string | null;
  fulfillmentAttempts: number;
  syncedAt: string | null;
  lastTrackingUpdate: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  description: string;
  isActive: boolean;
  expiresAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userCity: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: "approved" | "pending" | "rejected";
  createdAt: string;
  likes?: number;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  imageUrl: string;
  linkUrl: string;
  buttonText: string;
  accentText?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "customer" | "admin";
  avatarUrl?: string;
  joinedDate: string;
}

export interface FilterState {
  category: string[];
  fabric: string[];
  occasion: string[];
  color: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  searchQuery: string;
  sortBy: "featured" | "newest" | "price-asc" | "price-desc" | "rating" | "bestseller";
}
