-- ==============================================================================
-- Ravina Sarees - Comprehensive Production Seed Script
-- Atelier: Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana - 504224
-- Brand URL: https://ravinasarees.in
-- ==============================================================================

-- 1. SEED CATEGORIES (Matching frontend routes and catalog navigation)
INSERT INTO categories (name, slug, description, image_url, banner_url, display_order, is_active)
VALUES
  (
    'Party Wear Sarees',
    'party-wear-sarees',
    'Glamorous contemporary drapes, shimmering tissue silks, sheer organzas, and modern cocktail sarees that turn heads.',
    '/images/products/lavender-organza-1.jpg',
    '/images/products/lavender-organza-1.jpg',
    1,
    true
  ),
  (
    'Silk Sarees',
    'silk-sarees',
    'Pure Kanjivaram, Mulberry, and soft Litchi Silk creations that drape with effortless grace and liquid lustre.',
    '/images/products/emerald-kanjivaram-1.jpg',
    '/images/products/emerald-kanjivaram-1.jpg',
    2,
    true
  ),
  (
    'Designer Sarees',
    'designer-sarees',
    'Exclusive festive concepts, midnight jacquards, scalloped zari borders, and artisanal limited-edition creations.',
    '/images/products/navy-designer-1.jpg',
    '/images/products/navy-designer-1.jpg',
    3,
    true
  ),
  (
    'Wedding Sarees',
    'wedding-sarees',
    'Regal bridal masterpieces designed for sacred wedding vows, muhurtham moments, and grand reception ceremonies.',
    '/images/products/golden-kanchipuram-1.jpg',
    '/images/products/golden-kanchipuram-1.jpg',
    4,
    true
  ),
  (
    'Banarasi Heritage',
    'banarasi-sarees',
    'Authentic Varanasi Kadhwa brocades, son-rupa gold and silver motifs, and royal court-inspired heirloom masterworks.',
    '/images/products/maroon-banarasi-1.jpg',
    '/images/products/maroon-banarasi-1.jpg',
    5,
    true
  ),
  (
    'Handloom Silks',
    'handloom-sarees',
    'Traditional masterloom craftsmanship, certified Silk Mark drapes, temple Korvai borders, and generational bridal weaves.',
    '/images/products/rani-pink-silk-1.jpg',
    '/images/products/rani-pink-silk-1.jpg',
    6,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    banner_url = EXCLUDED.banner_url,
    display_order = EXCLUDED.display_order;

-- 2. SEED AUTHENTIC SAREE PRODUCTS
INSERT INTO products (
  sku, name, slug, category_name, description, price, discount_price, stock,
  fabric, zari_type, weave_type, saree_length, blouse_included, blouse_length,
  occasion, care_instructions, available_colors, primary_color, images,
  rating, review_count, is_featured, is_bestseller, is_new_arrival, is_active
) VALUES
(
  'RAV-TIS-009',
  'Turquoise Blue Tissue Silver Zariwork Saree With Matching Blouse Piece',
  'turquoise-blue-tissue-silver-zariwork-saree-with-matching-blouse-piece',
  'Party Wear Sarees',
  'An enchanting turquoise blue tissue saree featuring shimmering metallic weave adorned with exquisite silver zari floral bootis and an ornate scalloped zari embroidered border. Accompanied by a coordinated matching unstitched blouse piece. Ultra-lightweight and radiant, perfect for cocktail parties, sangeet ceremonies, receptions, and celebratory festive evenings.',
  2990.00,
  1794.00,
  15,
  'Pure Metallic Tissue Sheer Silk Blend',
  'Intricate Silver Zari & Scalloped Resham Border',
  'Luminescent Tissue Jacquard Weave',
  '5.5 Meters',
  true,
  '0.80 Meters (Turquoise Blue with Silver Zari Border)',
  'Party Wear / Festive / Reception',
  'Dry Clean Only. Iron inside out on mild silk setting. Store wrapped in soft muslin cloth.',
  ARRAY['Turquoise Blue', 'Aqua Marine', 'Sky Cyan'],
  'Turquoise Blue',
  ARRAY['/images/products/turquoise-tissue-1.jpg', '/images/products/turquoise-tissue-2.jpg', '/images/products/turquoise-tissue-3.jpg'],
  4.9,
  42,
  true,
  true,
  true,
  true
),
(
  'RAV-SLK-010',
  'Rani Pink Soft Silk Saree with Rich Silver Zari Pallu & Floral Jaal',
  'rani-pink-soft-silk-saree-rich-silver-zari-pallu-floral-jaal',
  'Silk Sarees',
  'A breathtaking Rani Pink soft silk saree showcasing a glorious all-over silver zari floral jaal body and a heavy contrasting zari pallu finished with handcrafted artisanal tassels. Comes with a matching unstitched blouse piece. Supremely soft, lustrous, and graceful for weddings, receptions, festivals, and celebratory occasions.',
  3490.00,
  1949.00,
  12,
  'Pure Litchi Soft Silk',
  'Intricate Silver & Light Gold Dual Zari Weave',
  'Jacquard Floral Jaal with Tassel Pallu',
  '5.5 Meters',
  true,
  '0.80 Meters (Matching Rani Pink Brocade Silk)',
  'Wedding / Grand Festive / Reception',
  'Dry Clean Only. Wrap in mul-mul cloth. Iron on reverse side on low silk heat.',
  ARRAY['Rani Pink', 'Ruby Rose', 'Magenta'],
  'Rani Pink',
  ARRAY['/images/products/rani-pink-silk-1.jpg', '/images/products/rani-pink-silk-2.jpg', '/images/products/rani-pink-silk-3.jpg', '/images/products/rani-pink-silk-4.jpg', '/images/products/rani-pink-silk-5.jpg'],
  5.0,
  38,
  true,
  true,
  true,
  true
),
(
  'RAV-KAN-011',
  'Emerald Green Royal Kanjivaram Silk Saree with Temple Border & Pure Zari Pallu',
  'emerald-green-royal-kanjivaram-silk-saree-temple-border-zari-pallu',
  'Silk Sarees',
  'An awe-inspiring Emerald Green Kanjivaram silk masterpiece woven with majestic peacock and floral motifs across a rich lustrous field. Framed by an ornate ruby crimson temple korvai border and a sumptuous pure gold zari brocade pallu. Accompanied by a designer unstitched contrast crimson blouse piece. Perfect for muhurthams, family pujas, and regal evening galas.',
  4290.00,
  2490.00,
  10,
  'Pure Mulberry Kanchipuram Soft Silk',
  'Pure Gold & Antique Copper Dual Tone Zari',
  'Handcrafted Korvai Temple Jacquard Weave',
  '5.5 Meters',
  true,
  '0.80 Meters (Crimson Red with Heavy Gold Zari Border)',
  'Wedding / Temple Puja / Reception',
  'Dry clean only. Preserve in soft breathable muslin cloth bag. Avoid direct perfume spray.',
  ARRAY['Emerald Green', 'Peacock Green', 'Deep Forest Green'],
  'Emerald Green',
  ARRAY['/images/products/emerald-kanjivaram-1.jpg'],
  4.95,
  34,
  true,
  true,
  true,
  true
),
(
  'RAV-BAN-012',
  'Royal Maroon Banarasi Brocade Bridal Saree with Kadhwa Floral Weave',
  'royal-maroon-banarasi-brocade-bridal-saree-kadhwa-floral-weave',
  'Wedding Sarees',
  'A timeless heritage bridal masterpiece in deep Royal Maroon katan silk, lavishly woven using age-old Banarasi Kadhwa craftsmanship. Embellished with resplendent son-rupa (gold and silver) zari floral jaal and a dense regal paithani-inspired border. Features an intricately woven ceremonial aanchal (pallu). Includes a matching brocade blouse piece.',
  4890.00,
  2899.00,
  8,
  'Pure Katan Silk Banarasi Brocade',
  'Heritage Son-Rupa (Dual Gold & Silver) Tested Zari',
  'Authentic Banarasi Hand-Woven Kadhwa Jaal',
  '5.5 Meters',
  true,
  '0.85 Meters (Deep Maroon Brocade with Zari Sleeves)',
  'Bridal Muhurtham / Grand Wedding / Sangeet',
  'Strictly Dry Clean. Air out periodically in shaded breeze. Wrap in acid-free mul-mul.',
  ARRAY['Royal Maroon', 'Vermilion Red', 'Crimson Wine'],
  'Royal Maroon',
  ARRAY['/images/products/maroon-banarasi-1.jpg'],
  5.0,
  52,
  true,
  true,
  false,
  true
),
(
  'RAV-DSG-013',
  'Midnight Navy Blue Designer Paisley Silk Saree with Rose Gold Embellishments',
  'midnight-navy-blue-designer-paisley-silk-saree-rose-gold',
  'Designer Sarees',
  'Contemporary opulence meets timeless Indian heritage in this Midnight Navy Blue designer silk saree. Adorned with delicate stylized paisley (kalakaar) motifs rendered in subtle rose gold zari and fine micro-cutdana bead accents along the scalloped borders. Drapes with fluid elegance and modern drama for sophisticated cocktail soirees and high-fashion galas.',
  3890.00,
  2249.00,
  14,
  'Rich Satin Crepe & Raw Silk Jacquard',
  'Modern Rose Gold & Metallic Copper Sheen Zari',
  'Intricate Paisley Jacquard with Hand-Finished Scallop',
  '5.5 Meters',
  true,
  '0.80 Meters (Midnight Navy Embroidered Designer Blouse)',
  'Cocktail Party / Reception / Festive Soiree',
  'Dry Clean Recommended. Do not brush beads. Press with warm iron on reverse.',
  ARRAY['Midnight Navy', 'Royal Indigo', 'Sapphire Blue'],
  'Navy Blue',
  ARRAY['/images/products/navy-designer-1.jpg'],
  4.88,
  29,
  true,
  false,
  true,
  true
),
(
  'RAV-ORG-014',
  'Ethereal Lavender Sheer Organza Silk Saree with Floral Silver Zari Border',
  'ethereal-lavender-sheer-organza-silk-saree-silver-zari-border',
  'Party Wear Sarees',
  'Delicate, dreamy, and utterly poetic — this gossamer Lavender Organza silk saree floats effortlessly around you. Features ethereal silver zari blooming vines and lustrous scalloped embroidery along all four borders. Paired with a tone-on-tone lustrous raw silk blouse piece. A celebrity-favorite drape for daytime engagements, mehendi festivities, and summer soirees.',
  3190.00,
  1849.00,
  18,
  'Pure Sheer Crystal Organza Silk',
  'Shimmering Silver Metallic Thread & Resham Embroidery',
  'Lightweight Sheer Organza with Scalloped Zari Edge',
  '5.5 Meters',
  true,
  '0.80 Meters (Lavender Raw Silk Unstitched Fabric)',
  'Daytime Wedding / Engagement / Mehendi / Cocktail',
  'Gentle Dry Clean Only. Avoid wringing. Store flat or hung on padded hangers.',
  ARRAY['Ethereal Lavender', 'Lilac Mist', 'Pastel Violet'],
  'Lavender',
  ARRAY['/images/products/lavender-organza-1.jpg'],
  4.92,
  26,
  true,
  true,
  true,
  true
),
(
  'RAV-KAN-015',
  'Swarna Golden Bridal Kanchipuram Silk Saree with Crimson Red Temple Pallu',
  'swarna-golden-bridal-kanchipuram-silk-saree-crimson-temple-pallu',
  'Wedding Sarees',
  'The quintessential South Indian bridal heirloom. Woven in brilliant mustard Swarna gold pure silk with an opulent crimson red pallu showcasing Goddess Lakshmi motifs, sacred rudraksha patterns, and royal chariots. Heavy authentic gold zari brocade that drapes with regal majesty for sacred pheras, thali ceremonies, and heirloom bridal collections.',
  5290.00,
  3199.00,
  7,
  'Pure Kanchipuram Heavy Bridal Mulberry Silk',
  'Pure 2G Gold Tested Zari with Heavy Red Pallu Brocade',
  'Masterloom Korvai 3-Shuttle Traditional Weave',
  '5.5 Meters',
  true,
  '0.85 Meters (Deep Crimson Red Brocade with Heavy Zari Sleeve Border)',
  'Muhurtham / Bridal Pheras / Grand Reception',
  'Dry Clean Only. Never spray water or perfumes directly. Air in shade twice yearly.',
  ARRAY['Swarna Golden Mustard', 'Antique Honey Gold', 'Haldi Yellow'],
  'Golden Mustard',
  ARRAY['/images/products/golden-kanchipuram-1.jpg'],
  5.0,
  47,
  true,
  true,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE
SET price = EXCLUDED.price,
    discount_price = EXCLUDED.discount_price,
    stock = EXCLUDED.stock,
    images = EXCLUDED.images,
    category_name = EXCLUDED.category_name,
    description = EXCLUDED.description;

-- 3. SEED COUPONS
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active)
VALUES
  ('RAVINA10', 'percentage', 10.00, 2500.00, 500.00, 5000, true),
  ('ROYAL400', 'fixed', 400.00, 3500.00, 400.00, 2000, true),
  ('FIRSTBUY', 'percentage', 15.00, 1500.00, 350.00, 3000, true),
  ('FESTIVE200', 'fixed', 200.00, 2000.00, 200.00, 5000, true)
ON CONFLICT (code) DO UPDATE
SET discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_value = EXCLUDED.min_order_value,
    max_discount = EXCLUDED.max_discount;

-- 4. SEED STORE SETTINGS
INSERT INTO store_settings (key, value)
VALUES
  ('store_info', '{"name": "Ravina Sarees", "tagline": "Royal Handlooms of India", "phone": "+91 86884 72300", "email": "ravieenasarees@gmail.com", "address": "Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana - 504224"}'::jsonb),
  ('shipping_config', '{"free_shipping_threshold": 1000, "default_shipping_fee": 150, "gift_wrap_fee": 250, "courier_partner": "BlueDart Express"}'::jsonb),
  ('payment_config', '{"razorpay_enabled": true, "cod_enabled": true, "upi_enabled": true, "currency": "INR"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
