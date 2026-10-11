import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Splash Screen
import SplashScreen from '../../../shared/screens/SplashScreen.jsx';

// Rider Core Screens
import HomeScreen from '../screens/HomeScreen.jsx';
import RoleSelectionScreen from '../screens/RoleSelectionScreen.jsx';
import LocationSearchScreen from '../screens/LocationScreen.jsx';
import PackageDetailsScreen from '../screens/PackageDetailsScreen.jsx';
import FindingDriverScreen from '../screens/FindingDriverScreen.jsx';
import TripTrackingScreen from '../screens/TripTrackingScreen.jsx';

// Food Market Screens (shared from food app)
import FoodMarketScreen from '../../../food/src/screens/FoodMarketScreen.jsx';
import RestaurantDetailsScreen from '../../../food/src/screens/restaurantDetailsScreen.jsx';
import CartScreen from '../../../food/src/screens/CartScreen.jsx';
import OrderTrackingScreen from '../../../food/src/screens/OrderTrackingScreen.jsx';

// Other Common Screens
import BookingsScreen from '../../../shared/screens/BookingsScreen.jsx';
import WalletScreen from '../../../shared/screens/WalletScreen.jsx';
import ProfileScreen from '../../../shared/screens/ProfileScreen.jsx';

// Driver App Screens
import DriverHomeScreen from '../../../driver/src/screens/DriverHomeScreen.jsx';
import DriverNavigationScreen from '../../../driver/src/screens/DriverNavigationScreen.jsx';
import DriverEarningsScreen from '../../../driver/src/screens/DriverEarningsScreen.jsx';

export default function AppNavigator({ initialScreen = 'Splash' }) {
    const [currentScreen, setCurrentScreen] = useState(initialScreen);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [cart, setCart] = useState({});

    // ─── Cart helpers ─────────────────────────────────────────────
    const handleAddToCart = (item) => {
        setCart((prev) => {
            const existing = prev[item.id];
            return {
                ...prev,
                [item.id]: {
                    ...item,
                    quantity: (existing?.quantity || 0) + 1,
                },
            };
        });
    };

    const handleRemoveFromCart = (itemId) => {
        setCart((prev) => {
            const existing = prev[itemId];
            if (!existing) return prev;
            if (existing.quantity <= 1) {
                const next = { ...prev };
                delete next[itemId];
                return next;
            }
            return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
        });
    };

    const handleUpdateQuantity = (itemId, delta) => {
        if (delta > 0) {
            setCart((prev) => {
                const item = prev[itemId];
                if (!item) return prev;
                return { ...prev, [itemId]: { ...item, quantity: item.quantity + 1 } };
            });
        } else {
            handleRemoveFromCart(itemId);
        }
    };

    const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);

    // ─── Navigation helpers ───────────────────────────────────────
    const handleNavigate = (screenName) => {
        if (!screenName) return;
        setCurrentScreen(screenName);
    };

    const handleBack = () => setCurrentScreen('Home');

    return (
        <View style={styles.container}>

            {/* ── Splash ── */}
            {currentScreen === 'Splash' && (
                <SplashScreen onFinish={() => setCurrentScreen('RoleSelection')} />
            )}

            {/* ── Role Selection (You are...) ── */}
            {currentScreen === 'RoleSelection' && (
                <RoleSelectionScreen
                    onSelectRole={(role) => {
                        if (role === 'Customer') setCurrentScreen('Home');
                        else if (role === 'Captain') setCurrentScreen('DriverHome');
                        else alert('Merchant portal coming soon! 🚀');
                    }}
                />
            )}

            {/* ── Rider Home ── */}
            {currentScreen === 'Home' && (
                <HomeScreen onNavigate={handleNavigate} />
            )}

            {/* ── Ride Flow ── */}
            {(currentScreen === 'Location' ||
                currentScreen === 'LocationSearch' ||
                currentScreen === 'Location Search') && (
                <LocationSearchScreen
                    onBack={handleBack}
                    onNavigate={handleNavigate}
                />
            )}

            {currentScreen === 'PackageDetails' && (
                <PackageDetailsScreen
                    onBack={handleBack}
                    onNavigate={handleNavigate}
                />
            )}

            {currentScreen === 'FindingDriver' && (
                <FindingDriverScreen
                    onNavigate={handleNavigate}
                    onCancel={handleBack}
                />
            )}

            {currentScreen === 'TripTracking' && (
                <TripTrackingScreen
                    onBack={handleBack}
                    onNavigate={handleNavigate}
                />
            )}

            {/* ── Food Flow ── */}
            {currentScreen === 'Food' && (
                <FoodMarketScreen
                    onNavigate={handleNavigate}
                    onSelectRestaurant={(rest) => {
                        setSelectedRestaurant(rest);
                        setCurrentScreen('RestaurantDetail');
                    }}
                />
            )}

            {currentScreen === 'RestaurantDetail' && (
                <RestaurantDetailsScreen
                    restaurant={selectedRestaurant}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onBack={() => setCurrentScreen('Food')}
                    onViewCart={() => setCurrentScreen('Cart')}
                />
            )}

            {currentScreen === 'Cart' && (
                <CartScreen
                    cart={cart}
                    onBack={() =>
                        setCurrentScreen(selectedRestaurant ? 'RestaurantDetail' : 'Food')
                    }
                    onUpdateQuantity={handleUpdateQuantity}
                    onPlaceOrder={() => setCurrentScreen('FoodTracking')}
                />
            )}

            {currentScreen === 'FoodTracking' && (
                <OrderTrackingScreen
                    order={{
                        id: '#DRP-84920',
                        restaurantName: selectedRestaurant?.name || 'The Daily Grind',
                        etaMinutes: 18,
                        etaTime: '6:25 PM',
                        items: Object.values(cart),
                        totalAmount: Math.max(0, cartTotal + 24 - 50),
                        deliveryAddress: 'Flat 402, Tower B, Sector 28, Gurugram',
                    }}
                    onBack={() => {
                        setCart({});
                        setCurrentScreen('Home');
                    }}
                />
            )}

            {/* ── Common Screens ── */}
            {(currentScreen === 'Activity' ||
                currentScreen === 'Bookings' ||
                currentScreen === 'Orders') && (
                <BookingsScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'Wallet' && (
                <WalletScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'Profile' && (
                <ProfileScreen onNavigate={handleNavigate} />
            )}

            {/* ── Driver Mode ── */}
            {currentScreen === 'DriverHome' && (
                <DriverHomeScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'DriverNav' && (
                <DriverNavigationScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'DriverEarnings' && (
                <DriverEarningsScreen onNavigate={handleNavigate} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
