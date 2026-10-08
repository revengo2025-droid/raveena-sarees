-- ==============================================================================
-- Raveena Sarees - Migration 008: distributed rate limiting + tamper-resistant audit log
-- Idempotent. Run in the Supabase SQL editor AFTER 007.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RATE LIMITS (fixed window counters shared by every serverless instance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_hits (
    key TEXT NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_window ON rate_limit_hits (window_start);
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;  -- no policies: only the service role can touch it

-- Atomically counts one hit and says whether it is still within the limit.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(p_key TEXT, p_window_seconds INT, p_max INT)
RETURNS TABLE (allowed BOOLEAN, remaining INT, retry_after INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    w TIMESTAMP WITH TIME ZONE := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
    c INT;
BEGIN
    IF p_window_seconds < 1 OR p_max < 1 OR length(p_key) > 200 THEN
        RAISE EXCEPTION 'invalid rate limit arguments';
    END IF;
    INSERT INTO rate_limit_hits AS r (key, window_start, count) VALUES (p_key, w, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = r.count + 1
    RETURNING r.count INTO c;
    allowed := c <= p_max;
    remaining := GREATEST(p_max - c, 0);
    retry_after := GREATEST(CEIL(extract(epoch FROM (w + make_interval(secs => p_window_seconds) - now())))::INT, 1);
    RETURN NEXT;
END $$;

-- Housekeeping (called by the maintenance cron): windows older than a day are never read again.
CREATE OR REPLACE FUNCTION public.rate_limit_cleanup()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
    DELETE FROM rate_limit_hits WHERE window_start < now() - interval '1 day';
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup() TO service_role;

-- ------------------------------------------------------------------------------
-- 2. AUDIT LOG: append-only
--    Rows can never be edited or deleted, with one exception: the foreign key may blank `user_id` when an
--    account is deleted (ON DELETE SET NULL), which is exactly what privacy law asks for.
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read audit logs" ON audit_logs;
CREATE POLICY "Admin read audit logs" ON audit_logs FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.audit_logs_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.user_id IS NOT NULL AND NEW.user_id IS NULL
       AND (to_jsonb(NEW) - 'user_id') = (to_jsonb(OLD) - 'user_id') THEN
        RETURN NEW;  -- account deletion unlinking the actor
    END IF;
    RAISE EXCEPTION 'audit_logs is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON audit_logs;
CREATE TRIGGER trg_audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.audit_logs_append_only();
