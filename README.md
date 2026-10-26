# BS Hardware And Sanitary — Complete Ecommerce Website

An online store for hardware and sanitary products. **Premium oxblood + brass + ivory** theme (built on the layout
language of the Row Creative "Bold" template), a GSAP intro animation, a Firebase Realtime Database backend (Firestore also supported) and a full admin panel.

Everything on the site is written in **English**. The catalogue, cart, checkout, FAQs, admin panel and this README
all use the same voice.

---

## 1. What is built

**Customer side**

| Page | File | Features |
|---|---|---|
| Home | `index.html` | Branded preloader (logo + wordmark), hero v4, categories, bestsellers, why-BS, new arrivals, bulk/contractor band, testimonials, payments, newsletter |
| Shop | `shop.html` | Category filters, price range, in-stock / on-sale filters, 5 sort options, search, URL-based state |
| Product | `product.html?id=...` | Gallery + thumbnails, qty stepper, stock status, Add to cart / Buy now, description + specs tabs, related products |
| Cart | `cart.html` | Qty +/−, remove, clear, coupon (`BS10`, `WELCOME5`), live totals, Rs 250 delivery, suggestions |
| Checkout | `checkout.html` | Address form + validation, 3 payment options, account number/name shown automatically, **transaction ID + screenshot upload (both required)**, COD support |
| Order success | `order-success.html` | Order number, full order detail, payment proof preview, copy order number, WhatsApp confirmation card |
| Track order | `track.html` | Status timeline from the order number (pending → confirmed → delivered) |
| FAQs | `faqs.html` | 21 questions in 4 groups — search, category chips, expand/collapse all, deep links (`#faq-payments`), JSON-LD FAQPage schema |
| Admin login | `admin-login.html` | Firebase Auth email/password (password only in demo mode) |
| Admin panel | `admin.html` | Dashboard stats, sales-vs-profit chart, low-stock alerts, product CRUD + image upload + stock update, orders table with payment method / transaction ID / **screenshot proof**, status update (pending / confirmed / delivered / cancelled) |

**Global**

- WhatsApp floating icon (icon only, no number text) → `https://wa.me/923102902382`
- The footer also carries an **icon-only** WhatsApp button (no number text) plus track-order and shop icons
- Address: **Orangi Town, Karachi, Pakistan**
- Sticky header, search drawer, mobile slide-in menu, toast notifications, scroll-reveal animations
- All fonts / Bootstrap / jQuery / GSAP are **bundled locally** — the site works without internet
- The cart lives in `localStorage`, so a refresh does not lose it
- Data runs on **Supabase** (`supabase-setup.sql` + two lines in `js/firebase-config.js`), with **Firebase Realtime Database** and Firestore as drop-in alternatives — see **§4-C** and **§4-B**

---

## 2. WhatsApp order confirmation

An order can reach WhatsApp from three places — the **message is pre-filled**, the customer never types a number:

| Where | What happens |
|---|---|
| **Right after Add to cart** | The toast carries a green **"WhatsApp order →"** button — one tap builds the full cart message (items, qty, prices, subtotal, delivery, total) |
| **Cart page** | **"Confirm order — WhatsApp"** under the summary — same message |
| **After placing the order** | The order-success page shows a green card with **"Send confirmation"** — order number + status + items + customer + payment + transaction ID + screenshot status, all in the message |

The message goes to the store number `923102902382`; the customer only presses **Send**.
Want it to open automatically? `js/firebase-config.js` → `waAutoConfirmAfterOrder: true` (WhatsApp opens the moment the order is placed).

The footer and topbar contain **no number text** — only the WhatsApp **icon** (plus a track-order icon).

---

## 2-A. Payment accounts (shown to the customer at checkout)

| Method | Number | Account name |
|---|---|---|
| Easypaisa | 03343052163 | Imtiaz Ahmed |
| JazzCash | 03300319849 | Irbaz store |
| Cash on Delivery | — | Pay the rider, Rs 250 delivery included |

Choosing an online method shows the number + account name in a card (with a copy button) and opens the
transaction ID field and the screenshot upload box. The order will not submit without both.

