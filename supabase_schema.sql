-- ==========================================================
-- WINRIDER.AI — Supabase.com Database Schema & Permissions
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Every new registered account defaults to citizen)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Firebase Auth UID or Supabase Auth UID
  uid TEXT UNIQUE NOT NULL,
  win_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen', -- 'citizen' (ผู้โดยสารทุกคน), 'knight', 'merchant', 'partner'
  enabled_roles TEXT[] NOT NULL DEFAULT ARRAY['citizen'], -- e.g. ['citizen', 'knight']
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  admin_level TEXT, -- 'super', 'reviewer', 'support'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_review', 'suspended'
  province TEXT,
  district TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on win_uid and email
CREATE INDEX IF NOT EXISTS idx_users_win_uid ON public.users(win_uid);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 3. Role Requests Table (เมื่อผู้โดยสารต้องการขอเพิ่มบทบาทเป็น พี่วิน / ร้านค้า / พาร์ทเนอร์)
CREATE TABLE IF NOT EXISTS public.role_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  win_uid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  target_role TEXT NOT NULL, -- 'knight', 'merchant', 'partner'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' (รออนุมัติ), 'approved', 'rejected'
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_uid ON public.role_requests(uid);

-- 4. Knights (พี่วิน / อัศวินไรเดอร์) Table
CREATE TABLE IF NOT EXISTS public.knights (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  win_uid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT DEFAULT 'motorcycle',
  plate_number TEXT,
  license_number TEXT,
  kyc_status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
  is_online BOOLEAN DEFAULT FALSE,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating DOUBLE PRECISION DEFAULT 5.0,
  completed_jobs INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Citizens (ผู้โดยสาร / พลเมือง) Table
CREATE TABLE IF NOT EXISTS public.citizens (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  win_uid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  saved_addresses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Merchants (ร้านค้าพันธมิตร) Table
CREATE TABLE IF NOT EXISTS public.merchants (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  win_uid TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  shop_type TEXT,
  address TEXT,
  tax_id TEXT,
  gp_rate NUMERIC(5,2) DEFAULT 10.00,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Partners (องค์กรพาร์ทเนอร์) Table
CREATE TABLE IF NOT EXISTS public.partners (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  win_uid TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT,
  contact_person TEXT,
  estimated_users INT DEFAULT 100,
  gp_rate NUMERIC(5,2) DEFAULT 10.00,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Rides & Delivery Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  service_title TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'ride',
  status TEXT NOT NULL DEFAULT 'searching', -- 'searching', 'driver_assigned', 'in_transit', 'completed', 'cancelled'
  passenger_uid TEXT NOT NULL,
  passenger_name TEXT,
  passenger_phone TEXT,
  driver_uid TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  pickup_name TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_name TEXT,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  distance_km NUMERIC(6,2),
  fare_baht NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_passenger ON public.orders(passenger_uid);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(driver_uid);

-- 9. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  uid TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  balance_satang BIGINT NOT NULL DEFAULT 0,
  locked_satang BIGINT NOT NULL DEFAULT 0,
  pending_satang BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  actor_uid TEXT NOT NULL,
  action TEXT NOT NULL,
  target_uid TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Row Level Security (RLS) Configuration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Allow public read of active merchants & knights (for maps & ordering)
CREATE POLICY "Public read knights" ON public.knights FOR SELECT USING (true);
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users view own role requests" ON public.role_requests FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON public.role_requests FOR ALL USING (true);
CREATE POLICY "Users insert role request" ON public.role_requests FOR INSERT WITH CHECK (true);
