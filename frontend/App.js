/**
 * Dropp — Root App Entry Point
 * ─────────────────────────────────────────────────────────────────
 * For DEBUGGING individual apps, run from their own folders:
 *   cd frontend/food    → npx expo start   (food app only)
 *   cd frontend/rider   → npx expo start   (rider + food + driver)
 *   cd frontend/driver  → npx expo start   (driver app only)
 *
 * For the FULL unified app (production / user-facing):
 *   cd frontend         → npx expo start
 * ─────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';

// ─── Shared Screens ──────────────────────────────────────────────
import SplashScreen from './shared/screens/SplashScreen.jsx';
import { ThemeProvider } from './shared/theme/themeContext';

// ─── Onboarding ───────────────────────────────────────────────────
import RoleSelectionScreen from './rider/src/screens/RoleSelectionScreen.jsx';

// ─── Customer Flow (Rider + Food + Delivery + Shop) ──────────────
import MainHomeScreen from './shared/screens/mainHomeScreen.jsx';
import LocationSearchScreen from './rider/src/screens/LocationScreen.jsx';
import PackageDetailsScreen from './rider/src/screens/PackageDetailsScreen.jsx';
import FindingDriverScreen from './rider/src/screens/FindingDriverScreen.jsx';
import TripTrackingScreen from './rider/src/screens/TripTrackingScreen.jsx';
import FoodMarketScreen from './food/src/screens/FoodMarketScreen.jsx';
import RestaurantDetailsScreen from './food/src/screens/restaurantDetailsScreen.jsx';
import CartScreen from './food/src/screens/CartScreen.jsx';
import OrderTrackingScreen from './food/src/screens/OrderTrackingScreen.jsx';

// ─── Common Screens ───────────────────────────────────────────────
import BookingsScreen from './shared/screens/BookingsScreen.jsx';
import WalletScreen from './shared/screens/WalletScreen.jsx';
import ProfileScreen from './shared/screens/ProfileScreen.jsx';

// ─── Driver / Captain Flow ────────────────────────────────────────
import DriverHomeScreen from './driver/src/screens/DriverHomeScreen.jsx';
import DriverNavigationScreen from './driver/src/screens/DriverNavigationScreen.jsx';
import DriverEarningsScreen from './driver/src/screens/DriverEarningsScreen.jsx';

export default function App() {
    const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
        Caveat_600SemiBold,
    });

    const [currentScreen, setCurrentScreen] = useState('Home');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [cart, setCart] = useState({});

    if (!fontsLoaded) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#00C96B" />
            </View>
        );
    }

    // ─── Cart Helpers ─────────────────────────────────────────────
    const handleAddToCart = (item) => {
        setCart((prev) => {
            const existing = prev[item.id];
            return {
                ...prev,
                [item.id]: { ...item, quantity: (existing?.quantity || 0) + 1 },
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
        delta > 0 ? handleAddToCart({ id: itemId }) : handleRemoveFromCart(itemId);
    };

    const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);
    const navigate = (screen) => screen && setCurrentScreen(screen);

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <StatusBar style="light" />
                <View style={styles.root}>

                {/* ── 1. Splash ── */}
                {currentScreen === 'Splash' && (
                    <SplashScreen onFinish={() => navigate('RoleSelection')} />
                )}

                {/* ── 2. Role Selection (You are...) ── */}
                {currentScreen === 'RoleSelection' && (
                    <RoleSelectionScreen
                        onSelectRole={(role) => {
                            if (role === 'Customer') navigate('Home');
                            else if (role === 'Captain') navigate('DriverHome');
                            else alert('Merchant portal coming soon! 🚀');
                        }}
                    />
                )}

                {/* ════════════════════════════════════════════════
                    CUSTOMER FLOW
                ════════════════════════════════════════════════ */}

                {currentScreen === 'Home' && (
                    <MainHomeScreen onNavigate={navigate} />
                )}

                {(currentScreen === 'Location' ||
                    currentScreen === 'LocationSearch') && (
                    <LocationSearchScreen
                        onBack={() => navigate('Home')}
                        onNavigate={navigate}
                    />
                )}

                {currentScreen === 'PackageDetails' && (
                    <PackageDetailsScreen
                        onBack={() => navigate('Home')}
                        onNavigate={navigate}
                    />
                )}

                {currentScreen === 'FindingDriver' && (
                    <FindingDriverScreen
                        onNavigate={navigate}
                        onCancel={() => navigate('Home')}
                    />
                )}

                {currentScreen === 'TripTracking' && (
                    <TripTrackingScreen
                        onBack={() => navigate('Home')}
                        onNavigate={navigate}
                    />
                )}

                {/* ── Food Sub-flow ── */}
                {currentScreen === 'Food' && (
                    <FoodMarketScreen
                        onNavigate={navigate}
                        onSelectRestaurant={(rest) => {
                            setSelectedRestaurant(rest);
                            navigate('RestaurantDetail');
                        }}
                    />
                )}

                {currentScreen === 'RestaurantDetail' && (
                    <RestaurantDetailsScreen
                        restaurant={selectedRestaurant}
                        cart={cart}
                        onAddToCart={handleAddToCart}
                        onRemoveFromCart={handleRemoveFromCart}
                        onBack={() => navigate('Food')}
                        onViewCart={() => navigate('Cart')}
                    />
                )}

                {currentScreen === 'Cart' && (
                    <CartScreen
                        cart={cart}
                        onBack={() =>
                            navigate(selectedRestaurant ? 'RestaurantDetail' : 'Food')
                        }
                        onUpdateQuantity={handleUpdateQuantity}
                        onPlaceOrder={() => navigate('FoodTracking')}
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
                            navigate('Home');
                        }}
                    />
                )}

                {/* ── Common ── */}
                {(currentScreen === 'Activity' ||
                    currentScreen === 'Bookings' ||
                    currentScreen === 'Orders') && (
                    <BookingsScreen onNavigate={navigate} />
                )}

                {currentScreen === 'Wallet' && (
                    <WalletScreen onNavigate={navigate} />
                )}

                {currentScreen === 'Profile' && (
                    <ProfileScreen onNavigate={navigate} />
                )}

                {/* ════════════════════════════════════════════════
                    CAPTAIN / DRIVER FLOW
                ════════════════════════════════════════════════ */}

                {currentScreen === 'DriverHome' && (
                    <DriverHomeScreen onNavigate={navigate} />
                )}

                {currentScreen === 'DriverNav' && (
                    <DriverNavigationScreen onNavigate={navigate} />
                )}

                {currentScreen === 'DriverEarnings' && (
                    <DriverEarningsScreen onNavigate={navigate} />
                )}

            </View>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#080808',
    },
    loading: {
        flex: 1,
        backgroundColor: '#080808',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
