
-- Add order_number to sale_order_processes to allow custom ordering per sale order
ALTER TABLE sale_order_processes ADD COLUMN order_number INTEGER NOT NULL DEFAULT 0;

-- Update existing records to use the process's default order_number
UPDATE sale_order_processes sop
SET order_number = p.order_number
FROM processes p
WHERE sop.process_id = p.id;