> Need to change numbers or names? Edit the `payments` array in `js/data.js`.

---

## 2-B. Footer design

**The footer is three separate sections** (it used to be one dark block):

| Section | Look |
|---|---|
| **1. Oxblood CTA band** | Full-width deep-red gradient + brass grid pattern, large serif headline *"Send the list, get the rate."* + outlined gold **Order on WhatsApp** button, gold hairline strip |
| **2. Cream body** | Ivory background, brass dot pattern (fade-out mask), 4 columns (brand + blurb + social icons, Shop, Categories, Visit), gold icon boxes, and a large **"BS HARDWARE" outline watermark** cut off at the bottom |
| **3. Ink bottom bar** | Thin dark bar — copyright + FAQs / Track Order / Admin links |

> The footer has **no delivery charges, no payment-method names and no phone-number text** — only the icon-only WhatsApp (green) plus track and shop icons.

---

## 2-C. Premium theme, logo, hero & FAQs

**Theme tokens** (`css/style.css` → section **36**):

| Token | Value | Where |
|---|---|---|
| `--red` | `#a3130b` oxblood (was `#e8160c`) | buttons, accents, CTA band |
| `--gold` / `--gold-2` / `--gold-deep` | `#c09a54` / `#e8d3a3` / `#8a6a2f` | hairlines, icons, badges, focus rings |
| `--cream` / `--paper` | `#f7f3ec` / `#ffffff` | page + cards |
| `--ink` | `#121110` | text, dark bands |
| `--font-serif` | `'Playfair Display'` (local woff2, 600/700) | all headings, logo wordmark, prices, footer headline |

- Hard offset shadows (`8px 8px 0`) replaced by soft premium shadows + gold hairlines
- Cards get a 1px `--line-soft` border, `translateY(-4/-6px)` lift + soft shadow on hover
- Display headings are `text-transform:none` (sentence case, editorial serif); labels/buttons/tickers stay uppercase sans
- Fonts: `assets/fonts/playfair-600.woff2`, `playfair-700.woff2` — these work **offline**

**Hero v3** (`index.html` + `css/style.css` → sections **37** and **37.1**):

- Full-colour composition — a rotated oxblood deco block with a 46px brass grid, three side rails (`r-red` / `r-ink` / `r-gold`)
- Headline *"Hardware & **Sanitary.** Built solid."*, pill **"Only in Karachi"**, eyebrow "Orangi Town · Since 2009"
- Three stat tiles and mini tags: "Rs 250 / Flat delivery · Karachi", "COD / Cash on delivery", "7 Days / Easy exchange"
- §37.1 draws the frame as a clean 10px ivory (`#fbf8f2`) inset border plus a soft oxblood gradient over the bottom 34%, and pins the frame animation off so nothing drifts

**Logo lockup** (`js/ui.js → brandMarkSVG()` + `brandLockup()`):

- Oxblood squircle tile (72×72, `rx13`) + **double brass hairline frame** + **BS** monogram (Playfair 700, ivory) + a short brass rule
- Wordmark: **BS Hardware** (serif) + brass rule + `AND SANITARY` (gold, letterspaced) + bordered **KARACHI** tag
- Hover: slight tilt and lift; dark surfaces (admin) get the cream/gold version
- Header, mobile menu, footer, admin top bar and admin login all use the same lockup
- `assets/img/logo.svg` + `assets/img/favicon.svg` match

**Preloader** (`index.html` + every customer page, `js/main.js` + `css/style.css` §39):

- Full-screen oxblood stage with a faint brass grid and a warm radial glow
- Cream logo plate holding the BS tile, with a thin brass ring that rotates around it
- Wordmark: **BS Hardware** (Playfair) over a gold rule, then **& SANITARY** letterspaced in brass
- Thin brass progress bar, "Orangi Town · Karachi", and a **Skip** button (Esc / Enter / Space also dismiss it)
- Runs ~1.9s, then lifts away and hands over to the page; `body` scroll is released at the same moment
- **Once per session** (`sessionStorage`), never blocks the page load — content renders behind it
- Pure CSS animation, so it works without GSAP; a 6s CSS failsafe hides it even if scripts never run
- `?intro=1` replays it; `prefers-reduced-motion` skips it entirely

