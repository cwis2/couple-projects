-- Plans app records, shared through the existing Supabase project.
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    plan_date DATE,
    categories TEXT[] NOT NULL DEFAULT '{}',
    scale TEXT,
    duration TEXT,
    energy TEXT,
    planning_required TEXT,
    location TEXT,
    social_size TEXT,
    weather TEXT,
    importance TEXT[] NOT NULL DEFAULT '{}',
    added_by TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Normal',
    status TEXT NOT NULL DEFAULT 'Idea',
    best_for TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_added_by ON public.plans (added_by);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to plans"
    ON public.plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert to plans"
    ON public.plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to plans"
    ON public.plans FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to plans"
    ON public.plans FOR DELETE USING (true);
