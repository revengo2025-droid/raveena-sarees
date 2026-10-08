-- ==============================================================================
-- Raveena Sarees - Complete Production PostgreSQL Database Schema
-- Brand: Raveena Sarees | Marthadi, Telangana, India
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for auto-profile creation on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. SAVED USER ADDRESSES
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    street_address TEXT NOT NULL,
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    banner_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PRODUCTS TABLE (Luxury Sarees Collection)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 10,
    fabric VARCHAR(100) NOT NULL,
    zari_type VARCHAR(100) DEFAULT 'Pure Gold Zari',
    weave_type VARCHAR(100) DEFAULT 'Handloom Jacquard',
    saree_length VARCHAR(50) DEFAULT '5.5 Meters',
    blouse_included BOOLEAN DEFAULT TRUE,
    blouse_length VARCHAR(50) DEFAULT '0.80 Meters (Unstitched)',
    occasion VARCHAR(100) NOT NULL,
    care_instructions TEXT DEFAULT 'Dry Clean Only. Store wrapped in pure cotton or muslin fabric.',
    available_colors TEXT[] DEFAULT '{}',
    primary_color VARCHAR(50) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    rating NUMERIC(2, 1) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(100) NOT NULL,
    color_code VARCHAR(50),
    stock INT NOT NULL DEFAULT 10,
    price NUMERIC(10, 2),
    discount_price NUMERIC(10, 2),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. INVENTORY LOGS (Audit trail for every stock change)
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('order', 'return', 'manual_adjustment', 'restock')),
    quantity_change INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason TEXT,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. USER SHOPPING CARTS (Database synced)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    selected_color VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. WISHLISTS
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- 11. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    max_discount NUMERIC(10, 2),
    usage_limit INT DEFAULT 1000,
    times_used INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_id UUID,
    discount_applied NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    shipping_fee NUMERIC(10, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'razorpay', 'upi', 'card', 'netbanking' (older rows may hold 'cod'; new orders never do)
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id VARCHAR(100),
    order_status VARCHAR(50) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
    courier_partner VARCHAR(100) DEFAULT 'BlueDart Express',
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    estimated_delivery DATE,
    gift_wrap BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    applied_coupon VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    selected_color VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    image_url TEXT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. ORDER STATUS HISTORY (Timeline tracking)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. PAYMENTS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_provider VARCHAR(50) DEFAULT 'razorpay',
    transaction_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
    response_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. REFUNDS & RETURNS
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    refund_id VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(50) NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    reason TEXT NOT NULL,
    return_status VARCHAR(50) DEFAULT 'requested' CHECK (return_status IN ('requested', 'approved', 'rejected', 'item_received', 'refunded')),
    tracking_number VARCHAR(100),
    courier_partner VARCHAR(100),
    refund_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    author_name VARCHAR(100) NOT NULL,
    author_city VARCHAR(100) DEFAULT 'Hyderabad',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT NOT NULL,
    is_verified_purchase BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. HERO BANNERS & CMS
CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    subtitle TEXT,
    tagline VARCHAR(100),
    image_url TEXT NOT NULL,
    link_url VARCHAR(255) NOT NULL,
    button_text VARCHAR(50) DEFAULT 'Explore Collection',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. STORE SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. NEWSLETTER SUBSCRIBERS
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 22. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Public can view author names for reviews; users can view/update their own profile; admins can view all
DROP POLICY IF EXISTS "Public read minimal profiles" ON profiles;
CREATE POLICY "Public read minimal profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User Addresses
DROP POLICY IF EXISTS "Users read own addresses" ON user_addresses;
CREATE POLICY "Users read own addresses" ON user_addresses FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users insert own addresses" ON user_addresses;
CREATE POLICY "Users insert own addresses" ON user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own addresses" ON user_addresses;
CREATE POLICY "Users update own addresses" ON user_addresses FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own addresses" ON user_addresses;
CREATE POLICY "Users delete own addresses" ON user_addresses FOR DELETE USING (auth.uid() = user_id);

-- Catalog: Public read active
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Public read variants" ON product_variants;
CREATE POLICY "Public read variants" ON product_variants FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Public read banners" ON hero_banners;
CREATE POLICY "Public read banners" ON hero_banners FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Public read coupons" ON coupons;
CREATE POLICY "Public read coupons" ON coupons FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (status = 'approved' OR public.is_admin());
DROP POLICY IF EXISTS "Users insert reviews" ON reviews;
CREATE POLICY "Users insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Orders: Users can read their own orders; public/guest can insert checkout orders
DROP POLICY IF EXISTS "Users read own orders" ON orders;
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Insert orders" ON orders;
CREATE POLICY "Insert orders" ON orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users read own order items" ON order_items;
CREATE POLICY "Users read own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin()))
);
DROP POLICY IF EXISTS "Insert order items" ON order_items;
CREATE POLICY "Insert order items" ON order_items FOR INSERT WITH CHECK (true);

