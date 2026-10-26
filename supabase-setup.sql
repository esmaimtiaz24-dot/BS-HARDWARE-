-- ============================================================
--  BS Hardware And Sanitary — Supabase database
--  ------------------------------------------------------------
--  HOW TO USE
--    1. supabase.com -> apna project kholein
--    2. Left menu: SQL Editor -> New query
--    3. Yeh poori file paste karein aur RUN dabayein (ek hi baar)
--    4. Settings -> API se "Project URL" aur "anon public" key copy karke
--       js/firebase-config.js ke andar BS_SUPABASE block mein daal dein
--
--  Admin login (is file se ban jata hai)
--    email    : admin@bshardware2026
--    password : bsadmin2026
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. TABLES  (har record ek jsonb row hai — site ka format wahi rehta hai)
-- ------------------------------------------------------------
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists products_created_idx on public.products (created_at desc);
create index if not exists products_slug_idx    on public.products ((data->>'id'));
create index if not exists orders_created_idx   on public.orders   (created_at desc);
create index if not exists orders_number_idx    on public.orders   ((upper(data->>'orderNumber')));
create index if not exists orders_status_idx    on public.orders   ((data->>'status'));
create index if not exists expenses_created_idx on public.expenses (created_at desc);

-- ------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
--    products : sab parh sakte hain, likhna sirf admin
--    orders   : customer bana sakta hai, parhna/update admin (tracking khula)
--    expenses : sirf admin
-- ------------------------------------------------------------
alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.expenses enable row level security;

drop policy if exists products_read   on public.products;
drop policy if exists products_write  on public.products;
create policy products_read  on public.products for select using (true);
create policy products_write on public.products for all to authenticated using (true) with check (true);

drop policy if exists orders_insert      on public.orders;
drop policy if exists orders_read        on public.orders;
drop policy if exists orders_read_admin  on public.orders;
drop policy if exists orders_update      on public.orders;
drop policy if exists orders_delete      on public.orders;
create policy orders_insert on public.orders for insert to anon, authenticated with check (true);
-- Guest order tracking (track.html) ke liye parhna khula hai.
-- Sirf admin ko parhne dena ho to niche wali line uncomment karein:
create policy orders_read   on public.orders for select to anon, authenticated using (true);
-- create policy orders_read on public.orders for select to authenticated using (true);
create policy orders_update on public.orders for update to authenticated using (true) with check (true);
create policy orders_delete on public.orders for delete to authenticated using (true);

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 3. STORAGE  (product images + payment screenshots)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true), ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

drop policy if exists "bs public read" on storage.objects;
drop policy if exists "bs public upload" on storage.objects;
drop policy if exists "bs admin write" on storage.objects;

create policy "bs public read" on storage.objects
  for select using (bucket_id in ('products', 'payment-proofs'));

create policy "bs public upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'payment-proofs');

create policy "bs admin write" on storage.objects
  for all to authenticated
  using (bucket_id in ('products', 'payment-proofs'))
  with check (bucket_id in ('products', 'payment-proofs'));

