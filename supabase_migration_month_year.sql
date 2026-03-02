-- 1. Add new columns
ALTER TABLE play_history
ADD COLUMN IF NOT EXISTS month integer,
ADD COLUMN IF NOT EXISTS year integer;

-- 2. Backfill existing data
-- Extract the month (1-12) and year from the played_at timestamp
UPDATE play_history
SET 
  month = EXTRACT(MONTH FROM played_at),
  year = EXTRACT(YEAR FROM played_at)
WHERE month IS NULL OR year IS NULL;

-- 3. Make columns not null moving forward (optional but recommended)
-- ALTER TABLE play_history ALTER COLUMN month SET NOT NULL;
-- ALTER TABLE play_history ALTER COLUMN year SET NOT NULL;

-- 4. Create an index to make our new capsule queries lightning fast
-- We query by user_id and then typically filter by year and month
CREATE INDEX IF NOT EXISTS idx_play_history_user_year_month 
ON play_history(user_id, year, month);