-- Wishlist
DROP POLICY IF EXISTS "Users manage wishlist" ON wishlists;
CREATE POLICY "Users manage wishlist" ON wishlists FOR ALL USING (auth.uid() = user_id);

-- Cart
DROP POLICY IF EXISTS "Users manage carts" ON carts;
CREATE POLICY "Users manage carts" ON carts FOR ALL USING (auth.uid() = user_id OR session_id IS NOT NULL);
DROP POLICY IF EXISTS "Users manage cart items" ON cart_items;
CREATE POLICY "Users manage cart items" ON cart_items FOR ALL USING (true);

-- Admin Full Access Policies
DROP POLICY IF EXISTS "Admin full access categories" ON categories;
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access products" ON products;
CREATE POLICY "Admin full access products" ON products FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access variants" ON product_variants;
CREATE POLICY "Admin full access variants" ON product_variants FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access inventory" ON inventory_logs;
CREATE POLICY "Admin full access inventory" ON inventory_logs FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access coupons" ON coupons;
CREATE POLICY "Admin full access coupons" ON coupons FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access orders" ON orders;
CREATE POLICY "Admin full access orders" ON orders FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access order items" ON order_items;
CREATE POLICY "Admin full access order items" ON order_items FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access order history" ON order_status_history;
CREATE POLICY "Admin full access order history" ON order_status_history FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access payments" ON payments;
CREATE POLICY "Admin full access payments" ON payments FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access refunds" ON refunds;
CREATE POLICY "Admin full access refunds" ON refunds FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access returns" ON returns;
CREATE POLICY "Admin full access returns" ON returns FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access reviews" ON reviews;
CREATE POLICY "Admin full access reviews" ON reviews FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access banners" ON hero_banners;
CREATE POLICY "Admin full access banners" ON hero_banners FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access settings" ON store_settings;
CREATE POLICY "Admin full access settings" ON store_settings FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Admin full access audit" ON audit_logs;
CREATE POLICY "Admin full access audit" ON audit_logs FOR ALL USING (public.is_admin());

-- Newsletter
DROP POLICY IF EXISTS "Public insert newsletter" ON newsletter_subscribers;
CREATE POLICY "Public insert newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin read newsletter" ON newsletter_subscribers;
CREATE POLICY "Admin read newsletter" ON newsletter_subscribers FOR SELECT USING (public.is_admin());

-- 23. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);
-- ==============================================================================
-- Raveena Sarees - Migration 001: Security hardening (idempotent, safe to re-run)
-- Run in the Supabase SQL editor on existing databases.
-- ==============================================================================

