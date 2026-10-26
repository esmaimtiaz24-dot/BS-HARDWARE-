/* ============================================================
   data.js — catalog, categories, payment accounts
   ------------------------------------------------------------
   Products yahan se Firebase par seed hote hain (pehli dafa).
   Admin panel se add/edit/delete karne ke baad Firestore hi
   source of truth ban jata hai.
   ============================================================ */
(function () {
  'use strict';

  var IMG = 'assets/img/products/';

  /* ---------- Categories ---------- */
  var categories = [
    { id: 'tap-fittings', name: 'Taps & Fittings', short: 'Taps, mixers, angle valves', icon: 'water' },
    { id: 'sanitary',     name: 'Bath & Sanitary', short: 'Basins, commodes, showers', icon: 'shower' },
    { id: 'hand-tools',   name: 'Hand Tools',      short: 'Hammers, wrenches, pliers', icon: 'tools' },
    { id: 'pipes',        name: 'Pipes & Fittings',short: 'PVC, CPVC, elbows, tees', icon: 'pipe' },
    { id: 'paint',        name: 'Paint & Finish',  short: 'Emulsion, enamel, brushes', icon: 'paint' },
    { id: 'electrical',   name: 'Electrical',      short: 'Sockets, switches, bulbs', icon: 'bolt' },
    { id: 'door-hardware',name: 'Door Hardware',   short: 'Locks, handles, hinges', icon: 'lock' },
    { id: 'safety',       name: 'Safety Gear',     short: 'Helmets, gloves, vests', icon: 'helmet' }
  ];

  /* ---------- Products ---------- */
  var products = [
    {
      id: 'p-tap-bib',
      name: 'Brass Bib Cock Tap — Chrome Finish',
      category: 'tap-fittings',
      price: 1850, oldPrice: 2400, costPrice: 1180,
      stock: 34, unit: 'piece', brand: 'Master Brass', sku: 'BS-TAP-101',
      badge: 'sale', featured: true,
      image: IMG + 'tap-bib.jpg',
      shortDesc: 'Heavy brass body bib cock with red cross handle — leak-proof ceramic cartridge.',
      description: 'Solid brass bib cock for garden, tank and utility points. Chrome-plated body with a reinforced red cross handle for a firm grip. Fitted with a ceramic disc cartridge that keeps the flow smooth and stops drips even after thousands of turns.',
      highlights: ['Solid brass body, chrome plated', 'Ceramic cartridge — leak-proof', '1/2" BSP inlet, standard Pakistan fitting', 'Tested to 10 bar pressure'],
      specs: [['Material', 'Brass + Chrome'], ['Size', '1/2 inch (15mm)'], ['Handle', 'Cross type, red'], ['Pressure', 'Up to 10 bar'], ['Warranty', '6 months']]
    },
    {
      id: 'p-mixer',
      name: 'Single Lever Wall Mixer — Chrome',
      category: 'tap-fittings',
      price: 4650, oldPrice: 5400, costPrice: 3100,
      stock: 18, unit: 'piece', brand: 'AquaLine', sku: 'BS-MIX-204',
      badge: 'bestseller', featured: true,
      image: IMG + 'mixer.jpg',
      shortDesc: 'Smooth single-lever wall mixer with aerator — ideal for modern bathrooms.',
      description: 'A clean, minimal wall mixer in mirror-chrome finish. One lever controls both temperature and flow, so it works comfortably with wet hands. The built-in aerator softens the stream and saves water.',
      highlights: ['Single lever — hot & cold', 'Mirror chrome finish', 'Neoperl-style aerator included', 'Fits standard 150mm wall distance'],
      specs: [['Material', 'Brass, chrome plated'], ['Cartridge', '35mm ceramic'], ['Inlet', '2 x 1/2 inch'], ['Finish', 'Mirror chrome'], ['Warranty', '1 year']]
    },
    {
      id: 'p-basin',
      name: 'Pedestal Wash Basin — Ceramic White',
      category: 'sanitary',
      price: 14500, oldPrice: 17000, costPrice: 9600,
      stock: 7, unit: 'set', brand: 'SanWare', sku: 'BS-BSN-310',
      badge: 'sale', featured: true,
      image: IMG + 'basin.jpg',
      shortDesc: 'Glossy vitreous china basin with sturdy pedestal — stain resistant and easy to clean.',
      description: 'A classic full-pedestal wash basin for homes, offices and small washrooms. Made from vitreous china with a double-glaze finish so it resists stains, scratches and yellowing. Comes with a pre-drilled hole for standard faucets.',
      highlights: ['Vitreous china, double glaze', 'Includes pedestal + fixing kit', 'Pre-drilled faucet hole', 'Easy-clean curved bowl'],
      specs: [['Material', 'Vitreous china'], ['Size', '22 x 17 inch'], ['Colour', 'Glossy white'], ['Waste', 'Standard 1 1/4"'], ['Package', 'Basin + pedestal']]
    },
    {
      id: 'p-commode',
      name: 'Western Commode — Soft Close Seat',
      category: 'sanitary',
      price: 21500, oldPrice: 24500, costPrice: 15400,
      stock: 12, unit: 'piece', brand: 'SanWare', sku: 'BS-CMD-330',
      badge: '', featured: true,
      image: IMG + 'commode.jpg',
      shortDesc: 'S-trap western commode with soft-close lid and dual flush options.',
      description: 'Full-size western commode with a smooth glazed surface and a whisper-quiet soft-close seat. Dual flush (3L / 6L) keeps water use sensible without losing power. S-trap outlet suits most Pakistani bathroom layouts.',
      highlights: ['Soft-close seat, quick release', 'Dual flush 3L / 6L', 'S-trap 250mm set-out', 'Fully glazed trapway'],
      specs: [['Material', 'Vitreous china'], ['Trap', 'S-trap 250mm'], ['Flush', 'Dual 3L / 6L'], ['Seat', 'Soft close, PP'], ['Warranty', '1 year']]
    },
    {
      id: 'p-hammer',
      name: 'Claw Hammer 16oz — Steel Grip',
      category: 'hand-tools',
      price: 950, oldPrice: 1200, costPrice: 590,
      stock: 46, unit: 'piece', brand: 'ToughGrip', sku: 'BS-TLS-402',
      badge: 'bestseller', featured: true,
      image: IMG + 'hammer.jpg',
      shortDesc: 'Balanced 16oz claw hammer with shock-absorbing handle for daily site work.',
      description: 'Drop-forged steel head, heat treated and polished for a strong strike face. The fibreglass-core handle with rubber over-mould cuts vibration, so long nailing sessions do not punish your wrist.',
      highlights: ['Drop-forged 16oz head', 'Fibreglass core handle', 'Anti-slip rubber grip', 'Ideal for carpentry & site work'],
      specs: [['Weight', '16 oz / 450g'], ['Head', 'Drop forged steel'], ['Handle', 'Fibreglass + rubber'], ['Length', '13 inch']]
    },
    {
      id: 'p-wrench',
      name: 'Adjustable Wrench 10" — Chrome Vanadium',
      category: 'hand-tools',
      price: 780, oldPrice: 950, costPrice: 470,
      stock: 52, unit: 'piece', brand: 'ToughGrip', sku: 'BS-TLS-415',
      badge: '', featured: false,
      image: IMG + 'wrench.jpg',
      shortDesc: 'Smooth-adjust jaw wrench in chrome vanadium steel with measurement scale.',
      description: 'A dependable 10-inch adjustable wrench for plumbing and general maintenance. Chrome vanadium body holds its edge, the worm screw turns smoothly, and the jaw is laser-etched with a scale for quick sizing.',
      highlights: ['Chrome vanadium steel', 'Smooth worm-screw adjustment', 'Jaw scale in mm', 'Red dipped grip'],
      specs: [['Length', '10 inch / 250mm'], ['Jaw opening', '0 – 34mm'], ['Material', 'Chrome vanadium'], ['Finish', 'Polished + dipped grip']]
    },
    {
      id: 'p-lock',
      name: 'Mortice Door Lock Set — Stainless',
      category: 'door-hardware',
      price: 3200, oldPrice: 3900, costPrice: 2050,
      stock: 23, unit: 'set', brand: 'SecureLine', sku: 'BS-LCK-510',
      badge: 'new', featured: true,
      image: IMG + 'lock.jpg',
      shortDesc: 'Satin stainless handle set with 3 keys, mortice body and latch.',
      description: 'Complete mortice lock set for main doors and bedrooms. The satin stainless handle resists fingerprints, and the 3-lever mortice body gives a solid, wobble-free throw. Includes both-side handles, cylinder and three keys.',
      highlights: ['Satin stainless steel finish', '3-lever mortice mechanism', 'Reversible latch — left/right', 'Includes 3 keys + screws'],
      specs: [['Material', 'Stainless steel'], ['Backset', '50mm'], ['Keys', '3 brass keys'], ['Door thickness', '32 – 45mm'], ['Package', 'Handles + body + keys']]
    },
    {
      id: 'p-pipes',
      name: 'PVC Pipe Fittings Combo Kit (1/2")',
      category: 'pipes',
      price: 640, oldPrice: 800, costPrice: 380,
      stock: 120, unit: 'kit', brand: 'AquaLine', sku: 'BS-PIP-620',
      badge: 'sale', featured: false,
      image: IMG + 'pipes.jpg',
      shortDesc: 'Assorted elbows, tees, couplers and end caps — everything for a quick line repair.',
      description: 'A handy starter kit of 1/2-inch PVC fittings: elbows, tees, sockets, reducers and end caps. Made from rigid uPVC with smooth bores so water pressure stays consistent across the run.',
      highlights: ['Rigid uPVC material', '12 fitting pieces in one kit', 'Smooth bore — low pressure loss', 'Solvent-weld compatible'],
      specs: [['Size', '1/2 inch (20mm)'], ['Pieces', '12'], ['Material', 'uPVC'], ['Contents', 'Elbows, tees, sockets, caps']]
    },
    {
      id: 'p-paint',
      name: 'Weather Shield Emulsion Paint — 4L',
      category: 'paint',
      price: 4200, oldPrice: 4800, costPrice: 2950,
      stock: 15, unit: 'bucket', brand: 'ColorMax', sku: 'BS-PNT-710',
      badge: '', featured: false,
      image: IMG + 'paint.jpg',
      shortDesc: 'Low-VOC exterior emulsion that resists rain, sun and dust for up to 5 years.',
      description: 'A creamy, easy-brush exterior emulsion for boundary walls and facades. The acrylic base grips well on plaster and primer, and the weather-block formula keeps colour from fading in harsh Karachi sun.',
      highlights: ['Weather-block acrylic formula', 'Low VOC, low smell', 'Covers approx. 140 sq ft per litre (2 coats)', 'Tintable to 500+ shades'],
      specs: [['Volume', '4 litre'], ['Finish', 'Matt'], ['Coverage', '~560 sq ft (2 coats)'], ['Base', 'Water based acrylic'], ['Drying', '30 min touch dry']]
    },
    {
      id: 'p-socket',
      name: '13A Switch Socket — White',
      category: 'electrical',
      price: 320, oldPrice: 420, costPrice: 185,
      stock: 200, unit: 'piece', brand: 'VoltPro', sku: 'BS-ELE-805',
      badge: 'sale', featured: false,
      image: IMG + 'socket.jpg',
      shortDesc: 'Shutter-protected 13A socket with a crisp red rocker switch.',
      description: 'A dependable 13A wall socket for home and shop wiring. Brass terminals bite the wire firmly, and the internal shutter keeps fingers and dust out. The red rocker switch makes the on/off state obvious at a glance.',
      highlights: ['13A rated, brass terminals', 'Child-safe shutter', 'Fire-retardant ABS body', 'Fits standard 2M boxes'],
      specs: [['Rating', '13 Amp / 250V'], ['Material', 'Fire retardant ABS'], ['Module', '3 pin + switch'], ['Colour', 'White + red']]
    },
    {
      id: 'p-helmet',
      name: 'Safety Helmet — HDPE Yellow',
      category: 'safety',
      price: 1150, oldPrice: 1400, costPrice: 720,
      stock: 60, unit: 'piece', brand: 'SafeSite', sku: 'BS-SAF-902',
      badge: 'new', featured: false,
      image: IMG + 'helmet.jpg',
      shortDesc: 'IS-marked HDPE helmet with ratchet suspension for site crews.',
      description: 'Light, tough HDPE shell with a wide brim for shade. The 6-point ratchet suspension spreads impact away from the crown, and the chin strap keeps it steady on ladders and scaffolding.',
      highlights: ['HDPE shell, UV stabilised', '6-point ratchet suspension', 'Chin strap included', 'Fits 52 – 64 cm head size'],
      specs: [['Material', 'HDPE'], ['Size', 'Adjustable 52–64cm'], ['Weight', '340g'], ['Colour', 'Safety yellow'], ['Standard', 'IS 2925 style']]
    },
    {
      id: 'p-bulb',
      name: 'LED Bulb 12W — Daylight',
      category: 'electrical',
      price: 280, oldPrice: 350, costPrice: 165,
      stock: 0, unit: 'piece', brand: 'VoltPro', sku: 'BS-ELE-818',
      badge: '', featured: false,
      image: IMG + 'bulb.jpg',
      shortDesc: 'Energy-saving 12W LED with 1200 lumens daylight output.',
      description: 'Bright, flicker-free LED bulb for drawing rooms and shop counters. The wide diffuser spreads light evenly, while the surge-protected driver handles voltage swings common on local feeders.',
      highlights: ['12W = approx. 100W incandescent', '6500K daylight white', 'Surge protected driver', 'B22 pin base'],
      specs: [['Power', '12 Watt'], ['Lumens', '1200 lm'], ['Base', 'B22 pin'], ['Colour temp', '6500K'], ['Life', '25,000 hours']]
    }
  ];

  /* ---------- Payment methods / accounts ---------- */
  /* IMPORTANT: numbers aur account names wahi rakhein jo customer ko dikhane hain */
  var payments = [
    {
      id: 'easypaisa', type: 'wallet', label: 'Easypaisa',
      sub: 'Mobile account transfer', number: '03343052163', name: 'Imtiaz Ahmed',
      color: 'ep', requiresProof: true
    },
    {
      id: 'jazzcash', type: 'wallet', label: 'JazzCash',
      sub: 'Mobile account transfer', number: '03300319849', name: 'Irbaz store',
      color: 'jc', requiresProof: true
    },
    {
      id: 'cod', type: 'cod', label: 'Cash on Delivery',
      sub: 'Delivery charges Rs 250 · cash at your door', number: '', name: '',
      color: 'cod', requiresProof: false
    }
  ];

  window.BS = window.BS || {};
  window.BS.data = {
    categories: categories,
    products: products,
    payments: payments,
    categoryName: function (id) {
      var c = categories.filter(function (x) { return x.id === id; })[0];
      return c ? c.name : id;
    }
  };
})();
