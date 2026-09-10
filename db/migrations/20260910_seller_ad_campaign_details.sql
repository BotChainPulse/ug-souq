ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS listing_id BIGINT UNSIGNED NULL;
ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS headline VARCHAR(120) NULL;
ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS message VARCHAR(255) NULL;
ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS objective ENUM('product_sales','product_views','shop_visits') NULL;
ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS cta ENUM('shop_now','view_product','visit_shop') NULL;
ALTER TABLE seller_ad_bookings ADD COLUMN IF NOT EXISTS requested_start_date VARCHAR(10) NULL;
