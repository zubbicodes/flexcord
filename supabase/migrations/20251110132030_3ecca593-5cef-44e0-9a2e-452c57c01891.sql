-- Create yarn_batches table to track yarn orders for each sale order
CREATE TABLE public.yarn_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_order_id UUID NOT NULL,
  batch_name TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  expected_output_mtr NUMERIC NOT NULL,
  expected_output_kg NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.yarn_batches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on yarn_batches" 
ON public.yarn_batches 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_yarn_batches_sale_order_id ON public.yarn_batches(sale_order_id);