-- ==============================================================================
-- Raveena Sarees - Migration 010: Admin-managed homepage hero banners
-- Idempotent. Run in the Supabase SQL editor (after 002, which defines is_admin() and the updated_at trigger).
-- Up to FIVE banners; the storefront reads only the active ones and falls back to the built-in banners when none exist.
-- ==============================================================================

-- 1. TABLE ---------------------------------------------------------------------
-- position is 1..5 and UNIQUE, which is what caps the table at five rows (a sixth insert has no free position).
-- The unique constraint is DEFERRABLE so a reorder can swap positions inside one transaction.
CREATE TABLE IF NOT EXISTS homepage_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 5),
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 200),
    -- Internal path only (starts with a single "/"), so a banner can never send visitors to an arbitrary site
    link_url TEXT NOT NULL DEFAULT '/shop' CHECK (char_length(link_url) <= 200 AND link_url ~ '^/([^/]|$)'),
    button_text TEXT CHECK (button_text IS NULL OR char_length(button_text) <= 40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    width INT,
    height INT,
    file_size INT,
    original_filename TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_homepage_banners_position UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

DROP TRIGGER IF EXISTS homepage_banners_updated_at ON homepage_banners;
CREATE TRIGGER homepage_banners_updated_at
    BEFORE UPDATE ON homepage_banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
-- The public storefront can see active banners only; hidden ones stay private to admins.
DROP POLICY IF EXISTS "Public read active hero banners" ON homepage_banners;
CREATE POLICY "Public read active hero banners" ON homepage_banners FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Admin full access hero banners" ON homepage_banners;
CREATE POLICY "Admin full access hero banners" ON homepage_banners FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. ORDER FUNCTION ------------------------------------------------------------
-- Atomically renumbers banners 1..n in the order given. Banners missing from the list keep their relative order
-- after the listed ones, and unknown / duplicate ids are ignored, so positions are always contiguous 1..n.
-- Passing an empty array simply closes any gap (used after a delete). Service role only: the Next.js server
-- action verifies the caller is an admin before calling it.
CREATE OR REPLACE FUNCTION public.save_homepage_banner_order(p_ids UUID[] DEFAULT '{}')
RETURNS VOID AS $$
BEGIN
    WITH given AS (
        SELECT DISTINCT ON (t.id) t.id, t.ord
        FROM unnest(COALESCE(p_ids, '{}'::uuid[])) WITH ORDINALITY AS t(id, ord)
        JOIN homepage_banners h ON h.id = t.id
        ORDER BY t.id, t.ord
    ),
    given_ranked AS (
        SELECT id, row_number() OVER (ORDER BY ord) AS rn FROM given
    ),
    rest AS (
        SELECT h.id, (SELECT count(*) FROM given) + row_number() OVER (ORDER BY h.position, h.created_at) AS rn
        FROM homepage_banners h
        WHERE h.id NOT IN (SELECT id FROM given)
    ),
    merged AS (
        SELECT id, rn FROM given_ranked
        UNION ALL
        SELECT id, rn FROM rest
    )
    UPDATE homepage_banners b SET position = m.rn::smallint FROM merged m WHERE b.id = m.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_homepage_banner_order(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_homepage_banner_order(UUID[]) TO service_role;

-- 3. STORAGE BUCKET: hero-banners ------------------------------------------------
-- Public read through the CDN (no listing); writes only via the service role on the server, plus an explicit
-- admin-only policy as defence in depth. Customers get no write/delete access.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hero-banners', 'hero-banners', TRUE, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins manage hero banners" ON storage.objects;
CREATE POLICY "Admins manage hero banners" ON storage.objects FOR ALL
    USING (bucket_id = 'hero-banners' AND public.is_admin())
    WITH CHECK (bucket_id = 'hero-banners' AND public.is_admin());
