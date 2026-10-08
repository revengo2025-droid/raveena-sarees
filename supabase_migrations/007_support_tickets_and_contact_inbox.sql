-- ==============================================================================
-- Raveena Sarees - Migration 007: support tickets, contact inbox, account deletion support
-- Idempotent and non-destructive: safe to run more than once. Run in the Supabase SQL editor AFTER 006.
-- Existing contact_messages rows are kept; legacy statuses are mapped to the new ones.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONTACT MESSAGES: richer admin workflow (new -> read -> replied -> closed)
-- ------------------------------------------------------------------------------
-- Safety net: older databases that never ran migration 003 do not have this table yet.
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_created ON contact_messages (email, created_at DESC);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access contact messages" ON contact_messages;
CREATE POLICY "Admin full access contact messages" ON contact_messages FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

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
