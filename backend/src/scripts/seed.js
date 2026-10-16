import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { Restaurant, MenuItem } from '../modules/catalog/catalogModel.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dropp_db';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected to MongoDB');

  // Clear existing catalog data
  await Restaurant.deleteMany({});
  await MenuItem.deleteMany({});
  console.log('[Seed] Cleared old catalog data');

  // -------------------------------------------------------------
  // Restaurant 1: Bawarchee Biryani House
  // -------------------------------------------------------------
  const bawarchee = await Restaurant.create({
    name: 'Bawarchee Biryani House',
    slug: 'bawarchee-biryani-house',
    cuisine: ['Mughlai', 'Biryani', 'North Indian'],
    rating: 4.5,
    deliveryTimeMins: 35,
    pricing: { minOrder: 149, costForTwo: 450 },
  });

  await MenuItem.insertMany([
    {
      restaurantId: bawarchee._id,
      name: 'Chicken Dum Biryani',
      // Hinglish voice aliases so any phonetic variation matches!
      nameAliases: ['chicken biryani', 'murga biryani', 'dum biryani', 'biryani', 'chicken dum'],
      category: 'Biryani',
      price: 249,
      isVeg: false,
      description: 'Slow-cooked dum-style chicken biryani with saffron basmati rice',
    },
    {
      restaurantId: bawarchee._id,
      name: 'Veg Dum Biryani',
      nameAliases: ['veg biryani', 'sabzi biryani', 'vegetable biryani'],
      category: 'Biryani',
      price: 179,
      isVeg: true,
      description: 'Seasonal vegetables slow-cooked with aromatic spices',
    },
    {
      restaurantId: bawarchee._id,
      name: 'Mutton Biryani',
      nameAliases: ['gosht biryani', 'lamb biryani', 'mutton dum'],
      category: 'Biryani',
      price: 319,
      isVeg: false,
      description: 'Tender mutton pieces slow-cooked in layered basmati',
    },
    {
      restaurantId: bawarchee._id,
      name: 'Coke',
      nameAliases: ['cola', 'cold drink', 'thanda', 'soft drink', 'pepsi'],
      category: 'Beverages',
      price: 60,
      isVeg: true,
      description: 'Chilled Coca-Cola 330ml',
    },
  ]);

  // -------------------------------------------------------------
  // Restaurant 2: Pizza Palace
  // -------------------------------------------------------------
  const pizzapalace = await Restaurant.create({
    name: 'Pizza Palace',
    slug: 'pizza-palace',
    cuisine: ['Italian', 'Pizza', 'Fast Food'],
    rating: 4.2,
    deliveryTimeMins: 25,
    pricing: { minOrder: 199, costForTwo: 600 },
  });

  await MenuItem.insertMany([
    {
      restaurantId: pizzapalace._id,
      name: 'Margherita Pizza',
      nameAliases: ['margarita', 'cheese pizza', 'plain pizza'],
      category: 'Pizza',
      price: 249,
      isVeg: true,
      description: 'Classic tomato sauce with mozzarella and fresh basil',
    },
    {
      restaurantId: pizzapalace._id,
      name: 'Pepperoni Pizza',
      nameAliases: ['pepperoni', 'non veg pizza', 'meat pizza'],
      category: 'Pizza',
      price: 349,
      isVeg: false,
      description: 'Loaded with spicy pepperoni slices on tomato base',
    },
    {
      restaurantId: pizzapalace._id,
      name: 'Garlic Bread',
      nameAliases: ['garlic bread sticks', 'bread', 'garlic toast'],
      category: 'Sides',
      price: 99,
      isVeg: true,
      description: 'Toasted garlic bread with herb butter',
    },
  ]);

  console.log('[Seed] ✅ Created 2 restaurants and 7 menu items with voice aliases');
  await mongoose.disconnect();
  console.log('[Seed] Database ready! Now start your backend.');
}

seed().catch((err) => {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
});
