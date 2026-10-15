-- Optional demo data so the shop is not empty on first run.
-- Run AFTER schema.sql. Delete these rows from the admin panel when you add real products.
-- Nepali names are machine-style translations — please have a native speaker review them.

insert into public.categories (slug, name_en, name_ne, sort_order) values
  ('men',         'Men',          'पुरुष',        1),
  ('women',       'Women',        'महिला',        2),
  ('kids',        'Kids',         'बालबालिका',    3),
  ('accessories', 'Accessories',  'सामग्री',      4),
  ('home',        'Home & Living','घरायसी सामान', 5)
on conflict (slug) do nothing;

with c as (select id, slug from public.categories)
insert into public.products
  (slug, name_en, name_ne, description_en, description_ne, price, compare_at_price, category_id, is_featured)
values
  ('classic-cotton-tshirt', 'Classic Cotton T-Shirt', 'क्लासिक सुती टि-सर्ट',
   'Soft 100% cotton crew-neck tee. Pre-washed, true to size, made for everyday wear.',
   'नरम १००% सुतीको राउन्ड-नेक टि-सर्ट। दैनिक प्रयोगका लागि उपयुक्त।',
   899, 1199, (select id from c where slug = 'men'), true),
  ('denim-jacket', 'Denim Jacket', 'डेनिम ज्याकेट',
   'Mid-weight denim jacket with a relaxed fit. Layers well through Kathmandu winters.',
   'आरामदायी फिटको डेनिम ज्याकेट। काठमाडौँको जाडोमा लगाउन उपयुक्त।',
   3499, 4200, (select id from c where slug = 'men'), true),
  ('kurta-surwal-set', 'Cotton Kurta Surwal Set', 'सुती कुर्ता सुरुवाल सेट',
   'Breathable cotton kurta with matching surwal and dupatta. Comfortable for festivals and daily wear.',
   'सुरुवाल र दुपट्टासहितको सुतीको कुर्ता। चाडपर्व र दैनिक प्रयोगका लागि।',
   2899, null, (select id from c where slug = 'women'), true),
  ('pashmina-shawl', 'Soft Pashmina Shawl', 'नरम पस्मिना सल',
   'Lightweight, warm and soft. A timeless gift.',
   'हल्का, न्यानो र नरम पस्मिना सल। उपहारका लागि उत्तम।',
   3999, 4999, (select id from c where slug = 'women'), true),
  ('kids-hoodie', 'Kids Fleece Hoodie', 'बालबालिकाको हुडी',
   'Warm fleece-lined hoodie with a kangaroo pocket.',
   'न्यानो फ्लिस भित्र भएको हुडी।',
   1599, null, (select id from c where slug = 'kids'), false),
  ('woolen-topi', 'Woollen Topi', 'ऊनी टोपी',
   'Hand-knitted woollen cap. Warm, light, easy to pack.',
   'हातले बुनेको ऊनी टोपी।',
   699, null, (select id from c where slug = 'accessories'), false),
  ('leather-wallet', 'Leather Bi-fold Wallet', 'छालाको वालेट',
   'Genuine leather wallet with six card slots and a coin pocket.',
   'छह वटा कार्ड स्लट भएको असली छालाको वालेट।',
   1299, 1599, (select id from c where slug = 'accessories'), false),
  ('cotton-cushion-cover', 'Cotton Cushion Cover', 'सुतीको कुशन कभर',
   'Handloom cotton cushion cover, 45 × 45 cm. Zip closure.',
   'हातले बुनेको सुतीको कुशन कभर (४५ × ४५ से.मी.)।',
   549, null, (select id from c where slug = 'home'), false)
on conflict (slug) do nothing;

-- Variants (size / color / stock)
insert into public.product_variants (product_id, size, color, stock)
select p.id, v.size, v.color, v.stock
from public.products p
join (values
  ('classic-cotton-tshirt', 'S',  'Black', 20), ('classic-cotton-tshirt', 'M',  'Black', 25),
  ('classic-cotton-tshirt', 'L',  'Black', 25), ('classic-cotton-tshirt', 'XL', 'Black', 10),
  ('classic-cotton-tshirt', 'M',  'White', 20), ('classic-cotton-tshirt', 'L',  'White', 20),
  ('denim-jacket', 'M', 'Blue', 8),  ('denim-jacket', 'L', 'Blue', 8), ('denim-jacket', 'XL', 'Blue', 4),
  ('kurta-surwal-set', 'S', 'Maroon', 6), ('kurta-surwal-set', 'M', 'Maroon', 10),
  ('kurta-surwal-set', 'L', 'Maroon', 10), ('kurta-surwal-set', 'M', 'Teal', 8), ('kurta-surwal-set', 'L', 'Teal', 8),
  ('pashmina-shawl', null, 'Camel', 12), ('pashmina-shawl', null, 'Grey', 12), ('pashmina-shawl', null, 'Maroon', 6),
  ('kids-hoodie', '4-5Y', 'Navy', 10), ('kids-hoodie', '6-7Y', 'Navy', 10), ('kids-hoodie', '8-9Y', 'Navy', 8),
  ('woolen-topi', null, 'Brown', 30), ('woolen-topi', null, 'Grey', 30),
  ('leather-wallet', null, 'Brown', 15), ('leather-wallet', null, 'Black', 15),
  ('cotton-cushion-cover', null, 'Red', 25), ('cotton-cushion-cover', null, 'Mustard', 25)
) as v(slug, size, color, stock) on v.slug = p.slug
on conflict do nothing;
