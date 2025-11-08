-- Create junction table for sale orders and processes
CREATE TABLE IF NOT EXISTS public.sale_order_processes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_order_id uuid NOT NULL REFERENCES public.sale_orders(id) ON DELETE CASCADE,
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(sale_order_id, process_id)
);

-- Enable RLS
ALTER TABLE public.sale_order_processes ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on sale_order_processes" 
ON public.sale_order_processes 
FOR ALL 
USING (true) 
WITH CHECK (true);