-- ------------------------------------------------------------
-- 4. STARTING CATALOGUE — 12 products
-- ------------------------------------------------------------
insert into public.products (data)
select v from (values
  ( '{"id": "p-tap-bib", "name": "Brass Bib Cock Tap — Chrome Finish", "category": "tap-fittings", "price": 1850, "oldPrice": 2400, "costPrice": 1180, "stock": 34, "unit": "piece", "brand": "Master Brass", "sku": "BS-TAP-101", "badge": "sale", "featured": true, "image": "assets/img/products/tap-bib.jpg", "shortDesc": "Heavy brass body bib cock with red cross handle — leak-proof ceramic cartridge.", "description": "Solid brass bib cock for garden, tank and utility points. Chrome-plated body with a reinforced red cross handle for a firm grip. Fitted with a ceramic disc cartridge that keeps the flow smooth and stops drips even after thousands of turns.", "highlights": ["Solid brass body, chrome plated", "Ceramic cartridge — leak-proof", "1/2\" BSP inlet, standard Pakistan fitting", "Tested to 10 bar pressure"], "specs": [["Material", "Brass + Chrome"], ["Size", "1/2 inch (15mm)"], ["Handle", "Cross type, red"], ["Pressure", "Up to 10 bar"], ["Warranty", "6 months"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-mixer", "name": "Single Lever Wall Mixer — Chrome", "category": "tap-fittings", "price": 4650, "oldPrice": 5400, "costPrice": 3100, "stock": 18, "unit": "piece", "brand": "AquaLine", "sku": "BS-MIX-204", "badge": "bestseller", "featured": true, "image": "assets/img/products/mixer.jpg", "shortDesc": "Smooth single-lever wall mixer with aerator — ideal for modern bathrooms.", "description": "A clean, minimal wall mixer in mirror-chrome finish. One lever controls both temperature and flow, so it works comfortably with wet hands. The built-in aerator softens the stream and saves water.", "highlights": ["Single lever — hot & cold", "Mirror chrome finish", "Neoperl-style aerator included", "Fits standard 150mm wall distance"], "specs": [["Material", "Brass, chrome plated"], ["Cartridge", "35mm ceramic"], ["Inlet", "2 x 1/2 inch"], ["Finish", "Mirror chrome"], ["Warranty", "1 year"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-basin", "name": "Pedestal Wash Basin — Ceramic White", "category": "sanitary", "price": 14500, "oldPrice": 17000, "costPrice": 9600, "stock": 7, "unit": "set", "brand": "SanWare", "sku": "BS-BSN-310", "badge": "sale", "featured": true, "image": "assets/img/products/basin.jpg", "shortDesc": "Glossy vitreous china basin with sturdy pedestal — stain resistant and easy to clean.", "description": "A classic full-pedestal wash basin for homes, offices and small washrooms. Made from vitreous china with a double-glaze finish so it resists stains, scratches and yellowing. Comes with a pre-drilled hole for standard faucets.", "highlights": ["Vitreous china, double glaze", "Includes pedestal + fixing kit", "Pre-drilled faucet hole", "Easy-clean curved bowl"], "specs": [["Material", "Vitreous china"], ["Size", "22 x 17 inch"], ["Colour", "Glossy white"], ["Waste", "Standard 1 1/4\""], ["Package", "Basin + pedestal"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-commode", "name": "Western Commode — Soft Close Seat", "category": "sanitary", "price": 21500, "oldPrice": 24500, "costPrice": 15400, "stock": 12, "unit": "piece", "brand": "SanWare", "sku": "BS-CMD-330", "badge": "", "featured": true, "image": "assets/img/products/commode.jpg", "shortDesc": "S-trap western commode with soft-close lid and dual flush options.", "description": "Full-size western commode with a smooth glazed surface and a whisper-quiet soft-close seat. Dual flush (3L / 6L) keeps water use sensible without losing power. S-trap outlet suits most Pakistani bathroom layouts.", "highlights": ["Soft-close seat, quick release", "Dual flush 3L / 6L", "S-trap 250mm set-out", "Fully glazed trapway"], "specs": [["Material", "Vitreous china"], ["Trap", "S-trap 250mm"], ["Flush", "Dual 3L / 6L"], ["Seat", "Soft close, PP"], ["Warranty", "1 year"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-hammer", "name": "Claw Hammer 16oz — Steel Grip", "category": "hand-tools", "price": 950, "oldPrice": 1200, "costPrice": 590, "stock": 46, "unit": "piece", "brand": "ToughGrip", "sku": "BS-TLS-402", "badge": "bestseller", "featured": true, "image": "assets/img/products/hammer.jpg", "shortDesc": "Balanced 16oz claw hammer with shock-absorbing handle for daily site work.", "description": "Drop-forged steel head, heat treated and polished for a strong strike face. The fibreglass-core handle with rubber over-mould cuts vibration, so long nailing sessions do not punish your wrist.", "highlights": ["Drop-forged 16oz head", "Fibreglass core handle", "Anti-slip rubber grip", "Ideal for carpentry & site work"], "specs": [["Weight", "16 oz / 450g"], ["Head", "Drop forged steel"], ["Handle", "Fibreglass + rubber"], ["Length", "13 inch"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-wrench", "name": "Adjustable Wrench 10\" — Chrome Vanadium", "category": "hand-tools", "price": 780, "oldPrice": 950, "costPrice": 470, "stock": 52, "unit": "piece", "brand": "ToughGrip", "sku": "BS-TLS-415", "badge": "", "featured": false, "image": "assets/img/products/wrench.jpg", "shortDesc": "Smooth-adjust jaw wrench in chrome vanadium steel with measurement scale.", "description": "A dependable 10-inch adjustable wrench for plumbing and general maintenance. Chrome vanadium body holds its edge, the worm screw turns smoothly, and the jaw is laser-etched with a scale for quick sizing.", "highlights": ["Chrome vanadium steel", "Smooth worm-screw adjustment", "Jaw scale in mm", "Red dipped grip"], "specs": [["Length", "10 inch / 250mm"], ["Jaw opening", "0 – 34mm"], ["Material", "Chrome vanadium"], ["Finish", "Polished + dipped grip"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-lock", "name": "Mortice Door Lock Set — Stainless", "category": "door-hardware", "price": 3200, "oldPrice": 3900, "costPrice": 2050, "stock": 23, "unit": "set", "brand": "SecureLine", "sku": "BS-LCK-510", "badge": "new", "featured": true, "image": "assets/img/products/lock.jpg", "shortDesc": "Satin stainless handle set with 3 keys, mortice body and latch.", "description": "Complete mortice lock set for main doors and bedrooms. The satin stainless handle resists fingerprints, and the 3-lever mortice body gives a solid, wobble-free throw. Includes both-side handles, cylinder and three keys.", "highlights": ["Satin stainless steel finish", "3-lever mortice mechanism", "Reversible latch — left/right", "Includes 3 keys + screws"], "specs": [["Material", "Stainless steel"], ["Backset", "50mm"], ["Keys", "3 brass keys"], ["Door thickness", "32 – 45mm"], ["Package", "Handles + body + keys"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-pipes", "name": "PVC Pipe Fittings Combo Kit (1/2\")", "category": "pipes", "price": 640, "oldPrice": 800, "costPrice": 380, "stock": 120, "unit": "kit", "brand": "AquaLine", "sku": "BS-PIP-620", "badge": "sale", "featured": false, "image": "assets/img/products/pipes.jpg", "shortDesc": "Assorted elbows, tees, couplers and end caps — everything for a quick line repair.", "description": "A handy starter kit of 1/2-inch PVC fittings: elbows, tees, sockets, reducers and end caps. Made from rigid uPVC with smooth bores so water pressure stays consistent across the run.", "highlights": ["Rigid uPVC material", "12 fitting pieces in one kit", "Smooth bore — low pressure loss", "Solvent-weld compatible"], "specs": [["Size", "1/2 inch (20mm)"], ["Pieces", "12"], ["Material", "uPVC"], ["Contents", "Elbows, tees, sockets, caps"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-paint", "name": "Weather Shield Emulsion Paint — 4L", "category": "paint", "price": 4200, "oldPrice": 4800, "costPrice": 2950, "stock": 15, "unit": "bucket", "brand": "ColorMax", "sku": "BS-PNT-710", "badge": "", "featured": false, "image": "assets/img/products/paint.jpg", "shortDesc": "Low-VOC exterior emulsion that resists rain, sun and dust for up to 5 years.", "description": "A creamy, easy-brush exterior emulsion for boundary walls and facades. The acrylic base grips well on plaster and primer, and the weather-block formula keeps colour from fading in harsh Karachi sun.", "highlights": ["Weather-block acrylic formula", "Low VOC, low smell", "Covers approx. 140 sq ft per litre (2 coats)", "Tintable to 500+ shades"], "specs": [["Volume", "4 litre"], ["Finish", "Matt"], ["Coverage", "~560 sq ft (2 coats)"], ["Base", "Water based acrylic"], ["Drying", "30 min touch dry"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-socket", "name": "13A Switch Socket — White", "category": "electrical", "price": 320, "oldPrice": 420, "costPrice": 185, "stock": 200, "unit": "piece", "brand": "VoltPro", "sku": "BS-ELE-805", "badge": "sale", "featured": false, "image": "assets/img/products/socket.jpg", "shortDesc": "Shutter-protected 13A socket with a crisp red rocker switch.", "description": "A dependable 13A wall socket for home and shop wiring. Brass terminals bite the wire firmly, and the internal shutter keeps fingers and dust out. The red rocker switch makes the on/off state obvious at a glance.", "highlights": ["13A rated, brass terminals", "Child-safe shutter", "Fire-retardant ABS body", "Fits standard 2M boxes"], "specs": [["Rating", "13 Amp / 250V"], ["Material", "Fire retardant ABS"], ["Module", "3 pin + switch"], ["Colour", "White + red"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-helmet", "name": "Safety Helmet — HDPE Yellow", "category": "safety", "price": 1150, "oldPrice": 1400, "costPrice": 720, "stock": 60, "unit": "piece", "brand": "SafeSite", "sku": "BS-SAF-902", "badge": "new", "featured": false, "image": "assets/img/products/helmet.jpg", "shortDesc": "IS-marked HDPE helmet with ratchet suspension for site crews.", "description": "Light, tough HDPE shell with a wide brim for shade. The 6-point ratchet suspension spreads impact away from the crown, and the chin strap keeps it steady on ladders and scaffolding.", "highlights": ["HDPE shell, UV stabilised", "6-point ratchet suspension", "Chin strap included", "Fits 52 – 64 cm head size"], "specs": [["Material", "HDPE"], ["Size", "Adjustable 52–64cm"], ["Weight", "340g"], ["Colour", "Safety yellow"], ["Standard", "IS 2925 style"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb ),
  ( '{"id": "p-bulb", "name": "LED Bulb 12W — Daylight", "category": "electrical", "price": 280, "oldPrice": 350, "costPrice": 165, "stock": 0, "unit": "piece", "brand": "VoltPro", "sku": "BS-ELE-818", "badge": "", "featured": false, "image": "assets/img/products/bulb.jpg", "shortDesc": "Energy-saving 12W LED with 1200 lumens daylight output.", "description": "Bright, flicker-free LED bulb for drawing rooms and shop counters. The wide diffuser spreads light evenly, while the surge-protected driver handles voltage swings common on local feeders.", "highlights": ["12W = approx. 100W incandescent", "6500K daylight white", "Surge protected driver", "B22 pin base"], "specs": [["Power", "12 Watt"], ["Lumens", "1200 lm"], ["Base", "B22 pin"], ["Colour temp", "6500K"], ["Life", "25,000 hours"]], "createdAt": "2026-01-05T09:00:00.000Z"}'::jsonb )
) as t(v)
where not exists (select 1 from public.products p where p.data->>'id' = t.v->>'id');

-- ------------------------------------------------------------
-- 5. SAMPLE EXPENSES — 4 rows (P&L ke liye)
-- ------------------------------------------------------------
insert into public.expenses (data)
select v from (values
  ( '{"id": "exp_demo_0", "title": "Shop rent", "category": "Rent", "amount": 25000, "date": "2026-10-01", "createdAt": "2026-10-01T10:00:00.000Z", "by": "admin"}'::jsonb ),
  ( '{"id": "exp_demo_1", "title": "Delivery fuel", "category": "Delivery", "amount": 4200, "date": "2026-10-01", "createdAt": "2026-10-01T10:00:00.000Z", "by": "admin"}'::jsonb ),
  ( '{"id": "exp_demo_2", "title": "Packing material", "category": "Packaging", "amount": 1350, "date": "2026-10-01", "createdAt": "2026-10-01T10:00:00.000Z", "by": "admin"}'::jsonb ),
  ( '{"id": "exp_demo_3", "title": "Electricity bill", "category": "Utilities", "amount": 6800, "date": "2026-10-01", "createdAt": "2026-10-01T10:00:00.000Z", "by": "admin"}'::jsonb )
) as t(v)
where not exists (select 1 from public.expenses e where e.data->>'id' = t.v->>'id');

-- ------------------------------------------------------------
-- 6. ADMIN LOGIN  (email: admin@bshardware2026 / password: bsadmin2026)
-- ------------------------------------------------------------
do $$
declare
  admin_id uuid := gen_random_uuid();
  admin_email text := 'admin@bshardware2026';
  admin_pass  text := 'bsadmin2026';
begin
  if not exists (select 1 from auth.users where email = admin_email) then
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', admin_email,
      crypt(admin_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), admin_id, admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', admin_email),
      'email', now(), now(), now()
    );
  else
    update auth.users
       set encrypted_password = crypt(admin_pass, gen_salt('bf')),
           updated_at = now()
     where email = admin_email;
  end if;
end $$;

-- ------------------------------------------------------------
-- 7. CHECK
-- ------------------------------------------------------------
select 'products' as table_name, count(*) as rows from public.products
union all select 'orders', count(*) from public.orders
union all select 'expenses', count(*) from public.expenses;
