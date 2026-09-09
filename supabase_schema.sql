-- ==============================================================================
-- Ravina Sarees - Supabase PostgreSQL Database Schema
-- Brand: Ravina Sarees (ravinasarees.in) | Location: Hyderabad, India
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    banner_url TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE (Sarees Collection)
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
    rating NUMERIC(2, 1) DEFAULT 4.9,
    review_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. USERS / PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SAVED ADDRESSES TABLE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    shipping_address JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    shipping_fee NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'razorpay', 'upi', 'card', 'netbanking', 'cod'
    payment_status VARCHAR(50) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id VARCHAR(100),
    order_status VARCHAR(50) DEFAULT 'confirmed' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')),
    courier_partner VARCHAR(100) DEFAULT 'BlueDart Express',
    tracking_number VARCHAR(100),
    tracking_url TEXT,
    gift_wrap BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    applied_coupon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    selected_color VARCHAR(50),
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. COUPONS TABLE
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

-- 8. PRODUCT REVIEWS TABLE
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

-- 9. HERO BANNERS & PROMOS TABLE
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

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- Public can read products, categories, reviews, hero banners, active coupons
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read active banners" ON hero_banners FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = true);

-- Authenticated Users can manage their own profiles, addresses, orders, reviews
CREATE POLICY "Users view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own addresses" ON user_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own addresses" ON user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own addresses" ON user_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own addresses" ON user_addresses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert orders" ON orders FOR INSERT WITH CHECK (true);

-- Admin policies (Admins have full access)
CREATE POLICY "Admin full access products" ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin full access categories" ON categories FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin full access orders" ON orders FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin full access coupons" ON coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin full access reviews" ON reviews FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admin full access banners" ON hero_banners FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ==============================================================================
-- 11. SAMPLE SEED INSERT FOR TURQUOISE BLUE TISSUE SILVER ZARIWORK SAREE
-- ==============================================================================
-- INSERT INTO products (
--     sku, name, slug, category_name, description, price, discount_price, stock,
--     fabric, zari_type, weave_type, saree_length, blouse_included, blouse_length,
--     occasion, primary_color, available_colors, images, rating, review_count, is_featured, is_bestseller, is_new_arrival
-- ) VALUES (
--     'RAV-TIS-009',
--     'Turquoise Blue Tissue Silver Zariwork Saree With Matching Blouse Piece',
--     'turquoise-blue-tissue-silver-zariwork-saree-with-matching-blouse-piece',
--     'Party Wear Sarees',
--     'An enchanting turquoise blue tissue saree featuring shimmering metallic weave adorned with exquisite silver zari floral bootis and an ornate scalloped zari embroidered border. Accompanied by a coordinated matching unstitched blouse piece.',
--     2990.00,
--     1794.00,
--     15,
--     'Pure Metallic Tissue Sheer Silk Blend',
--     'Intricate Silver Zari & Scalloped Resham Border',
--     'Luminescent Tissue Jacquard Weave',
--     '5.5 Meters',
--     TRUE,
--     '0.80 Meters (Turquoise Blue with Silver Zari Border)',
--     'Party Wear / Festive / Reception',
--     'Turquoise Blue',
--     ARRAY['Turquoise Blue', 'Aqua Marine', 'Sky Cyan'],
--     ARRAY['/images/products/turquoise-tissue-1.jpg', '/images/products/turquoise-tissue-2.jpg', '/images/products/turquoise-tissue-3.jpg'],
--     4.9,
--     42,
--     TRUE,
--     TRUE,
-- INSERT INTO products (
--     sku, name, slug, category_name, description, price, discount_price, stock,
--     fabric, zari_type, weave_type, saree_length, blouse_included, blouse_length,
--     occasion, primary_color, available_colors, images, rating, review_count, is_featured, is_bestseller, is_new_arrival
-- ) VALUES (
--     'RAV-SLK-010',
--     'Rani Pink Soft Silk Saree with Rich Silver Zari Pallu & Floral Jaal',
--     'rani-pink-soft-silk-saree-rich-silver-zari-pallu-floral-jaal',
--     'Silk Sarees',
--     'A breathtaking Rani Pink soft silk saree showcasing a glorious all-over silver zari floral jaal body and a heavy contrasting zari pallu finished with handcrafted artisanal tassels. Comes with a matching unstitched blouse piece.',
--     3490.00,
--     1949.00,
--     12,
--     'Pure Litchi Soft Silk',
--     'Intricate Silver & Light Gold Dual Zari Weave',
--     'Jacquard Floral Jaal with Tassel Pallu',
--     '5.5 Meters',
--     TRUE,
--     '0.80 Meters (Matching Rani Pink Brocade Silk)',
--     'Wedding / Grand Festive / Reception',
--     'Rani Pink',
--     ARRAY['Rani Pink', 'Ruby Rose', 'Magenta'],
--     ARRAY['/images/products/rani-pink-silk-1.jpg', '/images/products/rani-pink-silk-2.jpg', '/images/products/rani-pink-silk-3.jpg', '/images/products/rani-pink-silk-4.jpg', '/images/products/rani-pink-silk-5.jpg'],
--     5.0,
--     38,
--     TRUE,
--     TRUE,
--     TRUE
-- );

