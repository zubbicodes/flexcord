-- Create sale_orders table
CREATE TABLE public.sale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sale_orders
ALTER TABLE public.sale_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on sale_orders"
  ON public.sale_orders FOR ALL USING (true) WITH CHECK (true);

-- Insert the two sale orders
INSERT INTO public.sale_orders (name, color) VALUES
('Navy Order', 'Navy'),
('Oat Milk Order', 'Oat Milk');

-- Drop the unique constraint on sr_number
ALTER TABLE public.product_sizes 
DROP CONSTRAINT product_sizes_sr_number_key;

-- Add sale_order_id to product_sizes
ALTER TABLE public.product_sizes 
ADD COLUMN sale_order_id UUID REFERENCES public.sale_orders(id) ON DELETE CASCADE;

-- Update existing product_sizes to belong to Navy order
UPDATE public.product_sizes 
SET sale_order_id = (SELECT id FROM public.sale_orders WHERE name = 'Navy Order');

-- Make sale_order_id NOT NULL after updating existing records
ALTER TABLE public.product_sizes 
ALTER COLUMN sale_order_id SET NOT NULL;

-- Add unique constraint for sr_number per sale_order
ALTER TABLE public.product_sizes 
ADD CONSTRAINT product_sizes_sr_number_sale_order_key UNIQUE (sr_number, sale_order_id);

-- Insert Oat Milk order sizes (same sizes, different quantities for now)
INSERT INTO public.product_sizes (sr_number, finished_size_inch, finished_size_cm, elastic_inch, elastic_inch_value, elastic_cm, tipping_cord_size, quantity, sale_order_id) 
SELECT 
  sr_number, 
  finished_size_inch, 
  finished_size_cm, 
  elastic_inch, 
  elastic_inch_value, 
  elastic_cm, 
  tipping_cord_size, 
  CASE 
    WHEN sr_number IN (1,2,3,4,5,6) THEN quantity + 100
    ELSE quantity + 50
  END as quantity,
  (SELECT id FROM public.sale_orders WHERE name = 'Oat Milk Order')
FROM public.product_sizes 
WHERE sale_order_id = (SELECT id FROM public.sale_orders WHERE name = 'Navy Order');