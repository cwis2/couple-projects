-- Migration: Create date_ideas table for the Date Randomizer app
-- Stores date ideas with optional filter tags (time, energy, vibe, etc.)

CREATE TABLE IF NOT EXISTS public.date_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    time_required TEXT,          -- '<30 min', '30-60 min', '1-2 hr', '2-4 hr', '4+ hr'
    energy_level TEXT,           -- 'Very Low', 'Low', 'Medium', 'High', 'Very High'
    focus_required TEXT,         -- 'None', 'Low', 'Medium', 'High'
    preparation_required TEXT,   -- 'None', 'Minimal', 'Moderate', 'Significant'
    vibe TEXT[],                 -- multi-select: 'Casual', 'Relaxing', 'Competitive', 'Cozy', 'New Experience'
    activity_type TEXT[],        -- multi-select: 'Movie/TV', 'Games', 'Learning'
    who_added TEXT,              -- 'cwis' or 'monokork'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_date_ideas_name ON public.date_ideas (name);
CREATE INDEX IF NOT EXISTS idx_date_ideas_who ON public.date_ideas (who_added);

-- Enable Row Level Security (RLS)
ALTER TABLE public.date_ideas ENABLE ROW LEVEL SECURITY;

-- Public access policies (same open pattern as events table)
CREATE POLICY "Allow public read access to date_ideas"
    ON public.date_ideas FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to date_ideas"
    ON public.date_ideas FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update to date_ideas"
    ON public.date_ideas FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete to date_ideas"
    ON public.date_ideas FOR DELETE
    USING (true);
