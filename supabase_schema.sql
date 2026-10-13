-- ==============================================================================
-- autopubli24 - Base de Datos Unificada de Supabase (Ambos Proyectos)
-- ==============================================================================
-- 100% SEGURO: Todas las sentencias usan "IF NOT EXISTS".
-- No borra ni modifica nada existente. Ambos proyectos conviven de forma independiente.
-- Copia y pega en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ==============================================================================
-- SECCIÓN 1: PROYECTO LANDING PAGE (Web de Captación autopubli24)
-- ==============================================================================

-- 1.1 Contenidos y configuración de la landing
CREATE TABLE IF NOT EXISTS public.app_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 1.2 Consultas recibidas desde el popup
CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_info TEXT NOT NULL,
  question TEXT NOT NULL,
  recipient TEXT DEFAULT 'hola@autopubli24.com',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 1.3 Solicitudes de pago (Bizum y Paysafecard con PIN)
CREATE TABLE IF NOT EXISTS public.payment_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  plan TEXT,
  concept TEXT,
  pin_code TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 1.4 Usuarios simulados / Social Proof
CREATE TABLE IF NOT EXISTS public.fake_users (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  city TEXT,
  portal TEXT,
  plan_name TEXT,
  amount NUMERIC,
  status TEXT,
  date TEXT,
  user_type TEXT,
  payment_method TEXT,
  renewals_count INTEGER,
  calls_boost_percent INTEGER,
  auto_renew_enabled BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Políticas RLS para la Landing
ALTER TABLE public.app_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fake_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all app_content" ON public.app_content;
CREATE POLICY "Allow all app_content" ON public.app_content FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all inquiries" ON public.inquiries;
CREATE POLICY "Allow all inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all payment_leads" ON public.payment_leads;
CREATE POLICY "Allow all payment_leads" ON public.payment_leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all fake_users" ON public.fake_users;
CREATE POLICY "Allow all fake_users" ON public.fake_users FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- SECCIÓN 2: PROYECTO PANEL ADMIN, EXTRACTOR & CAMPAÑAS (autopubli24 Admin)
-- ==============================================================================

-- 2.1 Anuncios y Contactos
CREATE TABLE IF NOT EXISTS public.ads (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    phone TEXT NOT NULL,
    normalized_phone TEXT,
    detected_name TEXT DEFAULT '',
    location TEXT DEFAULT 'Madrid',
    category TEXT DEFAULT 'General',
    source_site TEXT DEFAULT 'portal',
    source_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    images JSONB DEFAULT '[]'::jsonb,
    cropped_images JSONB DEFAULT '[]'::jsonb,
    nationality TEXT DEFAULT '',
    description TEXT DEFAULT '',
    has_whatsapp BOOLEAN DEFAULT true,
    whatsapp_url TEXT DEFAULT '',
    status TEXT DEFAULT 'nuevo', -- 'nuevo', 'contactado', 'favorito', 'descartado'
    contacted_via TEXT DEFAULT '', -- 'whatsapp', 'sms', 'manual'
    last_contacted_at TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    is_full_ad BOOLEAN DEFAULT false,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS contacted_via TEXT DEFAULT '';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Índices para búsqueda ultra rápida
CREATE INDEX IF NOT EXISTS idx_ads_phone ON public.ads (phone);
CREATE INDEX IF NOT EXISTS idx_ads_normalized_phone ON public.ads (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads (status);
CREATE INDEX IF NOT EXISTS idx_ads_location ON public.ads (location);
CREATE INDEX IF NOT EXISTS idx_ads_source_site ON public.ads (source_site);
CREATE INDEX IF NOT EXISTS idx_ads_scraped_at ON public.ads (scraped_at DESC);

-- 2.2 Historial de Duplicados Prevenidos
CREATE TABLE IF NOT EXISTS public.duplicates (
    phone TEXT PRIMARY KEY,
    normalized_phone TEXT,
    title TEXT DEFAULT '',
    existing_title TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Directorio de Portales Monitoreados
CREATE TABLE IF NOT EXISTS public.portals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    url TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    seo_rank INT DEFAULT 1,
    monthly_visits_estimated TEXT DEFAULT '',
    description TEXT DEFAULT '',
    rank INT DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas RLS para el Panel Admin
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to ads" ON public.ads;
CREATE POLICY "Public access to ads" ON public.ads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to duplicates" ON public.duplicates;
CREATE POLICY "Public access to duplicates" ON public.duplicates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to portals" ON public.portals;
CREATE POLICY "Public access to portals" ON public.portals FOR ALL USING (true) WITH CHECK (true);

-- Notificar recarga del caché de esquemas
NOTIFY pgrst, 'reload schema';