**FAQs page** (`faqs.html` + `js/faqs.js`):

- **21 questions, 4 groups:** Orders & delivery (6) · Payments & verification (5) · Products, stock & pricing (5) · Exchange, returns & support (5)
- **Search** (live filter), **category chips**, **Expand all / Collapse all**, single-open accordion, `aria-expanded` states
- Deep links: opening `faqs.html#faq-payments` expands the first question in that group
- To change content, edit the `.faq-item` blocks in `faqs.html` directly (it is plain HTML, not a JS array)
- Both online accounts appear in the payments answers (Easypaisa / JazzCash) with number + account name
- Delivery answer: Karachi **Rs 250**, Orangi Town pickup free — the footer never shows charges
- `<script type="application/ld+json">` FAQPage schema (for Google rich results)
- Every page's nav and footer link to **FAQs**; `preview.html` has a card too

---

## 3. File structure

```
bs-hardware/
├── index.html                 # Home (intro animation, hero v3)
├── shop.html                  # Product listing + filters
├── product.html               # Product detail
├── cart.html                  # Cart
├── checkout.html              # Checkout + payment proof
├── order-success.html         # Confirmation
├── track.html                 # Order tracking
├── faqs.html                  # FAQs (21 questions, search + chips + accordion)
├── preview.html               # Preview map (for the client demo)
├── admin-login.html           # Admin login
├── admin.html                 # Admin dashboard
├── database.rules.json       # Realtime Database rules (strict: orders are admin-only reads)
├── database.rules.track.json # Same, but /orders readable so guests can track orders
├── firebase-database.seed.json # 12 products + 4 expenses, ready to import into Realtime Database
├── css/
│   └── style.css              # Design system + §36 premium/FAQ layer + §37 hero v3
├── js/
│   ├── firebase-config.js     # ← paste your Firebase config here + store settings
│   ├── firebase-service.js    # Data layer — Realtime Database / Firestore / Storage / Auth + demo fallback
│   ├── data.js                # Categories, demo products, payment accounts
│   ├── store.js               # Cart engine + helpers (money, dates, escaping)
│   ├── ui.js                  # Header/footer shell, logo lockup, product cards, toasts, cart badge
│   ├── faqs.js                # FAQ accordion, search, category chips, deep links
│   ├── icons.js               # Inline SVG icon set
│   ├── main.js                # GSAP intro, hero entrance, counters
│   ├── home.js / shop.js / product.js / cart.js / checkout.js
│   ├── whatsapp-order.js      # WhatsApp order message builder (cart + placed order)
│   ├── order-view.js / order-success.js / track.js
│   └── admin-login.js / admin.js
├── assets/
│   ├── vendor/                # bootstrap, jquery, gsap (local)
│   ├── fonts/                 # Playfair Display 600/700 + Archivo Black + Inter (woff2)
│   └── img/                   # products (12 real photos), logo.svg (brass BS monogram), favicon
├── docs/screenshots/          # 20 site screenshots
└── README.md
```

---

## 4. Firebase setup (5 minutes)

### 4.1 Create the project
1. <https://console.firebase.google.com> → **Add project** → name it `bs-hardware` → Create.
2. **Build → Authentication** → *Get started* → **Sign-in method** → enable **Email/Password**.
3. **Users** tab → **Add user**:
   - Email: `admin@bshardware.pk`
   - Password: a strong password (this becomes the admin login)
4. **Build → Firestore Database** → *Create database* → **Start in production mode** → region `asia-south1` (or the nearest one).
5. **Build → Storage** → *Get started* → production mode.

### 4.2 Web app config
6. Project settings (⚙️) → **General** → *Your apps* → `</>` (Web) → register the app as `bs-web`.
7. Paste the `firebaseConfig` object you get into `js/firebase-config.js`:

