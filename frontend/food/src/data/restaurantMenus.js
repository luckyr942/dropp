// Dynamic authentic menus and categories tailored for every restaurant in Dropp

export const RESTAURANT_MENUS = {
    // ════════════════════════════════════════════════════════════════
    // 1. PIZZA PALACE (Italian, Pizza, Fast Food)
    // ════════════════════════════════════════════════════════════════
    'pizza-palace': {
        categories: ['Pizzas', 'Snacks', 'Beverages', 'Combos'],
        items: [
            {
                id: 'pp-1',
                name: 'Margherita Pizza',
                category: 'Pizzas',
                price: 249,
                isVeg: true,
                desc: 'Classic delight with 100% mozzarella and fresh basil.',
                image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'pp-2',
                name: 'Pepperoni Pizza',
                category: 'Pizzas',
                price: 329,
                isVeg: false,
                desc: 'Classic pepperoni with extra cheese and Italian herbs.',
                image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'pp-3',
                name: 'Cheesy Garlic Bread',
                category: 'Snacks',
                price: 149,
                isVeg: true,
                desc: 'Loaded with melted mozzarella, garlic butter & oregano.',
                image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'pp-4',
                name: 'Classic Cold Coffee',
                category: 'Beverages',
                price: 180,
                isVeg: true,
                desc: 'Creamy blended coffee topped with whipped cream.',
                image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'pp-5',
                name: 'Double Chocolate Brownie',
                category: 'Combos',
                price: 150,
                isVeg: true,
                desc: 'Fudgy warm brownie with melted chocolate chunks.',
                image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════
    // 2. BAWARCHEE BIRYANI HOUSE (Mughlai, Biryani, North Indian)
    // ════════════════════════════════════════════════════════════════
    'bawarchee-biryani': {
        categories: ['Biryani', 'Kebabs', 'Curries', 'Breads & Desserts'],
        items: [
            {
                id: 'bb-1',
                name: 'Dum Hyderabadi Chicken Biryani',
                category: 'Biryani',
                price: 349,
                isVeg: false,
                desc: 'Slow cooked fragrant basmati rice with spiced chicken, mint & saffron.',
                image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'bb-2',
                name: 'Royal Paneer Tikka Biryani',
                category: 'Biryani',
                price: 299,
                isVeg: true,
                desc: 'Clay oven charred paneer cubes layered with saffron basmati rice.',
                image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'bb-3',
                name: 'Galouti Mutton Kebab',
                category: 'Kebabs',
                price: 380,
                isVeg: false,
                desc: 'Melt-in-mouth smoked lamb patties with awadhi spices & mint chutney.',
                image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'bb-4',
                name: 'Butter Chicken Masala',
                category: 'Curries',
                price: 320,
                isVeg: false,
                desc: 'Tandoori chicken in rich satin-smooth tomato, butter & cashew gravy.',
                image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'bb-5',
                name: 'Shahi Tukda',
                category: 'Breads & Desserts',
                price: 140,
                isVeg: true,
                desc: 'Crispy ghee toasted bread soaked in saffron rabri with pistachios.',
                image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════
    // 3. MAA KA DHABA (Thali, Homestyle, North Indian)
    // ════════════════════════════════════════════════════════════════
    'maa-ka-dhaba': {
        categories: ['Thalis', 'Parathas', 'Dal & Sabzi', 'Lassi & Sweet'],
        items: [
            {
                id: 'mkd-1',
                name: 'Special Maharaja Thali',
                category: 'Thalis',
                price: 220,
                isVeg: true,
                desc: 'Dal Makhani, Shahi Paneer, 3 Tawa Rotis, Rice, Salad, Raita & Gulab Jamun.',
                image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'mkd-2',
                name: 'Amritsari Aloo Pyaaz Paratha',
                category: 'Parathas',
                price: 110,
                isVeg: true,
                desc: 'Crispy whole wheat stuffed paratha served with white makhan & pickle.',
                image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'mkd-3',
                name: 'Slow Simmered Dal Makhani',
                category: 'Dal & Sabzi',
                price: 180,
                isVeg: true,
                desc: 'Overnight charcoal-simmered black lentils with fresh cream & desi ghee.',
                image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'mkd-4',
                name: 'Kadai Paneer Punjabi',
                category: 'Dal & Sabzi',
                price: 210,
                isVeg: true,
                desc: 'Cottage cheese tossed with bell peppers in freshly ground kadai masala.',
                image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'mkd-5',
                name: 'Thick Malai Sweet Lassi',
                category: 'Lassi & Sweet',
                price: 80,
                isVeg: true,
                desc: 'Traditional clay-pot churned sweet yogurt topped with thick malai layer.',
                image: 'https://images.unsplash.com/photo-1571006682858-a47290943806?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════
    // 4. DOSA KING (South Indian, Tiffin, Breakfast)
    // ════════════════════════════════════════════════════════════════
    'dosa-king': {
        categories: ['Dosas', 'Idli & Vada', 'Uttapams', 'Filter Coffee'],
        items: [
            {
                id: 'dk-1',
                name: 'Ghee Podi Roast Masala Dosa',
                category: 'Dosas',
                price: 160,
                isVeg: true,
                desc: 'Crisp golden crepe smeared with spicy gunpowder ghee & potato masala.',
                image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dk-2',
                name: 'Steamed Button Ghee Idli (14 pcs)',
                category: 'Idli & Vada',
                price: 130,
                isVeg: true,
                desc: 'Mini button idlis submerged in hot aromatic drumstick sambar & ghee.',
                image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dk-3',
                name: 'Crispy Medu Vada (2 pcs)',
                category: 'Idli & Vada',
                price: 110,
                isVeg: true,
                desc: 'Crunchy golden lentil fritters served with coconut & tomato chutneys.',
                image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dk-4',
                name: 'Onion Tomato Uttapam',
                category: 'Uttapams',
                price: 150,
                isVeg: true,
                desc: 'Thick fermented rice pancake topped with caramelized red onions & green chillies.',
                image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dk-5',
                name: 'Mylapore Degree Filter Coffee',
                category: 'Filter Coffee',
                price: 60,
                isVeg: true,
                desc: 'Strong freshly brewed chicory decoction frothed with pure whole milk.',
                image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════
    // 5. DRAGON WOK EXPRESS (Chinese, Momos, Asian)
    // ════════════════════════════════════════════════════════════════
    'dragon-wok': {
        categories: ['Momos & Dimsum', 'Noodles', 'Rice Bowls', 'Appetizers'],
        items: [
            {
                id: 'dw-1',
                name: 'Steamed Chicken Kothey Momos (6 pcs)',
                category: 'Momos & Dimsum',
                price: 169,
                isVeg: false,
                desc: 'Thin wrapper dumplings filled with minced chicken & scallions, pan crisped.',
                image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dw-2',
                name: 'Fiery Schezwan Veg Hakka Noodles',
                category: 'Noodles',
                price: 199,
                isVeg: true,
                desc: 'Wok tossed noodles with crunchy bell peppers, cabbage and spicy schezwan sauce.',
                image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dw-3',
                name: 'Chilli Chicken Gravy Bowl',
                category: 'Rice Bowls',
                price: 249,
                isVeg: false,
                desc: 'Crispy chicken bites tossed in dark soya garlic sauce served over fried rice.',
                image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dw-4',
                name: 'Crispy Honey Chilli Potatoes',
                category: 'Appetizers',
                price: 179,
                isVeg: true,
                desc: 'Crunchy potato fingers tossed with toasted sesame seeds and sweet chili glaze.',
                image: 'https://images.unsplash.com/photo-1625938145744-e380515399b7?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'dw-5',
                name: 'Paneer Momos in Spicy Dip (6 pcs)',
                category: 'Momos & Dimsum',
                price: 159,
                isVeg: true,
                desc: 'Juicy cottage cheese momos served with signature fiery red chili garlic dip.',
                image: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════
    // 6. THE BREW ROOM / THE DAILY GRIND (Coffee, Café, Desserts)
    // ════════════════════════════════════════════════════════════════
    'the-brew-room': {
        categories: ['Cold Brews', 'Hot Coffee', 'Gourmet Bites', 'Desserts'],
        items: [
            {
                id: 'tbr-1',
                name: 'Signature Vanilla Cold Brew',
                category: 'Cold Brews',
                price: 210,
                isVeg: true,
                desc: 'Steeped for 18h with sweet vanilla cream and double espresso.',
                image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'tbr-2',
                name: 'Artisan Butter Croissant',
                category: 'Gourmet Bites',
                price: 140,
                isVeg: true,
                desc: 'Flaky french butter pastry baked golden brown fresh every morning.',
                image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'tbr-3',
                name: 'Spanish Caramel Latte',
                category: 'Hot Coffee',
                price: 195,
                isVeg: true,
                desc: 'Condensed milk espresso with silky textured velvety microfoam.',
                image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'tbr-4',
                name: 'Wild Blueberry Cheesecake',
                category: 'Desserts',
                price: 240,
                isVeg: true,
                desc: 'New York style baked cream cheese with wild blueberry compote.',
                image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=85',
            },
            {
                id: 'tbr-5',
                name: 'Iced Hazelnut Mocha',
                category: 'Cold Brews',
                price: 245,
                isVeg: true,
                desc: 'Belgian cocoa, crushed roasted hazelnut syrup & cold espresso.',
                image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=85',
            },
        ],
    },
};

// Aliases for matching IDs
RESTAURANT_MENUS['daily-grind'] = RESTAURANT_MENUS['the-brew-room'];

export function getMenuForRestaurant(restaurantId) {
    if (restaurantId && RESTAURANT_MENUS[restaurantId]) {
        return RESTAURANT_MENUS[restaurantId];
    }
    // Match by slug or name fragments
    const normalized = String(restaurantId || '').toLowerCase();
    if (normalized.includes('pizza')) return RESTAURANT_MENUS['pizza-palace'];
    if (normalized.includes('biryani') || normalized.includes('bawarchee')) return RESTAURANT_MENUS['bawarchee-biryani'];
    if (normalized.includes('dhaba') || normalized.includes('maa')) return RESTAURANT_MENUS['maa-ka-dhaba'];
    if (normalized.includes('dosa') || normalized.includes('south')) return RESTAURANT_MENUS['dosa-king'];
    if (normalized.includes('dragon') || normalized.includes('wok') || normalized.includes('chinese')) return RESTAURANT_MENUS['dragon-wok'];
    if (normalized.includes('brew') || normalized.includes('coffee') || normalized.includes('grind')) return RESTAURANT_MENUS['the-brew-room'];

    return RESTAURANT_MENUS['pizza-palace'];
}
