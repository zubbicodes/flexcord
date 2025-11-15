-- Add weight_grams column to product_sizes table
ALTER TABLE product_sizes 
ADD COLUMN weight_grams numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN product_sizes.weight_grams IS 'Weight of each unit in grams';