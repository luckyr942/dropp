export const FOOD_CATEGORIES = [
    { id: 'all', label: 'All', icon: 'fast-food' },
    { id: 'burgers', label: 'Burgers', icon: 'nutrition-outline' },
    { id: 'pizza', label: 'Pizza', icon: 'pizza-outline' },
    { id: 'asian', label: 'Asian', icon: 'restaurant-outline' },
    { id: 'desserts', label: 'Desserts', icon: 'ice-cream-outline' },
    { id: 'healthy', label: 'Healthy', icon: 'leaf-outline' },
    { id: 'coffee', label: 'Coffee', icon: 'cafe-outline' },
];

export const PROMO_BANNERS = [
    {
        id: 'p1',
        title: '50% OFF UP TO $10',
        subtitle: 'Use code DROPP50 on first 3 food orders',
        code: 'DROPP50',
        color: '#166534',
        accentColor: '#4ADE80',
    },
    {
        id: 'p2',
        title: 'FREE DELIVERY',
        subtitle: 'On orders over $25 from top-rated kitchens',
        code: 'FREEDEL',
        color: '#1E3A8A',
        accentColor: '#60A5FA',
    },
];

export const RESTAURANTS = [
    {
        id: 'rest_1',
        name: 'Burger Haven',
        cuisine: 'American • Burgers • Fast Food',
        rating: 4.8,
        ratingCount: '1.2k+',
        deliveryTime: '20-25 min',
        distance: '1.5 km',
        discount: '50% OFF UP TO $10',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        isVegOnly: false,
        menu: [
            {
                id: 'm1',
                name: 'Smokey Bacon Cheese Burger',
                price: 12.50,
                rating: 4.9,
                isVeg: false,
                description: 'Angus beef patty, crispy bacon, aged cheddar, caramelized onions & house sauce',
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
                category: 'Burgers',
            },
            {
                id: 'm2',
                name: 'Truffle Mushroom Burger',
                price: 13.00,
                rating: 4.8,
                isVeg: true,
                description: 'Plant-based patty, sautéed wild mushrooms, truffle aioli & Swiss cheese',
                image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80',
                category: 'Burgers',
            },
            {
                id: 'm3',
                name: 'Loaded Loaded Fries',
                price: 6.00,
                rating: 4.7,
                isVeg: true,
                description: 'Crispy skin-on fries topped with melted cheese, jalapeños & chives',
                image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=300&q=80',
                category: 'Sides',
            },
            {
                id: 'm4',
                name: 'Double Chocolate Milkshake',
                price: 5.50,
                rating: 4.9,
                isVeg: true,
                description: 'Rich Belgian chocolate blended with premium vanilla ice cream',
                image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=300&q=80',
                category: 'Beverages',
            },
        ],
    },
    {
        id: 'rest_2',
        name: 'Pasta Palace',
        cuisine: 'Italian • Pastas • Garlic Bread',
        rating: 4.7,
        ratingCount: '950+',
        deliveryTime: '25-30 min',
        distance: '2.1 km',
        discount: '40% OFF',
        image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281273?auto=format&fit=crop&w=600&q=80',
        isVegOnly: false,
        menu: [
            {
                id: 'm5',
                name: 'Creamy Truffle Fettuccine Carbonara',
                price: 15.00,
                rating: 4.9,
                isVeg: false,
                description: 'Handmade pasta, guanciale, egg yolk, Parmigiano-Reggiano & black truffle',
                image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281273?auto=format&fit=crop&w=300&q=80',
                category: 'Popular',
            },
            {
                id: 'm6',
                name: 'Pesto Genovese Penne',
                price: 13.50,
                rating: 4.6,
                isVeg: true,
                description: 'Fresh basil pesto, pine nuts, cherry tomatoes & extra virgin olive oil',
                image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=300&q=80',
                category: 'Pastas',
            },
        ],
    },
    {
        id: 'rest_3',
        name: 'Sushi Zen',
        cuisine: 'Japanese • Sushi Rolls • Ramen',
        rating: 4.9,
        ratingCount: '2.4k+',
        deliveryTime: '30-35 min',
        distance: '3.0 km',
        discount: '30% OFF',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
        isVegOnly: false,
        menu: [
            {
                id: 'm7',
                name: 'Dragon Roll (8 pcs)',
                price: 18.00,
                rating: 4.9,
                isVeg: false,
                description: 'Shrimp tempura, eel, avocado, cucumber & spicy unagi glaze',
                image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80',
                category: 'Sushi',
            },
            {
                id: 'm8',
                name: 'Tonkotsu Pork Ramen',
                price: 16.50,
                rating: 4.8,
                isVeg: false,
                description: '24-hour pork bone broth, tender chashu, ajitsuke tamago & wood ear mushroom',
                image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=300&q=80',
                category: 'Ramen',
            },
        ],
    },
    {
        id: 'rest_4',
        name: 'La Pizza Bella',
        cuisine: 'Italian • Wood-fired Pizza • Salads',
        rating: 4.6,
        ratingCount: '1.8k+',
        deliveryTime: '20-25 min',
        distance: '1.2 km',
        discount: 'FLAT $5 OFF',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        isVegOnly: true,
        menu: [
            {
                id: 'm9',
                name: 'Quattro Formaggi Pizza (12 inch)',
                price: 17.50,
                rating: 4.9,
                isVeg: true,
                description: 'Mozzarella, Gorgonzola, Fontina, Parmigiano & fresh oregano',
                image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
                category: 'Pizza',
            },
        ],
    },
];

export const foodApi = {
    getRestaurants: async () => {
        // Simulates async REST API call
        return new Promise((resolve) => {
            setTimeout(() => resolve(RESTAURANTS), 200);
        });
    },
    getRestaurantById: async (id) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const rest = RESTAURANTS.find((r) => r.id === id) || RESTAURANTS[0];
                resolve(rest);
            }, 150);
        });
    },
};
