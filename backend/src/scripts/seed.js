import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Restaurant, MenuItem } from '../modules/catalog/catalogModel.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dropp_db';

// ─── Restaurant image placeholders ───────────────────────────────────────────
// When your app team adds image upload, replace these URLs with real ones.
const IMAGES = {
  biryani:  'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=85',
  thali:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&auto=format&fit=crop&q=85',
  cafe:     'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=700&auto=format&fit=crop&q=85',
  pizza:    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=85',
  south:    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700&auto=format&fit=crop&q=85',
  chinese:  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&auto=format&fit=crop&q=85',
  burger:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85',
  nonveg:   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&auto=format&fit=crop&q=85',
  brewery:  'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=700&auto=format&fit=crop&q=85',

  // Menu items
  chickenBiryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=75',
  pizzaItem:      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=75',
  coldBrew:       'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&auto=format&fit=crop&q=75',
  dosa:           'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&auto=format&fit=crop&q=75',
  noodles:        'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=300&auto=format&fit=crop&q=75',
  thaliItem:      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=75',
  burgerItem:     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=75',
  kebabItem:      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&auto=format&fit=crop&q=75',
  beerItem:       'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&auto=format&fit=crop&q=75',
};

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected to MongoDB');

  await Restaurant.deleteMany({});
  await MenuItem.deleteMany({});
  console.log('[Seed] Cleared old catalog data');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 1 — Bawarchee Biryani House
  // Category: Biryani, Mughlai, North Indian
  // ═══════════════════════════════════════════════════════════════════════════
  const bawarchee = await Restaurant.create({
    name: 'Bawarchee Biryani House',
    slug: 'bawarchee-biryani-house',
    cuisine: ['Mughlai', 'Biryani', 'North Indian'],
    image: IMAGES.biryani,
    rating: 4.5,
    deliveryTimeMins: 35,
    isOpen: true,
    pricing: { minOrder: 149, costForTwo: 450 },
    address: { city: 'Delhi', pincode: '110006' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: bawarchee._id,
      name: 'Chicken Dum Biryani',
      nameAliases: ['chicken biryani', 'murga biryani', 'dum biryani', 'biryani', 'chicken dum', 'murgh biryani'],
      category: 'Biryani',
      price: 249,
      isVeg: false,
      isAvailable: true,
      description: 'Slow-cooked dum-style chicken with saffron basmati rice & caramelised onions',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Veg Dum Biryani',
      nameAliases: ['veg biryani', 'sabzi biryani', 'vegetable biryani', 'veggie biryani'],
      category: 'Biryani',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Seasonal vegetables slow-cooked with saffron & whole spices',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Mutton Biryani',
      nameAliases: ['gosht biryani', 'lamb biryani', 'mutton dum', 'mutton', 'gosht'],
      category: 'Biryani',
      price: 319,
      isVeg: false,
      isAvailable: true,
      description: 'Tender mutton cooked with whole spices in layered basmati',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Chicken Tikka',
      nameAliases: ['tikka', 'tandoori chicken', 'murgh tikka', 'chicken starter'],
      category: 'Starters',
      price: 229,
      isVeg: false,
      isAvailable: true,
      description: 'Marinated chicken chunks grilled in tandoor with chaat masala',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Seekh Kebab (6 pcs)',
      nameAliases: ['seekh', 'kabab', 'seekh kabab', 'mutton seekh', 'kebab'],
      category: 'Starters',
      price: 259,
      isVeg: false,
      isAvailable: true,
      description: 'Minced mutton seekh with coriander chutney & onion rings',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Raita',
      nameAliases: ['raita', 'dahi', 'yoghurt', 'curd'],
      category: 'Sides',
      price: 49,
      isVeg: true,
      isAvailable: true,
      description: 'Chilled boondi raita with mint & cumin',
      image: IMAGES.thali,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Coke',
      nameAliases: ['cola', 'cold drink', 'thanda', 'soft drink', 'pepsi', 'limca', 'fanta'],
      category: 'Beverages',
      price: 60,
      isVeg: true,
      isAvailable: true,
      description: 'Chilled Coca-Cola 330ml',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: bawarchee._id,
      name: 'Sweet Lassi',
      nameAliases: ['lassi', 'meethi lassi', 'dahi lassi', 'lassi drink'],
      category: 'Beverages',
      price: 79,
      isVeg: true,
      isAvailable: true,
      description: 'Thick creamy yoghurt blended with sugar & cardamom',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Bawarchee Biryani House — 8 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 2 — Maa ka Dhaba (North Indian Thali)
  // Category: Thali, Dal Makhani, Roti, North Indian
  // ═══════════════════════════════════════════════════════════════════════════
  const maakaDhaba = await Restaurant.create({
    name: "Maa ka Dhaba",
    slug: 'maa-ka-dhaba',
    cuisine: ['North Indian', 'Thali', 'Punjabi'],
    image: IMAGES.thali,
    rating: 4.6,
    deliveryTimeMins: 30,
    isOpen: true,
    pricing: { minOrder: 99, costForTwo: 350 },
    address: { city: 'Delhi', pincode: '110007' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: maakaDhaba._id,
      name: 'Full Veg Thali',
      nameAliases: ['thali', 'veg thali', 'full thali', 'sabka thali', 'sabzi thali', 'sabzi roti'],
      category: 'Thali',
      price: 149,
      isVeg: true,
      isAvailable: true,
      description: 'Dal makhani, 2 sabzi, 4 rotis, rice, raita & pickle. Ghee waali roti maa jaise!',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Paneer Thali',
      nameAliases: ['paneer thali', 'cheese thali', 'cottage cheese thali', 'paneer special'],
      category: 'Thali',
      price: 199,
      isVeg: true,
      isAvailable: true,
      description: 'Shahi paneer + 2 sabzi + 4 rotis + rice + raita + gulab jamun',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Chicken Thali',
      nameAliases: ['chicken thali', 'murga thali', 'non veg thali', 'nonveg thali'],
      category: 'Thali',
      price: 249,
      isVeg: false,
      isAvailable: true,
      description: 'Butter chicken + dal + 4 rotis + rice + raita + dessert',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Dal Makhani',
      nameAliases: ['dal makhani', 'dal', 'makhani', 'daal makhni', 'black dal'],
      category: 'Curries',
      price: 129,
      isVeg: true,
      isAvailable: true,
      description: 'Slow-cooked black lentils with butter & cream — signature dhaba style',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Butter Naan (2 pcs)',
      nameAliases: ['naan', 'butter naan', 'tandoori naan', 'naan bread', 'naan roti'],
      category: 'Breads',
      price: 59,
      isVeg: true,
      isAvailable: true,
      description: 'Soft tandoor-baked naan slathered with fresh butter',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Laccha Paratha (2 pcs)',
      nameAliases: ['paratha', 'laccha paratha', 'layered paratha', 'paratha bread'],
      category: 'Breads',
      price: 69,
      isVeg: true,
      isAvailable: true,
      description: 'Multi-layered whole wheat paratha cooked on tawa with ghee',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Gulab Jamun (2 pcs)',
      nameAliases: ['gulab jamun', 'mithai', 'dessert', 'sweet', 'jamun', 'meetha'],
      category: 'Desserts',
      price: 69,
      isVeg: true,
      isAvailable: true,
      description: 'Soft milk-solid dumplings soaked in rose sugar syrup',
      image: IMAGES.thali,
    },
    {
      restaurantId: maakaDhaba._id,
      name: 'Masala Chai',
      nameAliases: ['chai', 'tea', 'masala chai', 'adrak chai', 'ginger tea', 'cutting chai'],
      category: 'Beverages',
      price: 29,
      isVeg: true,
      isAvailable: true,
      description: 'Strong Indian milk tea with ginger, cardamom & tulsi',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Maa ka Dhaba — 8 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 3 — The Brew Room (GenZ Café — Cold Brews, Matcha, Snacks)
  // Category: Café, GenZ Drinks, Desserts, Snacks
  // ═══════════════════════════════════════════════════════════════════════════
  const brewRoom = await Restaurant.create({
    name: 'The Brew Room',
    slug: 'the-brew-room',
    cuisine: ['Café', 'Cold Drinks', 'Snacks', 'Desserts'],
    image: IMAGES.cafe,
    rating: 4.8,
    deliveryTimeMins: 20,
    isOpen: true,
    pricing: { minOrder: 149, costForTwo: 500 },
    address: { city: 'Delhi', pincode: '110016' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: brewRoom._id,
      name: 'Signature Cold Brew',
      nameAliases: ['cold brew', 'cold coffee', 'coldbrew', 'black cold brew', 'chilled coffee'],
      category: 'GenZ Drinks',
      price: 199,
      isVeg: true,
      isAvailable: true,
      description: '18-hour slow-steeped single-origin cold brew. No sugar, no drama.',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Matcha Latte',
      nameAliases: ['matcha', 'matcha latte', 'green tea latte', 'matcha drink', 'green latte'],
      category: 'GenZ Drinks',
      price: 229,
      isVeg: true,
      isAvailable: true,
      description: 'Ceremonial grade Japanese matcha whisked with oat milk & a touch of honey',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Dalgona Coffee',
      nameAliases: ['dalgona', 'whipped coffee', 'dalgona drink', 'frothy coffee'],
      category: 'GenZ Drinks',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Whipped coffee foam on chilled milk — the OG viral drink',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Brown Sugar Boba Tea',
      nameAliases: ['boba', 'bubble tea', 'boba tea', 'brown sugar milk tea', 'tapioca tea'],
      category: 'GenZ Drinks',
      price: 249,
      isVeg: true,
      isAvailable: true,
      description: 'Tiger sugar swirls, tapioca pearls & silky milk tea — it hits.',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Mango Refresher',
      nameAliases: ['mango drink', 'mango cooler', 'mango juice', 'aam panna', 'mango lemonade'],
      category: 'GenZ Drinks',
      price: 169,
      isVeg: true,
      isAvailable: true,
      description: 'Alphonso mango pulp, lime, mint & sparkling water over crushed ice',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Espresso Tonic',
      nameAliases: ['espresso tonic', 'tonic coffee', 'fizzy coffee', 'sparkling coffee'],
      category: 'GenZ Drinks',
      price: 189,
      isVeg: true,
      isAvailable: true,
      description: 'Double shot espresso poured over chilled Schweppes Indian tonic',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Avocado Toast',
      nameAliases: ['avocado toast', 'avo toast', 'avocado bread', 'toast'],
      category: 'Snacks',
      price: 189,
      isVeg: true,
      isAvailable: true,
      description: 'Smashed Avo on sourdough, cherry tomatoes, everything bagel seasoning',
      image: IMAGES.thali,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Cheesy Garlic Bread',
      nameAliases: ['garlic bread', 'cheesy bread', 'garlic toast', 'cheese garlic bread'],
      category: 'Snacks',
      price: 129,
      isVeg: true,
      isAvailable: true,
      description: 'Pull-apart garlic bread loaded with mozzarella & herbs',
      image: IMAGES.thali,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Lotus Biscoff Cheesecake',
      nameAliases: ['cheesecake', 'biscoff', 'lotus cake', 'lotus cheesecake', 'no bake cake'],
      category: 'Desserts',
      price: 219,
      isVeg: true,
      isAvailable: true,
      description: 'No-bake Biscoff cheesecake with caramel drizzle & crushed lotus base',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Chocolate Lava Cake',
      nameAliases: ['lava cake', 'molten cake', 'choco lava', 'chocolate cake', 'warm cake'],
      category: 'Desserts',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Molten Belgian chocolate core — served warm with vanilla ice cream',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: brewRoom._id,
      name: 'Açaí Bowl',
      nameAliases: ['acai bowl', 'acai', 'smoothie bowl', 'acai berry', 'berry bowl'],
      category: 'Healthy',
      price: 259,
      isVeg: true,
      isAvailable: true,
      description: 'Blended frozen açaí, topped with granola, banana & coconut flakes',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ The Brew Room — 11 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 4 — Pizza Palace
  // Category: Pizza, Fast Food, Italian
  // ═══════════════════════════════════════════════════════════════════════════
  const pizzaPalace = await Restaurant.create({
    name: 'Pizza Palace',
    slug: 'pizza-palace',
    cuisine: ['Italian', 'Pizza', 'Fast Food'],
    image: IMAGES.pizza,
    rating: 4.3,
    deliveryTimeMins: 25,
    isOpen: true,
    pricing: { minOrder: 199, costForTwo: 600 },
    address: { city: 'Gurugram', pincode: '122001' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: pizzaPalace._id,
      name: 'Margherita Pizza',
      nameAliases: ['margarita', 'cheese pizza', 'plain pizza', 'simple pizza', 'veg pizza'],
      category: 'Pizza',
      price: 249,
      isVeg: true,
      isAvailable: true,
      description: 'Classic San Marzano tomato sauce, fresh mozzarella & basil',
      image: IMAGES.pizza,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'Pepperoni Pizza',
      nameAliases: ['pepperoni', 'non veg pizza', 'meat pizza', 'pork pizza', 'spicy pizza'],
      category: 'Pizza',
      price: 349,
      isVeg: false,
      isAvailable: true,
      description: 'Loaded with spicy pepperoni, mozzarella on tomato base',
      image: IMAGES.pizza,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'BBQ Chicken Pizza',
      nameAliases: ['bbq pizza', 'chicken pizza', 'barbeque pizza', 'bbq chicken'],
      category: 'Pizza',
      price: 379,
      isVeg: false,
      isAvailable: true,
      description: 'Smoky BBQ sauce base, grilled chicken, caramelised onions & jalapeños',
      image: IMAGES.pizza,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'Paneer Tikka Pizza',
      nameAliases: ['paneer pizza', 'tikka pizza', 'desi pizza', 'indian pizza', 'paneer tikka pizza'],
      category: 'Pizza',
      price: 299,
      isVeg: true,
      isAvailable: true,
      description: 'Tandoori paneer tikka, green chutney base, onions & peppers',
      image: IMAGES.pizza,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'Garlic Bread',
      nameAliases: ['garlic bread', 'bread sticks', 'garlic toast', 'butter bread'],
      category: 'Sides',
      price: 99,
      isVeg: true,
      isAvailable: true,
      description: 'Toasted garlic bread with herb butter & mozzarella dip',
      image: IMAGES.thali,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'Pasta Arrabbiata',
      nameAliases: ['pasta', 'arrabbiata', 'red sauce pasta', 'spicy pasta', 'penne'],
      category: 'Pasta',
      price: 229,
      isVeg: true,
      isAvailable: true,
      description: 'Penne tossed in fiery tomato arrabbiata sauce with fresh herbs',
      image: IMAGES.thali,
    },
    {
      restaurantId: pizzaPalace._id,
      name: 'Choco Hazelnut Calzone',
      nameAliases: ['calzone', 'chocolate calzone', 'nutella calzone', 'dessert pizza', 'sweet calzone'],
      category: 'Desserts',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Folded pizza pocket oozing hazelnut chocolate & powdered sugar',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Pizza Palace — 7 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 5 — Dosa King (South Indian)
  // Category: South Indian, Dosa, Idli, Filter Coffee
  // ═══════════════════════════════════════════════════════════════════════════
  const dosaKing = await Restaurant.create({
    name: 'Dosa King',
    slug: 'dosa-king',
    cuisine: ['South Indian', 'Dosa', 'Idli', 'Filter Coffee'],
    image: IMAGES.south,
    rating: 4.4,
    deliveryTimeMins: 25,
    isOpen: true,
    pricing: { minOrder: 99, costForTwo: 300 },
    address: { city: 'Noida', pincode: '201301' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: dosaKing._id,
      name: 'Masala Dosa',
      nameAliases: ['masala dosa', 'dosa', 'masala dose', 'potato dosa', 'crispy dosa'],
      category: 'Dosas',
      price: 129,
      isVeg: true,
      isAvailable: true,
      description: 'Crispy golden dosa filled with spiced potato masala, served with sambar & 2 chutneys',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Cheese Masala Dosa',
      nameAliases: ['cheese dosa', 'cheesy dosa', 'mozzarella dosa', 'loaded dosa'],
      category: 'Dosas',
      price: 169,
      isVeg: true,
      isAvailable: true,
      description: 'Extra-crispy dosa stuffed with cheese & potato masala',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Plain Dosa',
      nameAliases: ['plain dosa', 'sada dosa', 'simple dosa', 'dosa without filling'],
      category: 'Dosas',
      price: 89,
      isVeg: true,
      isAvailable: true,
      description: 'Classic thin rice batter dosa — no filling, just crispy goodness',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Idli Sambar (4 pcs)',
      nameAliases: ['idli', 'idly', 'idli sambar', 'soft idli', 'steamed idli'],
      category: 'Idli & Vada',
      price: 99,
      isVeg: true,
      isAvailable: true,
      description: '4 soft steamed rice cakes with vegetable sambar & coconut chutney',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Medu Vada (2 pcs)',
      nameAliases: ['vada', 'medu vada', 'urad vada', 'sambar vada', 'donut vada'],
      category: 'Idli & Vada',
      price: 79,
      isVeg: true,
      isAvailable: true,
      description: 'Crunchy lentil fritters with sambar & fresh coconut chutney',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Rava Uttapam',
      nameAliases: ['uttapam', 'utthappam', 'rava uttapam', 'onion uttapam', 'thick dosa'],
      category: 'Dosas',
      price: 119,
      isVeg: true,
      isAvailable: true,
      description: 'Thick semolina pancake topped with onion, tomato & green chilli',
      image: IMAGES.dosa,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Filter Coffee',
      nameAliases: ['filter coffee', 'south indian coffee', 'degree coffee', 'kaapi', 'madras coffee'],
      category: 'Beverages',
      price: 59,
      isVeg: true,
      isAvailable: true,
      description: 'Strong decoction brewed South Indian style, with frothy milk',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: dosaKing._id,
      name: 'Payasam',
      nameAliases: ['payasam', 'kheer', 'rice kheer', 'sweet', 'dessert', 'south indian dessert'],
      category: 'Desserts',
      price: 89,
      isVeg: true,
      isAvailable: true,
      description: 'Creamy rice pudding with coconut milk, cardamom & cashews',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Dosa King — 8 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 6 — Wok & Roll (Chinese / Asian Fusion)
  // Category: Chinese, Noodles, Momos, Asian
  // ═══════════════════════════════════════════════════════════════════════════
  const wokRoll = await Restaurant.create({
    name: 'Wok & Roll',
    slug: 'wok-and-roll',
    cuisine: ['Chinese', 'Asian', 'Noodles', 'Momos'],
    image: IMAGES.chinese,
    rating: 4.2,
    deliveryTimeMins: 30,
    isOpen: true,
    pricing: { minOrder: 149, costForTwo: 400 },
    address: { city: 'Delhi', pincode: '110085' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: wokRoll._id,
      name: 'Steamed Chicken Momos (8 pcs)',
      nameAliases: ['momos', 'chicken momos', 'momo', 'steamed momos', 'dim sum', 'dumpling'],
      category: 'Momos',
      price: 149,
      isVeg: false,
      isAvailable: true,
      description: 'Juicy chicken momos steamed to perfection with spicy chilli dip',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Paneer Momos (8 pcs)',
      nameAliases: ['paneer momos', 'veg momos', 'cheese momos', 'veg dumpling'],
      category: 'Momos',
      price: 129,
      isVeg: true,
      isAvailable: true,
      description: 'Spiced cottage cheese momos with coriander chutney',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Fried Momos (8 pcs)',
      nameAliases: ['fried momos', 'crispy momos', 'tandoori momos', 'deep fried momos'],
      category: 'Momos',
      price: 169,
      isVeg: false,
      isAvailable: true,
      description: 'Deep-fried golden momos — crunchy outside, juicy inside',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Hakka Noodles',
      nameAliases: ['noodles', 'hakka', 'chowmein', 'chow mein', 'chinese noodles', 'veg noodles'],
      category: 'Noodles',
      price: 169,
      isVeg: true,
      isAvailable: true,
      description: 'Stir-fried Hakka noodles with crispy veggies in soy sauce',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Chicken Chow Mein',
      nameAliases: ['chicken noodles', 'chicken chowmein', 'chicken chow mein', 'non veg noodles'],
      category: 'Noodles',
      price: 199,
      isVeg: false,
      isAvailable: true,
      description: 'Wok-tossed noodles with shredded chicken, eggs & spring onion',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Veg Fried Rice',
      nameAliases: ['fried rice', 'veg fried rice', 'chinese rice', 'veg rice'],
      category: 'Rice',
      price: 159,
      isVeg: true,
      isAvailable: true,
      description: 'Wok-fried basmati with seasonal vegetables, eggs & soy glaze',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Chicken Manchurian (Gravy)',
      nameAliases: ['manchurian', 'chicken manchurian', 'manchuri', 'gravy manchurian'],
      category: 'Starters',
      price: 219,
      isVeg: false,
      isAvailable: true,
      description: 'Crispy chicken balls in tangy manchurian gravy with spring onions',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Gobi Manchurian (Dry)',
      nameAliases: ['gobi manchurian', 'cauliflower manchurian', 'veg manchurian', 'gobi'],
      category: 'Starters',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Crispy cauliflower tossed in Indo-Chinese sauce & sesame seeds',
      image: IMAGES.noodles,
    },
    {
      restaurantId: wokRoll._id,
      name: 'Mango Iced Tea',
      nameAliases: ['iced tea', 'mango tea', 'cold tea', 'ice tea', 'chilled tea'],
      category: 'Beverages',
      price: 89,
      isVeg: true,
      isAvailable: true,
      description: 'Chilled black tea with mango syrup & lemon slice over crushed ice',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Wok & Roll — 9 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 7 — Truffles (Bengaluru's legendary burger & sandwich place)
  // Category: Burgers, Sandwiches, Milkshakes
  // ═══════════════════════════════════════════════════════════════════════════
  const truffles = await Restaurant.create({
    name: 'Truffles — Bengaluru Burgers',
    slug: 'truffles-bengaluru-burgers',
    cuisine: ['Burgers', 'Sandwiches', 'Milkshakes', 'American'],
    image: IMAGES.burger,
    rating: 4.7,
    deliveryTimeMins: 28,
    isOpen: true,
    pricing: { minOrder: 149, costForTwo: 600 },
    address: { city: 'Bengaluru', pincode: '560025' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: truffles._id,
      name: 'Classic Truffle Burger',
      nameAliases: ['truffle burger', 'classic burger', 'signature burger', 'cheese burger', 'best burger'],
      category: 'Burgers',
      price: 279,
      isVeg: false,
      isAvailable: true,
      description: 'Juicy beef-style patty, truffle mayo, aged cheddar, caramelised onions in a brioche bun',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: truffles._id,
      name: 'Spicy Chicken Burger',
      nameAliases: ['spicy burger', 'chicken burger', 'hot burger', 'crispy chicken burger', 'nashville burger'],
      category: 'Burgers',
      price: 249,
      isVeg: false,
      isAvailable: true,
      description: 'Nashville-style crispy fried chicken, sriracha slaw, pickles & spicy mayo',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: truffles._id,
      name: 'Mushroom Swiss Burger',
      nameAliases: ['mushroom burger', 'swiss burger', 'veg burger', 'mushroom swiss', 'veggie burger'],
      category: 'Burgers',
      price: 229,
      isVeg: true,
      isAvailable: true,
      description: 'Sautéed mushrooms, Swiss cheese, garlic aioli & arugula in a sesame bun',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: truffles._id,
      name: 'Club Sandwich',
      nameAliases: ['club sandwich', 'sandwich', 'toast sandwich', 'triple decker', 'chicken sandwich'],
      category: 'Sandwiches',
      price: 219,
      isVeg: false,
      isAvailable: true,
      description: 'Triple-decker with chicken, bacon, egg, lettuce, tomato & chipotle mayo',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: truffles._id,
      name: 'Loaded Fries',
      nameAliases: ['fries', 'loaded fries', 'cheesy fries', 'cheese fries', 'french fries', 'potato fries'],
      category: 'Sides',
      price: 149,
      isVeg: true,
      isAvailable: true,
      description: 'Crispy fries loaded with cheddar sauce, jalapeños & caramelised onions',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: truffles._id,
      name: 'Nutella Milkshake',
      nameAliases: ['milkshake', 'nutella shake', 'chocolate milkshake', 'shake', 'thick shake'],
      category: 'Shakes',
      price: 199,
      isVeg: true,
      isAvailable: true,
      description: 'Thick blended Nutella milkshake with whipped cream & chocolate drizzle',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: truffles._id,
      name: 'Oreo Cheesecake Shake',
      nameAliases: ['oreo shake', 'oreo milkshake', 'cheesecake shake', 'cookie shake'],
      category: 'Shakes',
      price: 219,
      isVeg: true,
      isAvailable: true,
      description: 'Crushed Oreo blended with cheesecake ice cream & vanilla',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Truffles Bengaluru Burgers — 7 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 8 — CTR (Central Tiffin Room) — Iconic Bengaluru Breakfast
  // Category: South Indian, Breakfast, Dosa, Filter Coffee
  // ═══════════════════════════════════════════════════════════════════════════
  const ctr = await Restaurant.create({
    name: 'CTR — Central Tiffin Room',
    slug: 'ctr-central-tiffin-room',
    cuisine: ['South Indian', 'Breakfast', 'Tiffin', 'Filter Coffee'],
    image: IMAGES.south,
    rating: 4.8,
    deliveryTimeMins: 22,
    isOpen: true,
    pricing: { minOrder: 79, costForTwo: 280 },
    address: { city: 'Bengaluru', pincode: '560003' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: ctr._id,
      name: 'Benne Masala Dosa',
      nameAliases: ['benne dosa', 'butter masala dosa', 'ctr dosa', 'malnad dosa', 'ghee dosa'],
      category: 'Dosas',
      price: 89,
      isVeg: true,
      isAvailable: true,
      description: 'CTR-style crispy benne (butter) dosa with secret spiced potato masala. A Bengaluru legend.',
      image: IMAGES.dosa,
    },
    {
      restaurantId: ctr._id,
      name: 'Rava Masala Dosa',
      nameAliases: ['rava dosa', 'semolina dosa', 'rava masala', 'crispy rava dosa'],
      category: 'Dosas',
      price: 99,
      isVeg: true,
      isAvailable: true,
      description: 'Lacey semolina dosa with onion, green chilli & masala filling',
      image: IMAGES.dosa,
    },
    {
      restaurantId: ctr._id,
      name: 'Set Dosa (3 pcs)',
      nameAliases: ['set dosa', 'sponge dosa', 'soft dosa', '3 dosa', 'fluffy dosa'],
      category: 'Dosas',
      price: 79,
      isVeg: true,
      isAvailable: true,
      description: '3 soft, spongy set dosas with vegetable sagu & coconut chutney',
      image: IMAGES.dosa,
    },
    {
      restaurantId: ctr._id,
      name: 'Idli Vada Combo',
      nameAliases: ['idli vada', 'combo', 'idli combo', 'breakfast combo', 'idli vada sambar'],
      category: 'Combos',
      price: 89,
      isVeg: true,
      isAvailable: true,
      description: '2 steamed idlis + 1 crispy vada + piping hot sambar + 2 chutneys',
      image: IMAGES.dosa,
    },
    {
      restaurantId: ctr._id,
      name: 'Kesari Bath',
      nameAliases: ['kesari', 'kesari bath', 'semolina halwa', 'sweet rava', 'sheera'],
      category: 'Sweets',
      price: 59,
      isVeg: true,
      isAvailable: true,
      description: 'Soft saffron-yellow rava halwa with cashews & ghee — traditional Bengaluru tiffin sweet',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: ctr._id,
      name: 'Davangere Benne Dose',
      nameAliases: ['davangere dosa', 'benne dose', 'special dosa', 'davangere special'],
      category: 'Dosas',
      price: 119,
      isVeg: true,
      isAvailable: true,
      description: 'Thick, fluffy Davangere-style benne dosa with potato bhaji & mint chutney',
      image: IMAGES.dosa,
    },
    {
      restaurantId: ctr._id,
      name: 'Filter Coffee (Tumbler)',
      nameAliases: ['filter coffee', 'tumbler coffee', 'davara coffee', 'kaapi', 'south coffee', 'bangalore coffee'],
      category: 'Beverages',
      price: 29,
      isVeg: true,
      isAvailable: true,
      description: 'Authentic CTR decoction coffee — strong, frothy, poured between dabarah & tumbler',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ CTR Central Tiffin Room — 7 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 9 — Empire Restaurant (Bengaluru's iconic non-veg kebab & biryani)
  // Category: Non-Veg, Biryani, Kebabs, Rolls
  // ═══════════════════════════════════════════════════════════════════════════
  const empire = await Restaurant.create({
    name: 'Empire Restaurant — Bengaluru',
    slug: 'empire-restaurant-bengaluru',
    cuisine: ['Mughlai', 'Biryani', 'Kebabs', 'Rolls', 'North Indian'],
    image: IMAGES.nonveg,
    rating: 4.5,
    deliveryTimeMins: 30,
    isOpen: true,
    pricing: { minOrder: 149, costForTwo: 500 },
    address: { city: 'Bengaluru', pincode: '560001' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: empire._id,
      name: 'Chicken Biryani (Empire Special)',
      nameAliases: ['empire biryani', 'chicken biryani', 'bangalore biryani', 'empire chicken', 'special biryani'],
      category: 'Biryani',
      price: 229,
      isVeg: false,
      isAvailable: true,
      description: 'Empire-style layered chicken biryani with saffron, caramelised onions & mint raita',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: empire._id,
      name: 'Mutton Biryani',
      nameAliases: ['mutton biryani', 'gosht biryani', 'lamb biryani', 'mutton empire'],
      category: 'Biryani',
      price: 319,
      isVeg: false,
      isAvailable: true,
      description: 'Slow-cooked tender mutton in aromatic basmati — Empire signature',
      image: IMAGES.chickenBiryani,
    },
    {
      restaurantId: empire._id,
      name: 'Chicken Tikka (Quarter)',
      nameAliases: ['tikka', 'chicken tikka', 'empire tikka', 'tandoori', 'grilled chicken'],
      category: 'Kebabs',
      price: 199,
      isVeg: false,
      isAvailable: true,
      description: 'Juicy bone-in chicken tikka marinated in spiced yoghurt & chargrilled',
      image: IMAGES.kebabItem,
    },
    {
      restaurantId: empire._id,
      name: 'Shawarma Roll',
      nameAliases: ['shawarma', 'chicken shawarma', 'roll', 'wrap', 'empire roll', 'shawarma wrap'],
      category: 'Rolls',
      price: 149,
      isVeg: false,
      isAvailable: true,
      description: 'Spiced chicken shawarma in soft paratha with garlic sauce, pickled veggies & chilli',
      image: IMAGES.kebabItem,
    },
    {
      restaurantId: empire._id,
      name: 'Paneer Tikka',
      nameAliases: ['paneer tikka', 'veg tikka', 'cottage cheese tikka', 'paneer starter'],
      category: 'Kebabs',
      price: 179,
      isVeg: true,
      isAvailable: true,
      description: 'Cubes of paneer marinated in spiced tikka masala, grilled in tandoor',
      image: IMAGES.kebabItem,
    },
    {
      restaurantId: empire._id,
      name: 'Butter Chicken',
      nameAliases: ['butter chicken', 'murgh makhani', 'makhani chicken', 'creamy chicken curry'],
      category: 'Curries',
      price: 249,
      isVeg: false,
      isAvailable: true,
      description: 'Tender chicken in a rich, velvety tomato-butter-cream curry with a hint of kasuri methi',
      image: IMAGES.kebabItem,
    },
    {
      restaurantId: empire._id,
      name: 'Parotta (2 pcs)',
      nameAliases: ['parotta', 'kerala parotta', 'parota', 'layered flatbread', 'parantha'],
      category: 'Breads',
      price: 39,
      isVeg: true,
      isAvailable: true,
      description: 'Flaky, layered Kerala-style parottas — best paired with chicken curry or salna',
      image: IMAGES.thaliItem,
    },
    {
      restaurantId: empire._id,
      name: 'Sulaimani Chai',
      nameAliases: ['sulaimani', 'black tea', 'sulaimani tea', 'kerala tea', 'lemon tea'],
      category: 'Beverages',
      price: 35,
      isVeg: true,
      isAvailable: true,
      description: 'Fragrant Kerala-style black tea with lemon, mint & cardamom',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Empire Restaurant Bengaluru — 8 items');

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTAURANT 10 — Toit Taproom (Bengaluru craft brewery + bar food)
  // Category: Brewery, Burgers, Pizzas, Craft Drinks
  // ═══════════════════════════════════════════════════════════════════════════
  const toit = await Restaurant.create({
    name: 'Toit Taproom — Craft Brewery',
    slug: 'toit-taproom-bengaluru',
    cuisine: ['Brewery', 'Burgers', 'Pizzas', 'Bar Food', 'Craft Drinks'],
    image: IMAGES.brewery,
    rating: 4.6,
    deliveryTimeMins: 35,
    isOpen: true,
    pricing: { minOrder: 299, costForTwo: 1200 },
    address: { city: 'Bengaluru', pincode: '560038' },
  });

  await MenuItem.insertMany([
    {
      restaurantId: toit._id,
      name: 'Toit Craft Beer Flight',
      nameAliases: ['beer flight', 'craft beer', 'beer tasting', 'toit beer', 'beer sampler', 'beer'],
      category: 'Craft Drinks',
      price: 599,
      isVeg: true,
      isAvailable: true,
      description: '4 craft beer tasters — Tinsel Tripel, Bewitched Red Ale, Toit Weiss & Brut IPA',
      image: IMAGES.beerItem,
    },
    {
      restaurantId: toit._id,
      name: 'Nachos Grande',
      nameAliases: ['nachos', 'tortilla chips', 'loaded nachos', 'toit nachos', 'bar nachos'],
      category: 'Bar Food',
      price: 349,
      isVeg: true,
      isAvailable: true,
      description: 'Crispy tortilla chips with salsa, sour cream, jalapeños & beer cheese dip',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: toit._id,
      name: 'Pulled Pork Burger',
      nameAliases: ['pulled pork', 'pork burger', 'smoked pork burger', 'non veg burger'],
      category: 'Burgers',
      price: 379,
      isVeg: false,
      isAvailable: true,
      description: 'Slow-smoked pulled pork, beer BBQ glaze, coleslaw & pickles in a toasted bun',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: toit._id,
      name: 'Margherita Flatbread',
      nameAliases: ['flatbread', 'toit pizza', 'margherita flatbread', 'veg flatbread'],
      category: 'Flatbreads',
      price: 299,
      isVeg: true,
      isAvailable: true,
      description: 'Wood-fired flatbread with San Marzano tomato, burrata & fresh basil',
      image: IMAGES.pizzaItem,
    },
    {
      restaurantId: toit._id,
      name: 'Beer Battered Onion Rings',
      nameAliases: ['onion rings', 'beer battered rings', 'rings', 'fried onion'],
      category: 'Bar Food',
      price: 199,
      isVeg: true,
      isAvailable: true,
      description: 'Jumbo onion rings dipped in Toit Weiss beer batter, served with chipotle dip',
      image: IMAGES.burgerItem,
    },
    {
      restaurantId: toit._id,
      name: 'Toit Non-Alcoholic Sangria',
      nameAliases: ['sangria', 'mocktail', 'non alcoholic sangria', 'fruit drink', 'red sangria'],
      category: 'Craft Drinks',
      price: 249,
      isVeg: true,
      isAvailable: true,
      description: 'House-made red fruit sangria with orange, apple, cinnamon & hibiscus — no alcohol',
      image: IMAGES.coldBrew,
    },
    {
      restaurantId: toit._id,
      name: 'Tenderloin Steak Bites',
      nameAliases: ['steak bites', 'tenderloin', 'beef bites', 'steak', 'meat bites'],
      category: 'Bar Food',
      price: 499,
      isVeg: false,
      isAvailable: true,
      description: 'Pan-seared tenderloin bites with garlic butter, peppercorn sauce & herb fries',
      image: IMAGES.kebabItem,
    },
    {
      restaurantId: toit._id,
      name: 'Choco Brownie Sundae',
      nameAliases: ['brownie', 'brownie sundae', 'chocolate brownie', 'dessert', 'ice cream brownie'],
      category: 'Desserts',
      price: 249,
      isVeg: true,
      isAvailable: true,
      description: 'Warm Belgian chocolate brownie with vanilla bean ice cream & salted caramel',
      image: IMAGES.coldBrew,
    },
  ]);
  console.log('[Seed] ✅ Toit Taproom Craft Brewery — 8 items');

  // ─────────────────────────────────────────────────────────────────────────
  const totalRestaurants = 10;
  const totalItems = 8 + 8 + 11 + 7 + 8 + 9 + 7 + 7 + 8 + 8; // = 81
  console.log(`\n[Seed] 🎉 Done! Created ${totalRestaurants} restaurants & ${totalItems} menu items`);
  console.log('[Seed] Categories covered:');
  console.log('       🍗 Biryani (Bawarchee, Empire — Chicken, Mutton, Veg)');
  console.log('       🥘 North Indian Thali (Maa ka Dhaba)');
  console.log('       ☕ GenZ Café (The Brew Room — Cold Brew, Matcha, Boba)');
  console.log('       🍕 Pizza & Fast Food (Pizza Palace)');
  console.log('       🥞 South Indian (Dosa King, CTR Central Tiffin Room)');
  console.log('       🥡 Chinese / Momos (Wok & Roll)');
  console.log('       🍔 Bengaluru Burgers (Truffles)');
  console.log('       🥙 Empire Kebabs & Shawarma (Empire Restaurant)');
  console.log('       🍺 Craft Brewery Bar Food (Toit Taproom)');

  await mongoose.disconnect();
  console.log('[Seed] MongoDB disconnected. Backend ready!');
}

seed().catch((err) => {
  console.error('[Seed] Fatal error:', err.message);
  process.exit(1);
});
