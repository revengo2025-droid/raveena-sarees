import { z } from "zod";
import { INDIAN_MOBILE_RE, INDIAN_PINCODE_RE, isIndianState } from "@/lib/geo/india";

// =============================================================================
// AUTH SCHEMAS
// =============================================================================
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string("Please enter your 10-digit mobile number").regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  // Required: the courier and our team use it for delivery updates
  phone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  // Optional backup number, visible to staff for deliveries and support
  secondaryPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
}).refine((v) => !v.secondaryPhone || v.secondaryPhone !== v.phone, {
  message: "The secondary number must be different from your main mobile number",
  path: ["secondaryPhone"],
});

// =============================================================================
// ADDRESS SCHEMA
// =============================================================================
export const addressSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().regex(INDIAN_MOBILE_RE, "Please enter a valid 10-digit Indian mobile number"),
  houseNumber: z.string().trim().min(1, "House number / tower / block is required").max(100),
  streetAddress: z.string().trim().min(3, "Address / building / street is required").max(200),
  locality: z.string().trim().min(2, "Locality / town is required").max(150),
  landmark: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2, "City / district is required").max(100),
  state: z.string().refine((v) => isIndianState(v), "Please select your state"),
  pincode: z.string().regex(INDIAN_PINCODE_RE, "Please enter a valid 6-digit PIN code"),
  addressType: z.enum(["home", "office", "other"]).default("home"),
  isDefault: z.boolean().optional().default(false),
});

// =============================================================================
// PRODUCT SCHEMA
// =============================================================================
export const productSchema = z.object({
  sku: z.string().min(3, "SKU is required"),
  name: z.string().min(3, "Product name is required"),
  slug: z.string().min(3, "Slug is required"),
  categoryId: z
    .string()
    .uuid("Invalid category ID")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val ? val : null)),
  categoryName: z.string().min(2, "Category name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be greater than zero"),
  discountPrice: z
    .number()
    .positive("Discount price must be positive")
    .optional()
    .nullable()
    .or(z.literal(0))
    .transform((val) => (val && val > 0 ? val : null)),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  fabric: z.string().min(2, "Fabric is required"),
  zariType: z.string().default("Pure Gold Zari"),
  weaveType: z.string().default("Handloom Jacquard"),
  sareeLength: z.string().default("5.5 Meters"),
  blouseIncluded: z.boolean().default(true),
  blouseLength: z.string().default("0.80 Meters (Unstitched)"),
  occasion: z.string().min(2, "Occasion is required"),
  careInstructions: z
    .string()
    .default("Dry Clean Only. Store wrapped in pure cotton or muslin fabric."),
  availableColors: z.array(z.string()).default([]),
  primaryColor: z.string().min(2, "Primary color is required"),
  images: z.array(z.string()).default([]).optional(),
  rating: z
    .number()
    .min(0, "Rating cannot be negative")
    .max(5, "Rating cannot exceed 5")
    .default(0)
    .optional()
    .nullable(),
  reviewCount: z
    .number()
    .int()
    .min(0, "Review count cannot be negative")
    .default(0)
    .optional()
    .nullable(),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// =============================================================================
// CHECKOUT & ORDER SCHEMAS
// =============================================================================
// IDs/SKUs are used in database filters: allow only a strict character set (no filter injection)
const SAFE_KEY = /^[A-Za-z0-9_-]{1,64}$/;
export const orderItemInputSchema = z.object({
  productId: z.string().regex(SAFE_KEY, "Invalid product"),
  productName: z.string().max(255),
  sku: z.string().regex(SAFE_KEY, "Invalid product"),
  selectedColor: z.string().max(100).optional(),
  price: z.number().positive(),
  quantity: z.number().int().positive().max(20, "Please contact us for bulk orders"),
  imageUrl: z.string().max(1000).optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2, "Full name is required"),
  customerEmail: z.string().email("Valid email is required"),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  items: z.array(orderItemInputSchema).min(1, "Cart must have at least one item").max(50),
  paymentMethod: z.enum(["razorpay", "upi", "card", "netbanking"]),
  couponCode: z.string().max(50).optional(),
  giftWrap: z.boolean().optional().default(false),
  giftMessage: z.string().max(250).optional(),
  notes: z.string().max(500).optional(),
});

export const razorpayVerificationSchema = z.object({
  razorpayOrderId: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
  razorpayPaymentId: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
  razorpaySignature: z.string().regex(/^[A-Za-z0-9_]{1,128}$/),
  orderNumber: z.string().regex(/^[A-Za-z0-9-]{4,50}$/),
});

// =============================================================================
// COUPON SCHEMA
// =============================================================================
export const couponSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().default(1000),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
});

// =============================================================================
// REVIEW SCHEMA
// =============================================================================
export const reviewSchema = z.object({
  productId: z.string().uuid(),
  authorName: z.string().min(2, "Name is required"),
  authorCity: z.string().min(2, "City is required"),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(10, "Review must be at least 10 characters"),
});

// Type definitions inferred from Zod schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type RazorpayVerificationInput = z.infer<typeof razorpayVerificationSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
