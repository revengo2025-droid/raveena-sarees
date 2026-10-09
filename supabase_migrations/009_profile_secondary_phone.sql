-- Raveena Sarees - Migration 009: optional secondary mobile number on customer profiles
-- Customers can add a second 10-digit Indian mobile number in Profile & Settings; staff see it in the admin
-- Customers page and on support queries. The existing "Users update own profile" policy already limits who can
-- change it, and the role-escalation trigger is unaffected.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_phone varchar(10);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_secondary_phone_format') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_secondary_phone_format CHECK (secondary_phone IS NULL OR secondary_phone ~ '^[6-9][0-9]{9}$');
  END IF;
END $$;
