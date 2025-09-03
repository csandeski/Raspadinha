-- Add Facebook Pixel ID column to marketing_links table
ALTER TABLE marketing_links ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;