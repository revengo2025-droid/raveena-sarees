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
