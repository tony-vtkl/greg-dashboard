-- Supabase Schema for Greg Dashboard
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- ============================================
-- 1. NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    note_type TEXT CHECK (note_type IN ('observation', 'insight', 'idea', 'question')),
    source TEXT DEFAULT 'Dashboard',
    tags TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (for anon key)
CREATE POLICY "Allow public access" ON notes FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. STANDUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS standups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE standups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON standups FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. STREAM ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stream_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stream_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON stream_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. TODOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS todos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON todos FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. MEAL CHECKLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meal_checklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON meal_checklist FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. KANBAN BOARDS (Generic structure)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board TEXT NOT NULL, -- 'family', 'health', 'marketing', 'meals', 'todos', 'workouts'
    column_id TEXT NOT NULL, -- 'backlog', 'doing', 'done', etc.
    item_id TEXT NOT NULL, -- Original item identifier
    position INTEGER DEFAULT 0,
    data JSONB NOT NULL, -- Full item data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board, item_id)
);

ALTER TABLE kanban_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON kanban_items FOR ALL USING (true) WITH CHECK (true);

-- Index for fast board queries
CREATE INDEX IF NOT EXISTS idx_kanban_board ON kanban_items(board);
CREATE INDEX IF NOT EXISTS idx_kanban_board_column ON kanban_items(board, column_id);

-- ============================================
-- DONE - Tables ready for dashboard migration
-- ============================================