```js
window.BS_FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "bs-hardware.firebaseapp.com",
  projectId: "bs-hardware",
  storageBucket: "bs-hardware.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

That is all. The site switches from **demo mode** to **live Firebase** by itself
(admin login then runs through Firebase Auth).

### 4.3 Security rules

**Firestore rules** (Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Products: anyone can read, only the admin can write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Orders: the customer can create, only the admin can read/update
    match /orders/{orderId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // Expenses: admin only
    match /expenses/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage rules** (Storage → Rules):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Payment screenshots — the customer uploads these
    match /payment-proofs/{file} {
      allow write: if request.resource.size < 6 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow read: if true;      // the admin panel displays the image
    }
    // Product images — admin only
    match /products/{file} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

### 4.4 Import products the first time
- `admin.html` → log in → **Dashboard → "Import demo products"** → the 12 ready products go into Firestore.
- After that use **Products → Add product** to upload your own products and images.

### 4.5 (Optional) Firestore index
Order tracking runs an `orderNumber ==` query on `orders` — a single field, so no index is needed.
If the console ever shows a composite-index link, click it and let it build.

---

## 4-B. Realtime Database (default backend)

The site runs on **Firebase Realtime Database** by default. Firestore still works — the data layer picks a
backend from your config, so you never edit the code.

| `BS_CONFIG.backend` | `databaseURL` present | Backend used |
|---|---|---|
| `"auto"` (default) | yes | **Realtime Database** |
| `"auto"` | no | Firestore |
| `"rtdb"` | yes | Realtime Database |
| `"rtdb"` | no | Firestore (a console warning is logged) |
| `"firestore"` | yes or no | Firestore |

Demo mode (localStorage) is used only while `apiKey` / `projectId` still contain the `PASTE_` placeholder,
or when the Firebase SDK cannot load.

### 4-B.1 Create the database
1. <https://console.firebase.google.com> → your project → **Build → Realtime Database → Create Database**.
2. Pick a location near your customers (`asia-southeast1` for Pakistan), start in **locked mode**.
3. Copy the URL at the top of the Data tab — it looks like
   `https://bs-hardware-default-rtdb.asia-southeast1.firebasedatabase.app`.

### 4-B.2 Put the URL in the config
Open `js/firebase-config.js` and set `databaseURL`:

```js
window.BS_FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "bs-hardware.firebaseapp.com",
  databaseURL: "https://bs-hardware-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bs-hardware",
  storageBucket: "bs-hardware.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};

window.BS_CONFIG = {
  backend: "auto"   // "auto" | "rtdb" | "firestore"
};
```

Paste the `firebaseConfig` values straight into `js/firebase-config.js`. Nothing has to be installed and
there is no setup screen inside the site.

### 4-B.3 Publish the rules
**Realtime Database → Rules →** paste the file `database.rules.json` → **Publish**.

- `products` — public read, write only when an admin is signed in
- `orders` — create allowed for anyone (guest checkout), read/update only when signed in
- `expenses` — admin only
- `$other` — closed

**Order tracking and privacy.** The strict rules keep `/orders` readable only when an admin is signed in,
so a guest who opens `track.html` is told to message the shop on WhatsApp with their order number.
If you want guests to track orders themselves, publish `database.rules.track.json` instead — it makes
`/orders` publicly readable (writes stay admin-only). Be aware that public read means anyone holding your
database URL can read every order, including customer names, phones and addresses; for a small shop that is
usually acceptable, for a busy one keep the strict file. Track order compares order numbers in **uppercase** —
the site always stores them uppercase.

### 4-B.4 Import the starting catalogue
**Realtime Database → Data → ⋮ → Import JSON** → choose `firebase-database.seed.json`.
It creates `/products` (12 products with `costPrice`, so Profit & Loss works) and `/expenses`
(rent, delivery, packaging, utilities). After that use **Admin → Products → Add product**.

### 4-B.5 Turn on the admin login
**Authentication → Sign-in method → Email/Password → Enable**, then **Users → Add user**
(e.g. `admin@bshardware.pk`). Any signed-in user can write — for a single shop that is enough.
Expenses are hidden from the customer pages entirely.

