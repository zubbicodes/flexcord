-- Create product_sizes table to store the 14 drawcord sizes
CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sr_number INTEGER NOT NULL UNIQUE,
  item TEXT NOT NULL DEFAULT 'Flexible Drawcord',
  color TEXT NOT NULL DEFAULT 'Navy',
  finished_size_inch NUMERIC(10,3) NOT NULL,
  finished_size_cm NUMERIC(10,3) NOT NULL,
  elastic_inch TEXT NOT NULL,
  elastic_inch_value NUMERIC(10,3) NOT NULL,
  elastic_cm NUMERIC(10,4) NOT NULL,
  tipping_cord_size NUMERIC(10,1) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create processes table
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  order_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create progress_entries table
CREATE TABLE public.progress_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_size_id UUID REFERENCES public.product_sizes(id) ON DELETE CASCADE NOT NULL,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE NOT NULL,
  quantity_completed INTEGER NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  worker_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_size_id, process_id, entry_date)
);

-- Enable RLS
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (allow public access for this production workflow tracker)
CREATE POLICY "Allow all operations on product_sizes"
  ON public.product_sizes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on processes"
  ON public.processes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on progress_entries"
  ON public.progress_entries FOR ALL USING (true) WITH CHECK (true);

-- Insert the 14 product sizes
INSERT INTO public.product_sizes (sr_number, finished_size_inch, finished_size_cm, elastic_inch, elastic_inch_value, elastic_cm, tipping_cord_size, quantity) VALUES
(1, 31.125, 79.0575, '5 1/4', 5.25, 13.335, 72, 927),
(2, 32.125, 81.5975, '5 1/4', 5.25, 13.335, 74.5, 1482),
(3, 33.125, 84.1375, '5 5/8', 5.625, 14.2875, 76, 1704),
(4, 34.125, 86.6775, '5 5/8', 5.625, 14.2875, 78.5, 1482),
(5, 35.5, 90.17, '6 1/8', 6.125, 15.5575, 81, 1704),
(6, 37, 93.98, '6 1/8', 6.125, 15.5575, 84.5, 1605),
(7, 38.5, 97.79, '6 11/16', 6.6875, 16.98625, 87, 59),
(8, 38.25, 97.155, '6 5/8', 6.625, 16.8275, 86.5, 1235),
(9, 41.75, 106.045, '7 1/4', 7.25, 18.415, 94, 927),
(10, 43.25, 109.855, '7 5/8', 7.625, 19.3675, 96.5, 54),
(11, 43.5, 110.49, '8 5/16', 8.3125, 21.11375, 95.5, 59),
(12, 45, 114.3, '8 5/16', 8.3125, 21.11375, 99.5, 59),
(13, 40.25, 102.235, '7 1/4', 7.25, 18.415, 90, 1052),
(14, 42.25, 107.315, '7 3/4', 7.75, 19.685, 94, 59);

-- Insert the 9 processes
INSERT INTO public.processes (name, order_number) VALUES
('Knitting', 1),
('Tipping', 2),
('Cord Cutting', 3),
('Elastic Cutting', 4),
('Singar', 5),
('Bartack', 6),
('Clipping/Threading', 7),
('QA', 8),
('Dispatch', 9);