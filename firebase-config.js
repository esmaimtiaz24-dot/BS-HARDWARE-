/* ============================================================
   firebase-config.js
   ------------------------------------------------------------
   1. Create a project at console.firebase.google.com
   2. Project settings > General > "Your apps" > add a Web app
   3. Replace the PASTE_ values below with the ones from that app

   NOTE: While any value still says "PASTE_", the site keeps its
         data in the browser's localStorage, so every feature can be
         tested without a backend. As soon as real values are pasted
         (or window.BS_SUPABASE is filled in) the app switches over
         by itself:
           • databaseURL set  -> Realtime Database + Storage + Auth
           • only projectId   -> Firestore + Storage + Auth

   Supabase is the recommended database: run supabase-setup.sql once, then fill
   window.BS_SUPABASE below. Realtime Database / Firestore stay available.
   ============================================================ */

window.BS_FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",

  /* ---- Realtime Database ----
     Console > Build > Realtime Database > Create database, then copy the URL
     (https://<project>-default-rtdb.<region>.firebasedatabase.app) and paste it
     here. Filling this line moves the site onto Realtime Database — Firestore
     is not needed. */
  databaseURL: "PASTE_DATABASE_URL",

  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_APP_ID",
  measurementId: ""
};

/* ---- Backend selection ----
   "auto"      : Realtime Database when databaseURL is filled in, otherwise Firestore
   "rtdb"      : always Realtime Database
   "firestore" : always Firestore
*/
window.BS_CONFIG = window.BS_CONFIG || {};
window.BS_CONFIG.backend = "auto";

/* ---------- Supabase (primary database) ----------
   Supabase dashboard -> Settings -> API:
     • Project URL      -> url
     • anon public key  -> anonKey
   Fill these two lines and the site runs on Supabase. The database tables,
   rules, starting catalogue and the admin login are created by pasting
   supabase-setup.sql in Supabase -> SQL Editor (one time, no other setup). */
window.BS_SUPABASE = {
  url: "",
  anonKey: ""
};

/* ---------- Store settings (used by the storefront and the admin panel) ---------- */
window.BS_SETTINGS = {
  storeName: "BS Hardware And Sanitary",
  tagline: "Hardware & Sanitary you can trust",
  currency: "PKR",

  /* WhatsApp: only an icon is shown; clicking it opens the chat */
  whatsapp: "923102902382",         // international format, no +
  phone: "+92 310 2902382",
  email: "orders@bshardware.pk",
  address: "Orangi Town, Karachi, Pakistan",
  openingHours: "Mon – Sat · 9:00 AM – 9:00 PM",

  /* WhatsApp order confirmation: open WhatsApp automatically after the
     order is placed (true) or only when the button is pressed (false). */
  waAutoConfirmAfterOrder: false,

  /* Delivery */
  deliveryFee: 250,
  freeDeliveryOver: 0,              // 0 = free-delivery rule off (always Rs 250)
  codEnabled: true,

  /* Loyalty / simple coupon (client-side) */
  coupons: { BS10: 10, WELCOME5: 5 },   // code : discount %

  /* Built-in admin password — used only until a database is connected */
  adminDemoPassword: "bsadmin2026",
  adminEmail: "admin@bshardware2026",

  /* Mobile top-bar text */
  announce: "COD available · Genuine brands · Orangi Town, Karachi"
};