### 4-B.6 What the tree looks like
```
/products/{pushId}   name, price, costPrice, stock, category, image, createdAt …
/orders/{pushId}     orderNumber, customer, items, subtotal, delivery, total,
                     paymentMethod, txnId, screenshot, status, statusHistory,
                     createdAt (ISO string), updatedAt
/expenses/{pushId}   title, category, amount, date, createdAt
```

### 4-B.7 Demo chrome switches itself off
While the config still says `PASTE_`, the admin header shows a **Demo mode** chip, the Store status card
shows a **Data mode** row and there are *Import demo products / Reset demo data* buttons — all of them are
demo tools. The moment a real config is in place (`BS.fb.mode` becomes `rtdb` or `firebase`) the body gets
the `is-live` class, `css/style.css` §40 hides `#modeChip`, `.demo-only` and the demo note, and the admin
panel shows only real store data. Nothing has to be deleted by hand, and going back to demo mode (empty
config) brings the helpers back.

Notes
- Realtime Database has no `serverTimestamp()`, so `createdAt` / `updatedAt` are ISO strings — every page
  and the admin panel already sort on them.
- `statusHistory` is an array appended inside the browser (no `arrayUnion` in RTDB).
- The push key is also stored as `id` on each record, so both backends return the same objects.
- Payment screenshots still go to **Storage** (`payment-proofs/`) and only the URL is stored — that keeps
  the database small. If Storage is not enabled the file is saved as a compressed data-URL instead.

---

## 4-C. Supabase (recommended)

Supabase is a hosted Postgres with auth, storage and a REST API. The site talks to it directly, so there is
**no setup page and no extra option inside the site** — two steps and it is live.

### 4-C.1 Run the SQL (once)
1. <https://supabase.com> → your project → **SQL Editor** → **New query**.
2. Paste the whole `supabase-setup.sql` file → **Run**.
3. The script creates:
   - tables `products`, `orders`, `expenses` (each row is `id`, `data jsonb`, `created_at`)
   - row-level security: products readable by everyone, writable by the admin; orders created by guests and
     readable/updatable by the admin; expenses admin-only
   - storage buckets `products` and `payment-proofs`
   - the 12 starting products and 4 sample expenses
   - the admin login — **email `admin@bshardware2026`, password `bsadmin2026`**

### 4-C.2 Fill in two lines
Supabase → **Settings → API**:

```js
window.BS_SUPABASE = {
  url: "https://xxxxxxxx.supabase.co",   // Project URL
  anonKey: "eyJhbGciOi..."               // anon public key
};
```

The site switches to Supabase by itself (`BS.fb.backend` becomes `Supabase`). Admin login then uses the
account created by the SQL — the demo password stops working, and the login form shows
`admin@bshardware2026` already filled in.

### 4-C.3 Notes
- Order tracking works for guests because the SQL lets `orders` be read publicly; tighten that policy in
  `supabase-setup.sql` (commented line) if you want it admin-only.
- Payment screenshots upload to the `payment-proofs` bucket and only the public URL is stored in the order.
- Nothing else to configure — no keys in the HTML, no build step, no console pages to open.

---

## 5. Local run

```bash
# Any static server will do (file:// works too, but a server is better)
cd bs-hardware
python3 -m http.server 8080
# or
npx serve .
```
Then open <http://localhost:8080>

**Demo mode** (without pasting a Firebase config):
- Products + orders are stored in the browser's `localStorage`
- Admin password: **`bsadmin2026`** → `js/firebase-config.js` → `adminDemoPassword`
- Admin panel → "Reset demo data" to return to a clean state

---

## 6. Deploy

**Firebase Hosting (recommended)**
```bash
npm i -g firebase-tools
firebase login
firebase init hosting     # public directory: .   (single-page rewrites: No)
firebase deploy --only hosting
```

**Netlify / Vercel** — drag and drop the folder (no build command, publish directory = root).

**cPanel / shared hosting** — upload every file into `public_html`.

---

## 7. Customization cheat-sheet

