-- Raveena Sarees - Migration 005: provision the dedicated admin role
-- Run this AFTER creating the account in Supabase Authentication.
-- This migration never stores or changes a password. Passwords belong only to
-- Supabase Auth and must be managed from the Supabase dashboard.

INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', ''),
       COALESCE(u.raw_user_meta_data->>'phone', ''),
       'admin'
FROM auth.users u
WHERE lower(u.email) = lower('revengo2025@gmail.com')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = 'admin';
