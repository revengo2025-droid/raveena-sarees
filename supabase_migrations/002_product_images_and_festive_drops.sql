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
CREATE POLICY "Public read product images" ON product_images FOR SELECT USING (true);
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
CREATE POLICY "Public read featured drops" ON featured_drops FOR SELECT USING (true);
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
CREATE POLICY "Admins manage product images" ON storage.objects FOR ALL
    USING (bucket_id = 'product-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