| What you want to change | Where |
|---|---|
| Store name, phone, WhatsApp number, address, opening hours, delivery fee, coupon codes | `js/firebase-config.js` → `BS_SETTINGS` |
| Payment accounts (number + name) | `js/data.js` → `payments` |
| Categories | `js/data.js` → `categories` |
| Demo products (name, price, specs) | `js/data.js` → `products` |
| Colours (oxblood `#a3130b`, cream, ink) | `css/style.css` → `:root` |
| Intro animation timing | `js/main.js` → `runGSAP()` timeline |
| Logo | `assets/img/logo.svg` (and `brandMarkSVG()` in `js/ui.js`) |
| Currency format | `js/store.js` → `money()` |

---

## 7-B. Admin panel — Inventory, Sales, Profit & Loss

The admin panel is not just an order list — it is a complete **business dashboard**.

### Tabs
| Tab | What you get |
|---|---|
| **Dashboard** | Net sales (30 days), gross profit + margin, **net profit** + margin, inventory value (cost/retail), orders, pending, **AOV**, units sold, low/out of stock, recent orders, a **14-day sales-vs-profit bar chart**, low-stock alerts |
| **Products (Inventory)** | Every product's **cost price, margin % badge, stock value (cost + retail)**, inline stock update, add/edit (a new `Cost price` field with a live margin hint), delete |
| **Orders** | Payment method, transaction ID, proof screenshot, a **per-order profit** column, status update, **Export CSV** |
| **Reports & P&L** | Range selector (Today / 7 / 30 days / This month / All time / **custom dates**), KPI cards, a **proper P&L statement**, sales-vs-profit chart, **top products** (units, sales, cost, profit, margin), **payment + category breakdown meters**, **inventory valuation**, expenses summary, **Export P&L CSV** |
| **Expenses** | Add/delete an expense (title, amount, date, category), category filter, totals (all-time, this month, biggest category), "Add sample expenses" |

### P&L formula
```
Gross profit   = Net sales − COGS
Net sales      = Sales − Discounts
COGS           = Σ (cost price × qty)      ← snapshotted when the order is placed
Net profit     = Gross profit + Delivery collected − Expenses
Margins        = profit ÷ net sales × 100
```
- Every order stores `cogs` and `items[].cost`, so changing a cost price later never distorts past reports.
- Where a product has no cost price, the estimate is **65% of the selling price** (the report shows a "Missing cost price" count — fix it from `Products`).

### New data
- Product: `costPrice` (pre-filled on all 12 demo products)
- Order: `cogs`, `items[].cost`, `items[].costLine`, `items[].category`
- Firestore collection **`expenses`** → `{ title, amount, date, category, by, createdAt }`

---

## 8. Order object (`orders` node in Realtime Database / `orders` collection in Firestore)

```js
{
  orderNumber: "BS-261025-4821",
  customer: { name, phone, email, city, address, landmark, note },
  items: [{ id, name, sku, price, qty, line, image, cost, costLine, category }],
  subtotal, discount, delivery, total, itemCount, coupon, cogs,
  payment: {
    methodId: "jazzcash", method: "JazzCash", type: "wallet",
    accountNumber: "03300319849", accountName: "Irbaz store",
    transactionId: "JC77123456",
    screenshotUrl: "https://firebasestorage.googleapis.com/...",
    proofUploaded: true,
    status: "pending-verification"        // "cod-pending" on COD
  },
  status: "pending",                       // pending | confirmed | delivered | cancelled
  statusHistory: [ { status, at, by } ],
  createdAt: <ISO string in Realtime Database / serverTimestamp in Firestore>
}
```

Screenshot Storage folder: `payment-proofs/`, product images: `products/`.

---

## 9-B. Motion / animation layer (`js/animations.js`)

The site is animated throughout:

