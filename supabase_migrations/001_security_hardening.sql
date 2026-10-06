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
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Orders are only created server-side with the service role; remove open insert policies
DROP POLICY IF EXISTS "Insert orders" ON orders;
DROP POLICY IF EXISTS "Insert order items" ON order_items;

-- 5. Carts: owner only (cart_items inherit ownership from carts)
DROP POLICY IF EXISTS "Users manage carts" ON carts;
CREATE POLICY "Users manage carts" ON carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage cart items" ON cart_items;
CREATE POLICY "Users manage cart items" ON cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
);

-- 6. Reviews: must be the author and start as pending (moderated)
DROP POLICY IF EXISTS "Users insert reviews" ON reviews;
CREATE POLICY "Users insert reviews" ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');
ALTER TABLE reviews ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE reviews ALTER COLUMN is_verified_purchase SET DEFAULT FALSE;

-- 7. Coupons: codes are no longer publicly listable; validation happens server-side
DROP POLICY IF EXISTS "Public read coupons" ON coupons;

-- 8. Newsletter: insert-only already; keep.
