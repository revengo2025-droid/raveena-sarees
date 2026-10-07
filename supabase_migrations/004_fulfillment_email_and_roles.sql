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