| # | Animation | Where |
|---|---|---|
| 1 | **Branded preloader** — oxblood stage, brass grid, cream logo plate with a spinning brass ring, wordmark + progress bar that lifts away; then the page curtain wipe | Every page (first load of a session) |
| 2 | **Scroll progress bar** (top) + **back-to-top** button (bottom-left) | All pages |
| 3 | **Word-by-word heading reveal** (split-text, GSAP) | Hero, page heads, product title, section headings |
| 4 | **Product card stagger** — also on dynamic renders (MutationObserver) | Home / Shop / Cart / Product related |
| 5 | **Mouse spotlight** — a red glow follows the cursor over a card | Product cards (desktop) |
| 6 | **Parallax** — the big "BS HARDWARE" word + images in the hero | Home |
| 7 | **Rotating sticker badge** ("100% GENUINE · COD · KARACHI") | Hero |
| 8 | **Floating elements** — hero frame, delivery tag, squares, WhatsApp icon | Hero + floating |
| 9 | **Dual marquee tickers** (opposite directions) | Home |
| 10 | **Moving diagonal stripes** — red & ink sections | Home / checkout blocks |
| 11 | **Button shine sweep** + icon slide | All buttons |
| 12 | **Card hover lift** — shadow-hard + tilt | Products, categories, testimonials, trust |
| 13 | **Topbar auto-collapse** with the sticky header (`.nav-compact`) | All pages |
| 14 | **Badge pop**, **row slide-in**, **live cart bump**, **toast slide** | Cards / cart / admin tables |
| 15 | **Reduced-motion support** — everything off under `prefers-reduced-motion: reduce` | All pages |

All animations use `gsap.from()` + `clearProps` or are CSS-only — meaning **no content stays permanently
hidden**, and the site stays fully visible even if GSAP fails to load.

---

## 9. Testing checklist (all passing)

- [x] Preloader (logo + "BS Hardware & Sanitary") — 1.9s, skip button, Esc/Enter, once per session, never blocks load
- [x] Cart add / qty update / remove / coupon / totals
- [x] Checkout validation (name, phone, address, payment, T&C)
- [x] Online payment → account details + transaction ID + screenshot all required
- [x] Order save (order number generated)
- [x] Order success + tracking timeline
- [x] Admin login, dashboard stats, product add/edit/delete, stock update
- [x] Admin orders: payment method, transaction ID, screenshot proof modal, status update, per-order profit
- [x] Admin analytics: net sales, COGS, gross/net profit, margins, AOV, inventory valuation
- [x] Reports & P&L with date ranges + top products + payment/category breakdowns
- [x] Expenses CRUD + expenses deducted in P&L
- [x] CSV exports (orders, P&L, inventory)
- [x] Motion layer: curtain transitions, split-text, card stagger, parallax, spotlight, tickers
- [x] Footer: icon-only WhatsApp, no phone-number text, no delivery charges or payment-method names
- [x] WhatsApp order confirmation — add-to-cart toast, cart button, order-success card (message pre-filled)
- [x] Footer icon-only WhatsApp + Orangi Town address
- [x] Hero v3 renders clean at 1440px (no frame drift, zero console errors)
- [x] Full site copy in English, "Only in Karachi" on the home page
- [x] Mobile layout (390px), tablet, desktop — zero console errors
- [x] Reduced-motion mode — animations off, content visible

---

© BS Hardware And Sanitary — Karachi. Delivery Rs 250 · COD + Easypaisa / JazzCash.

---

## 10. Screenshots (`docs/screenshots/`)

| File | What it shows |
|---|---|
| `home.png` / `home-full.jpg` | Home — hero fold + the full page |
| `shop.png` / `shop-full.jpg` | Shop listing — filters + product cards |
| `faqs.png` / `faqs-answer.png` / `faqs-full.jpg` | FAQs — toolbar, accordion (open + closed state) |
| `product.png` | Product detail — gallery, price, tabs |
| `cart.png` / `checkout.png` | Cart summary + checkout payment options |
| `header-logo.png` / `footer.png` | The brass logo lockup + premium footer bands |
| `admin-login.png` / `admin-dashboard.png` / `admin-orders.png` / `admin-reports.png` / `admin-expenses.png` | Every admin pane |
| `preview-map.png` | The full `preview.html` map |

All screenshots are 1300px wide (full-page JPEGs at 1000px) — ready for a README or GitHub.
