-- Remove the unique constraint that prevents multiple entries per day
-- This allows multiple workers to log progress for the same size/process on the same day
ALTER TABLE progress_entries 
DROP CONSTRAINT IF EXISTS progress_entries_product_size_id_process_id_entry_date_key;