-- 1. Never trust client-supplied metadata for the role (was: anyone could sign up as admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'customer'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Block role self-escalation. Only an existing admin (or the service role / SQL editor,
--    where auth.uid() IS NULL) may change a role.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.uid() IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Changing roles is not permitted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON profiles;
CREATE TRIGGER profiles_prevent_role_escalation
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. Profiles: own row (or admin) only; previously every profile (email, phone) was public
DROP POLICY IF EXISTS "Public read minimal profiles" ON profiles;
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Orders are only created server-side with the service role; remove open insert policies
DROP POLICY IF EXISTS "Insert orders" ON orders;
DROP POLICY IF EXISTS "Insert order items" ON order_items;

-- 5. Carts: owner only (cart_items inherit ownership from carts)
DROP POLICY IF EXISTS "Users manage carts" ON carts;
DROP POLICY IF EXISTS "Users manage carts" ON carts;
CREATE POLICY "Users manage carts" ON carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage cart items" ON cart_items;
DROP POLICY IF EXISTS "Users manage cart items" ON cart_items;
CREATE POLICY "Users manage cart items" ON cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
);

-- 6. Reviews: must be the author and start as pending (moderated)
DROP POLICY IF EXISTS "Users insert reviews" ON reviews;
DROP POLICY IF EXISTS "Users insert reviews" ON reviews;
CREATE POLICY "Users insert reviews" ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');
ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE reviews ALTER COLUMN is_verified_purchase SET DEFAULT FALSE;

-- 7. Coupons: codes are no longer publicly listable; validation happens server-side
DROP POLICY IF EXISTS "Public read coupons" ON coupons;

-- 8. Newsletter: insert-only already; keep.
-- ==============================================================================
-- Raveena Sarees - Migration 002: Product images (Supabase Storage) + Featured Festive Drops
-- Idempotent. Run in the Supabase SQL editor AFTER 001_security_hardening.sql.
-- ==============================================================================

-- 1. PRODUCT IMAGES ------------------------------------------------------------
-- storage_path is NULL only for legacy images that are served from /public (starter catalogue).
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    storage_path TEXT UNIQUE,
    public_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    mime_type VARCHAR(50),
    file_size INT,
    width INT,
    height INT,
    original_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON product_images (product_id, display_order);
-- At most one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_one_primary ON product_images (product_id) WHERE is_primary;

