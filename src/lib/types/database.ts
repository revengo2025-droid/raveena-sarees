export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "admin" | "staff";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "razorpay" | "upi" | "card" | "netbanking" | "cod";
export type DiscountType = "percentage" | "fixed";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "item_received"
  | "refunded";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          street_address: string;
          landmark: string | null;
          city: string;
          state: string;
          pincode: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          street_address: string;
          landmark?: string | null;
          city: string;
          state: string;
          pincode: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          street_address?: string;
          landmark?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          banner_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          banner_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          slug: string;
          category_id: string | null;
          category_name: string;
          description: string;
          price: number;
          discount_price: number | null;
          stock: number;
          fabric: string;
          zari_type: string;
          weave_type: string;
          saree_length: string;
          blouse_included: boolean;
          blouse_length: string;
          occasion: string;
          care_instructions: string;
          available_colors: string[];
          primary_color: string;
          images: string[];
          rating: number;
          review_count: number;
          is_featured: boolean;
          is_bestseller: boolean;
          is_new_arrival: boolean;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku: string;
          name: string;
          slug: string;
          category_id?: string | null;
          category_name: string;
          description: string;
          price: number;
          discount_price?: number | null;
          stock?: number;
          fabric: string;
          zari_type?: string;
          weave_type?: string;
          saree_length?: string;
          blouse_included?: boolean;
          blouse_length?: string;
          occasion: string;
          care_instructions?: string;
          available_colors?: string[];
          primary_color: string;
          images: string[];
          rating?: number;
          review_count?: number;
          is_featured?: boolean;
          is_bestseller?: boolean;
          is_new_arrival?: boolean;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku?: string;
          name?: string;
          slug?: string;
          category_id?: string | null;
          category_name?: string;
          description?: string;
          price?: number;
          discount_price?: number | null;
          stock?: number;
          fabric?: string;
          zari_type?: string;
          weave_type?: string;
          saree_length?: string;
          blouse_included?: boolean;
          blouse_length?: string;
          occasion?: string;
          care_instructions?: string;
          available_colors?: string[];
          primary_color?: string;
          images?: string[];
          rating?: number;
          review_count?: number;
          is_featured?: boolean;
          is_bestseller?: boolean;
          is_new_arrival?: boolean;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          color: string;
          color_code: string | null;
          stock: number;
          price: number | null;
          discount_price: number | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          color: string;
          color_code?: string | null;
          stock?: number;
          price?: number | null;
          discount_price?: number | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          color?: string;
          color_code?: string | null;
          stock?: number;
          price?: number | null;
          discount_price?: number | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: Json;
          subtotal: number;
          discount_amount: number;
          shipping_fee: number;
          total_amount: number;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          payment_id: string | null;
          order_status: OrderStatus;
          courier_partner: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          gift_wrap: boolean;
          gift_message: string | null;
          applied_coupon: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: Json;
          subtotal: number;
          discount_amount?: number;
          shipping_fee?: number;
          total_amount: number;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          payment_id?: string | null;
          order_status?: OrderStatus;
          courier_partner?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          gift_wrap?: boolean;
          gift_message?: string | null;
          applied_coupon?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          shipping_address?: Json;
          subtotal?: number;
          discount_amount?: number;
          shipping_fee?: number;
          total_amount?: number;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          payment_id?: string | null;
          order_status?: OrderStatus;
          courier_partner?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          gift_wrap?: boolean;
          gift_message?: string | null;
          applied_coupon?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          sku: string;
          selected_color: string | null;
          price: number;
          quantity: number;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          sku: string;
          selected_color?: string | null;
          price: number;
          quantity?: number;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          sku?: string;
          selected_color?: string | null;
          price?: number;
          quantity?: number;
          image_url?: string | null;
          created_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_order_value: number;
          max_discount: number | null;
          usage_limit: number;
          times_used: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_order_value?: number;
          max_discount?: number | null;
          usage_limit?: number;
          times_used?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: DiscountType;
          discount_value?: number;
          min_order_value?: number;
          max_discount?: number | null;
          usage_limit?: number;
          times_used?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          author_name: string;
          author_city: string;
          rating: number;
          title: string | null;
          comment: string;
          is_verified_purchase: boolean;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          author_name: string;
          author_city?: string;
          rating: number;
          title?: string | null;
          comment: string;
          is_verified_purchase?: boolean;
          status?: ReviewStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string | null;
          author_name?: string;
          author_city?: string;
          rating?: number;
          title?: string | null;
          comment?: string;
          is_verified_purchase?: boolean;
          status?: ReviewStatus;
          created_at?: string;
        };
      };
      hero_banners: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          tagline: string | null;
          image_url: string;
          link_url: string;
          button_text: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          tagline?: string | null;
          image_url: string;
          link_url: string;
          button_text?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          tagline?: string | null;
          image_url?: string;
          link_url?: string;
          button_text?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      store_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
    };
  };
}
