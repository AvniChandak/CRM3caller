-- Database Schema for Coaching CRM

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'caller')),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) configuration:
-- For simplicity, since the Node.js backend handles all access control, queries from the backend
-- will use the service_role key to bypass RLS, or you can run standard RLS policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    course VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'New' NOT NULL CHECK (status IN ('New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    revenue NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;



-- 5. Helper Policies for backend service role (bypasses RLS by default, but let's allow all actions for safety)
CREATE POLICY "Allow service role bypass" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role bypass" ON public.leads FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role bypass" ON public.activities FOR ALL TO service_role USING (true);


-- 6. Indices for optimization
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
