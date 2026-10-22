-- ==============================================================================
-- SKEMA DATABASE SUPABASE: SISTEM QC CIWANDAN ADM
-- Jalankan seluruh script SQL ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabel Sesi Kerja Shift & Grid Analisa (TM & VRM)
CREATE TABLE IF NOT EXISTS qc_sessions (
    session_id TEXT PRIMARY KEY,               -- Contoh: '2026-10-22_SHIFT 2'
    date TEXT NOT NULL,                        -- Format 'YYYY-MM-DD'
    shift_name TEXT NOT NULL,                  -- 'SHIFT 1', 'SHIFT 2', 'SHIFT 3', 'NON-SHIFT'
    shift_hours TEXT,
    analyst_name TEXT,
    session_data JSONB NOT NULL,               -- Data lengkap (TM, VRM, Incoming, CP, Proporsi)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Master Target Dry Proporsi (TM & VRM)
CREATE TABLE IF NOT EXISTS master_targets (
    id TEXT PRIMARY KEY DEFAULT 'current',
    targets_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Master Spesifikasi Quality Mutu Lab (Blaine, R45, H2O, SO3, FCaO)
CREATE TABLE IF NOT EXISTS quality_specs (
    id TEXT PRIMARY KEY DEFAULT 'current',
    specs_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Master Setting CGA (Grinding Aid)
CREATE TABLE IF NOT EXISTS cga_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    settings_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Daftar Produk Semen Aktif
CREATE TABLE IF NOT EXISTS product_list (
    id TEXT PRIMARY KEY DEFAULT 'current',
    products_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Akun & PIN Pengguna (Analis & Supervisor SI)
CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'analyst',
    pin TEXT NOT NULL,
    avatar_color TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- KEBIJAKAN AKSES (Row Level Security / RLS)
-- Mengizinkan pembacaan dan penyimpanan data oleh aplikasi QC Lab
-- ==============================================================================

ALTER TABLE qc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cga_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Penuh qc_sessions" ON qc_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh master_targets" ON master_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh quality_specs" ON quality_specs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh cga_settings" ON cga_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh product_list" ON product_list FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh user_accounts" ON user_accounts FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- AKTIFKAN FITUR REALTIME SUPABASE
-- Sinkronisasi instan data shift dan master ke semua perangkat (PC & HP Analis)
-- ==============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE qc_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE master_targets;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_specs;
ALTER PUBLICATION supabase_realtime ADD TABLE cga_settings;