DROP TRIGGER IF EXISTS product_images_updated_at ON product_images;
CREATE TRIGGER product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product images" ON product_images;
DROP POLICY IF EXISTS "Public read product images" ON product_images;
CREATE POLICY "Public read product images" ON product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access product images" ON product_images;
DROP POLICY IF EXISTS "Admin full access product images" ON product_images;
CREATE POLICY "Admin full access product images" ON product_images FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. FEATURED FESTIVE DROPS (exactly two slots) --------------------------------
-- PRIMARY KEY on slot + CHECK (1,2) caps the table at two rows; UNIQUE(product_id) prevents duplicates.
CREATE TABLE IF NOT EXISTS featured_drops (
    slot SMALLINT PRIMARY KEY CHECK (slot IN (1, 2)),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE featured_drops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read featured drops" ON featured_drops;
DROP POLICY IF EXISTS "Public read featured drops" ON featured_drops;
CREATE POLICY "Public read featured drops" ON featured_drops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access featured drops" ON featured_drops;
DROP POLICY IF EXISTS "Admin full access featured drops" ON featured_drops;
CREATE POLICY "Admin full access featured drops" ON featured_drops FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Atomic save: replaces both slots in one transaction. Callable only with the service role
-- (the Next.js server action verifies the caller is an admin before calling it).
CREATE OR REPLACE FUNCTION public.save_featured_drops(p_slot1 UUID, p_slot2 UUID, p_user UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF p_slot1 IS NOT NULL AND p_slot1 = p_slot2 THEN
        RAISE EXCEPTION 'The two featured products must be different';
    END IF;
    DELETE FROM featured_drops WHERE slot IN (1, 2);
    IF p_slot1 IS NOT NULL THEN
        INSERT INTO featured_drops (slot, product_id, updated_by) VALUES (1, p_slot1, p_user);
    END IF;
    IF p_slot2 IS NOT NULL THEN
        INSERT INTO featured_drops (slot, product_id, updated_by) VALUES (2, p_slot2, p_user);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_featured_drops(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_featured_drops(UUID, UUID, UUID) TO service_role;

-- 3. STORAGE BUCKET: product-images ---------------------------------------------
-- Public read through the CDN (no listing); writes only via the service role on the server,
-- plus an explicit admin-only policy as defence in depth. Customers get no write/delete access.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins manage product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage product images" ON storage.objects;
CREATE POLICY "Admins manage product images" ON storage.objects FOR ALL
    USING (bucket_id = 'product-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
-- ==============================================================================
-- Raveena Sarees - Migration 003: Order status lifecycle + structured addresses
-- Idempotent. Run in the Supabase SQL editor AFTER 002.
-- ==============================================================================

-- 1. ORDER STATUSES (database-backed lifecycle)
--    pending = awaiting payment, confirmed = paid
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (order_status IN (
    'pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered',
    'cancelled', 'return_requested', 'returned', 'refund_processing', 'refunded'
));

-- 2. STRUCTURED SAVED ADDRESSES
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS house_number VARCHAR(100);
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS locality VARCHAR(150);
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(10) NOT NULL DEFAULT 'home';
ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_address_type_check;
ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_address_type_check CHECK (address_type IN ('home', 'office', 'other'));

-- Repair legacy data so the one-default rule can be enforced: keep only the newest default per user
UPDATE user_addresses a SET is_default = FALSE
WHERE is_default AND EXISTS (
    SELECT 1 FROM user_addresses b
    WHERE b.user_id = a.user_id AND b.is_default AND (b.created_at, b.id) > (a.created_at, a.id)
);
-- Exactly one default address per customer
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_default_address ON user_addresses (user_id) WHERE is_default;

-- 3. CONTACT MESSAGES (the public contact form is saved here; read them in Supabase until the support-ticket dashboard ships)
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created ON contact_messages (email, created_at DESC);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access contact messages" ON contact_messages;
CREATE POLICY "Admin full access contact messages" ON contact_messages FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No public policy: inserts happen only through the server action using the service role.

-- ==============================================================================
-- Raveena Sarees - Migration 004: Shiprocket fulfillment, email outbox, profile/role repair
-- Idempotent (safe to re-run). Run in the Supabase SQL editor AFTER 001, 002 and 003.
-- Nothing here deletes existing rows.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES / ROLES
--    Every auth user must have a profiles row: the server reads the role ONLY from
--    profiles.role (never from user-editable metadata).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'customer'   -- never trust client-supplied metadata for the role
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for auth users created while the trigger was missing
INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
       COALESCE(u.raw_user_meta_data->>'phone', ''),
       'customer'
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Promote accounts that were made admin through Supabase *app* metadata
-- (raw_app_meta_data is only writable with the service role, unlike user metadata).
-- To add/remove an admin later:  UPDATE profiles SET role = 'admin' | 'customer' WHERE email = '...';
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE u.id = p.id
  AND u.raw_app_meta_data->>'role' = 'admin'
  AND p.role IS DISTINCT FROM 'admin';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'staff')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Role changes: only an existing admin (or the service role / SQL editor) may change a role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.uid() IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Changing roles is not permitted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON profiles;
CREATE TRIGGER profiles_prevent_role_escalation
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- A customer may never insert their own profile with an elevated role
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id AND role = 'customer');

-- ------------------------------------------------------------------------------
-- 2. ORDERS: Shiprocket fulfillment fields
--    order_number (e.g. RVN-2026-123456) is sent to Shiprocket as the merchant order_id.
--    Displayed courier/AWB stay in courier_partner / tracking_number / tracking_url.
-- ------------------------------------------------------------------------------
ALTER TABLE orders ALTER COLUMN courier_partner DROP DEFAULT;   -- was a fake 'BlueDart Express' default
UPDATE orders SET courier_partner = NULL WHERE tracking_number IS NULL AND courier_partner = 'BlueDart Express';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_awb VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_courier_id INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_status VARCHAR(100);          -- raw Shiprocket label, e.g. 'IN TRANSIT'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_status_code INT;              -- raw Shiprocket status id
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(50);             -- normalised (see src/lib/shipping/status.ts)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_status VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_error_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_operation VARCHAR(30);       -- last attempted step
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_locked_until TIMESTAMP WITH TIME ZONE;  -- lease: one worker at a time
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_next_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_tracking_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check CHECK (fulfillment_status IS NULL OR fulfillment_status IN (
    'pending', 'processing', 'order_created', 'awb_assigned', 'pickup_scheduled', 'failed', 'cancelled'
));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pickup_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_pickup_status_check CHECK (pickup_status IS NULL OR pickup_status IN (
    'pending', 'scheduled', 'picked_up', 'failed'
));

-- One Shiprocket order / shipment / AWB can only ever belong to one Raveena order
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_shiprocket_order_id ON orders (shiprocket_order_id) WHERE shiprocket_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_shiprocket_shipment_id ON orders (shiprocket_shipment_id) WHERE shiprocket_shipment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_shiprocket_awb ON orders (shiprocket_awb) WHERE shiprocket_awb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_retry ON orders (fulfillment_status, fulfillment_next_retry_at)
    WHERE fulfillment_status IN ('pending', 'failed', 'order_created', 'awb_assigned', 'processing');
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- One payment row per Razorpay payment (client verification and webhook can both arrive)
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_razorpay_payment_id ON payments (razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. SHIPMENT TRACKING EVENTS (courier scans, shown to the customer)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    awb VARCHAR(100),
    status_label VARCHAR(150),
    activity TEXT,
    location VARCHAR(255),
    event_time TIMESTAMP WITH TIME ZONE,
    raw_time VARCHAR(50),
    source VARCHAR(20) NOT NULL DEFAULT 'webhook' CHECK (source IN ('webhook', 'api')),
    dedupe_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order_time ON shipment_tracking_events (order_id, event_time DESC);
ALTER TABLE shipment_tracking_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own tracking events" ON shipment_tracking_events;
CREATE POLICY "Users read own tracking events" ON shipment_tracking_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = shipment_tracking_events.order_id AND (o.user_id = auth.uid() OR public.is_admin()))
);
-- Writes only through the server (service role)

-- ------------------------------------------------------------------------------
-- 4. SHIPPING WEBHOOK EVENTS (idempotency + audit for Shiprocket deliveries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(30) NOT NULL DEFAULT 'shiprocket',
    dedupe_key VARCHAR(128) NOT NULL UNIQUE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    order_number VARCHAR(50),
    awb VARCHAR(100),
    status_label VARCHAR(150),
    status_code INT,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
    error TEXT,
    attempts INT NOT NULL DEFAULT 0,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_shipping_webhook_events_status ON shipping_webhook_events (status, received_at);
CREATE INDEX IF NOT EXISTS idx_shipping_webhook_events_order ON shipping_webhook_events (order_id);
ALTER TABLE shipping_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read shipping webhook events" ON shipping_webhook_events;
CREATE POLICY "Admin read shipping webhook events" ON shipping_webhook_events FOR SELECT USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. EMAIL EVENTS (transactional email outbox: one row per logical email, never sent twice)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_key VARCHAR(200) NOT NULL UNIQUE,     -- e.g. 'order_confirmation:<order uuid>'
    template VARCHAR(50) NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,  -- template data snapshot (re-rendered on retry)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    provider_message_id VARCHAR(100),
    locked_until TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_email_events_status_retry ON email_events (status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_email_events_order ON email_events (order_id);
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read email events" ON email_events;
CREATE POLICY "Admin read email events" ON email_events FOR SELECT USING (public.is_admin());
-- The offer popup is stored in the existing store_settings table (key 'offer_popup'); no change needed.

-- ==============================================================================
-- 007. SUPPORT TICKETS + CONTACT INBOX (identical to supabase_migrations/007_support_tickets_and_contact_inbox.sql)
-- ==============================================================================
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONTACT MESSAGES: richer admin workflow (new -> read -> replied -> closed)
-- ------------------------------------------------------------------------------
ALTER TABLE contact_messages DROP CONSTRAINT IF EXISTS contact_messages_status_check;
UPDATE contact_messages SET status = 'read'   WHERE status = 'in_progress';
UPDATE contact_messages SET status = 'closed' WHERE status = 'resolved';
ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_status_check
    CHECK (status IN ('new', 'read', 'replied', 'closed'));

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT;
-- Keyed hash of the sender's IP (never the raw IP) used only for abuse rate-limiting
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);
-- Client-generated token: a double-click / retry / second tab can never create a duplicate row
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS submission_token VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_messages_token ON contact_messages (submission_token) WHERE submission_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_created ON contact_messages (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. SUPPORT TICKETS (customer queries raised from the account area)
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1001;

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE DEFAULT ('TKT-' || lpad(nextval('support_ticket_seq')::text, 6, '0')),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- Snapshot so the ticket stays readable (and can be anonymised) independently of the account
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('order', 'product', 'payment', 'delivery', 'return_refund', 'account', 'other')),
    subject VARCHAR(150) NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    order_number VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
    submission_token VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_tickets_token ON support_tickets (user_id, submission_token) WHERE submission_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets (category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets (order_id) WHERE order_id IS NOT NULL;

-- Conversation: customer messages and admin replies (visible to the customer)
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_role VARCHAR(10) NOT NULL CHECK (author_role IN ('customer', 'admin')),
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    submission_token VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_messages_token ON support_ticket_messages (ticket_id, submission_token) WHERE submission_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_ticket_messages (ticket_id, created_at);

-- Internal notes: staff only. A separate table so a customer query can never return them.
CREATE TABLE IF NOT EXISTS support_ticket_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_notes_ticket ON support_ticket_notes (ticket_id, created_at);

-- Audit trail: who did what and when (staff only)
CREATE TABLE IF NOT EXISTS support_ticket_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(10) NOT NULL CHECK (actor_role IN ('customer', 'admin', 'staff', 'system')),
    action VARCHAR(40) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_events_ticket ON support_ticket_events (ticket_id, created_at);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    Customers can READ their own tickets and the conversation. They cannot write or read notes/events directly:
--    every write goes through a server action that re-checks ownership with the service role.
-- ------------------------------------------------------------------------------
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tickets" ON support_tickets;
CREATE POLICY "Users read own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Admin manage tickets" ON support_tickets;
CREATE POLICY "Admin manage tickets" ON support_tickets FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own ticket messages" ON support_ticket_messages;
CREATE POLICY "Users read own ticket messages" ON support_ticket_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = support_ticket_messages.ticket_id AND (t.user_id = auth.uid() OR public.is_admin()))
);
DROP POLICY IF EXISTS "Admin manage ticket messages" ON support_ticket_messages;
CREATE POLICY "Admin manage ticket messages" ON support_ticket_messages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage ticket notes" ON support_ticket_notes;
CREATE POLICY "Admin manage ticket notes" ON support_ticket_notes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin read ticket events" ON support_ticket_events;
CREATE POLICY "Admin read ticket events" ON support_ticket_events FOR SELECT USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. HOUSEKEEPING
-- ------------------------------------------------------------------------------
-- The old secondary notification address was removed from the business configuration. Drop the stale key from the
-- stored store_info setting (no other data is touched). Contact details now come from environment variables.
UPDATE store_settings SET value = value - 'info_email' WHERE key = 'store_info' AND value ? 'info_email';

-- Account deletion unlinks the customer from retained order records through the existing
-- ON DELETE SET NULL foreign keys (orders, coupon_usages, returns, audit_logs). Nothing else to migrate.
