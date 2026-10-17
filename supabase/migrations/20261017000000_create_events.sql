-- Migration: Create events table and automated monthly cleanup
-- Table structure: id, date (DATE), start_time, end_time, title, note, color, created_at

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    color TEXT DEFAULT '#f43f5e',
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index by date for high-performance week queries & cleanup
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous access (adjust according to project auth policies)
CREATE POLICY "Allow public read access to events"
    ON public.events FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to events"
    ON public.events FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update to events"
    ON public.events FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete to events"
    ON public.events FOR DELETE
    USING (true);

-- ==============================================================================
-- MONTH-END CLEANUP FUNCTION
-- Deletes all events from previous month except events in the straddling week.
-- Weeks run Sunday to Saturday. Cutoff is the Sunday on or before the 1st.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_month(today_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (cutoff_date DATE, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_of_month DATE;
    dow_first INT;
    calculated_cutoff DATE;
    rows_deleted BIGINT;
BEGIN
    -- 1st day of the current month
    first_of_month := DATE_TRUNC('month', today_date)::DATE;
    
    -- Day of week for the 1st (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    dow_first := EXTRACT(DOW FROM first_of_month)::INT;
    
    -- Sunday on or before the 1st
    calculated_cutoff := first_of_month - dow_first;
    
    -- Delete older events
    WITH deleted_rows AS (
        DELETE FROM public.events
        WHERE date < calculated_cutoff
        RETURNING id
    )
    SELECT COUNT(*) INTO rows_deleted FROM deleted_rows;
    
    RETURN QUERY SELECT calculated_cutoff, rows_deleted;
END;
$$;

-- ==============================================================================
-- SCHEDULED JOB (pg_cron)
-- Runs daily at 00:05 (5 0 * * *)
-- ==============================================================================
-- To activate in Supabase with pg_cron extension enabled:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'daily-month-end-cleanup',
--   '5 0 * * *',
--   $$SELECT public.cleanup_old_month(CURRENT_DATE);$$
-- );
