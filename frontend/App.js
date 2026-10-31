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
import { View, StyleSheet, ActivityIndicator, LogBox } from 'react-native';

// Suppress dev yellow box banners during demo video recording
LogBox.ignoreAllLogs(true);
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';

// ─── Aura Voice AI ────────────────────────────────────────────────
import { AuraProvider } from './shared/voice/AuraContext.js';
import AuraOverlay from './shared/voice/AuraOverlay.jsx';
import AuraFloatingButton from './shared/voice/components/AuraFloatingButton.jsx';

// ─── Shared Screens ──────────────────────────────────────────────
import SplashScreen from './shared/screens/SplashScreen.jsx';
import { ThemeProvider } from './shared/theme/themeContext';

// ─── Onboarding ───────────────────────────────────────────────────
import RoleSelectionScreen from './rider/src/screens/RoleSelectionScreen.jsx';

// ─── Customer Flow (Rider + Food + Delivery + Shop) ──────────────
import MainHomeScreen from './shared/screens/mainHomeScreen.jsx';
import RiderHomeScreen from './rider/src/screens/HomeScreen.jsx';
import ConfirmLocationScreen from './rider/src/screens/ConfirmLocationScreen.jsx';
import ChooseRideScreen from './rider/src/screens/ChooseRideScreen.jsx';
import ReviewBookingScreen from './rider/src/screens/ReviewBookingScreen.jsx';
import LocationSearchScreen from './rider/src/screens/LocationScreen.jsx';
import PackageDetailsScreen from './rider/src/screens/PackageDetailsScreen.jsx';
import FindingDriverScreen from './rider/src/screens/FindingDriverScreen.jsx';
import TripTrackingScreen from './rider/src/screens/TripTrackingScreen.jsx';
import RideCompletedScreen from './rider/src/screens/RideCompletedScreen.jsx';
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

// ─── Seller / Merchant Flow ──────────────────────────────────────
import SellerOnboardingScreen from './seller/src/screens/SellerOnboardingScreen.jsx';
import SellerDashboardScreen from './seller/src/screens/SellerDashboardScreen.jsx';

import * as ExpoSplashScreen from 'expo-splash-screen';

export default function App() {
        const [fontsLoaded] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
        Caveat_600SemiBold,
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
        ...Feather.font,
    });

    const [currentScreen, setCurrentScreen] = useState('Home');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [cart, setCart] = useState({});
    const [activeOrder, setActiveOrder] = useState(null);
    const [sellerStore, setSellerStore] = useState(null);

    if (!fontsLoaded) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#00C96B" />
            </View>
        );
    }

    // ─── Cart Helpers ─────────────────────────────────────────────
    // Cart is keyed by menu item id; every item carries its restaurantId so a
    // cart can never mix kitchens. RestaurantDetail asks the user before
    // replacing a cart from another restaurant and passes { replaceCart: true }.
    const handleAddToCart = (item, { replaceCart = false } = {}) => {
        if (!item?.id) return;
        setCart((prev) => {
            const prevItems = Object.values(prev);
            const otherRestaurant = prevItems.some(
                (i) => i.restaurantId && item.restaurantId && i.restaurantId !== item.restaurantId
            );
            const base = replaceCart || otherRestaurant ? {} : prev;
            const existing = base[item.id];
            return {
                ...base,
                [item.id]: { ...(existing || item), quantity: (existing?.quantity || 0) + 1 },
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

    // Change quantity in place so name/price/restaurant are preserved
    const handleUpdateQuantity = (itemId, delta) => {
        if (delta < 0) return handleRemoveFromCart(itemId);
        setCart((prev) => {
            const existing = prev[itemId];
            if (!existing) return prev;
            return { ...prev, [itemId]: { ...existing, quantity: existing.quantity + delta } };
        });
    };

    const cartFirstItem = Object.values(cart)[0];
    const cartRestaurant = cartFirstItem?.restaurantId
        ? (selectedRestaurant && (selectedRestaurant._id || selectedRestaurant.id) === cartFirstItem.restaurantId
            ? selectedRestaurant
            : { id: cartFirstItem.restaurantId, _id: cartFirstItem.restaurantId, name: cartFirstItem.restaurantName })
        : selectedRestaurant;

    const navigate = (screen, payload) => {
        if (!screen) return;
        if (payload && screen === 'FoodTracking') {
            // Keep the real order document; the tracking screen refreshes it from the API by id
            const orderId = payload._id || payload.orderId || payload.id;
            if (orderId) setActiveOrder({ ...payload, _id: String(orderId) });
        }
        setCurrentScreen(screen);
    };

    const isDarkScreen =
        currentScreen === 'Splash' ||
        currentScreen === 'RoleSelection' ||
        currentScreen === 'DriverNavigation' ||
        currentScreen === 'DriverHome' ||
        currentScreen === 'RestaurantDetail';

    // The floating Aura bubble is for customers only: hide it on splash, role picker, driver and seller
    // screens, and on full-screen trip / checkout flows where it would cover live details
    const AURA_HIDDEN_SCREENS = ['Splash', 'RoleSelection', 'FindingDriver', 'TripTracking', 'RideCompleted', 'FoodTracking', 'Cart'];
    const showAuraBubble = !(
        AURA_HIDDEN_SCREENS.includes(currentScreen) ||
        currentScreen.startsWith('Driver') ||
        currentScreen.startsWith('Seller')
    );

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuraProvider onNavigate={navigate}>
                    <StatusBar
                        style={isDarkScreen ? 'light' : 'dark'}
                        animated
                    />
                    <View style={styles.root}>

                        {/* ── 1. Splash ── */}
                        {currentScreen === 'Splash' && (
                            <SplashScreen onFinish={() => navigate('Home')} />
                        )}

                        {/* ── 2. Role Selection (You are...) ── */}
                        {currentScreen === 'RoleSelection' && (
                            <RoleSelectionScreen
                                onSelectRole={(role) => {
                                    if (role === 'Customer') navigate('Home');
                                    else if (role === 'Captain') navigate('DriverHome');
                                    else if (role === 'Merchant') navigate('SellerOnboarding');
                                }}
                            />
                        )}

                        {/* ════════════════════════════════════════════════
                            SELLER / MERCHANT FLOW
                        ════════════════════════════════════════════════ */}
                        {currentScreen === 'SellerOnboarding' && (
                            <SellerOnboardingScreen
                                onFinish={(newStore) => {
                                    setSellerStore(newStore);
                                    navigate('SellerDashboard');
                                }}
                                onCancel={() => navigate('Home')}
                            />
                        )}

                        {currentScreen === 'SellerDashboard' && (
                            <SellerDashboardScreen
                                store={sellerStore}
                                onNavigateBack={() => navigate('Home')}
                            />
                        )}
                        {/* ════════════════════════════════════════════════
                            CUSTOMER FLOW
                        ════════════════════════════════════════════════ */}

                        {currentScreen === 'Home' && (
                            <MainHomeScreen onNavigate={navigate} />
                        )}

                        {currentScreen === 'RiderHome' && (
                            <RiderHomeScreen onNavigate={navigate} />
                        )}

                        {(currentScreen === 'Location' ||
                            currentScreen === 'LocationSearch') && (
                            <LocationSearchScreen
                                onBack={() => navigate('RiderHome')}
                                onNavigate={navigate}
                            />
                        )}

                        {/* ── Screen 03: Confirm Location on Map ── */}
                        {currentScreen === 'ConfirmLocation' && (
                            <ConfirmLocationScreen
                                onBack={() => navigate('Location')}
                                onNavigate={navigate}
                            />
                        )}

                        {/* ── Screen 04: Choose Ride Tier ── */}
                        {currentScreen === 'ChooseRide' && (
                            <ChooseRideScreen
                                onBack={() => navigate('ConfirmLocation')}
                                onNavigate={navigate}
                            />
                        )}

                        {/* ── Screen 05: Review Booking & Fare Breakdown ── */}
                        {currentScreen === 'ReviewBooking' && (
                            <ReviewBookingScreen
                                onBack={() => navigate('ChooseRide')}
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

                        {currentScreen === 'RideCompleted' && (
                            <RideCompletedScreen
                                onNavigate={navigate}
                                onDone={() => navigate('Home')}
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
                                restaurant={cartRestaurant}
                                onBack={() =>
                                    navigate(selectedRestaurant ? 'RestaurantDetail' : 'Food')
                                }
                                onBrowse={() => navigate('Food')}
                                onUpdateQuantity={handleUpdateQuantity}
                                onPlaceOrder={(order) => {
                                    // `order` is the confirmed order document from the backend
                                    setActiveOrder(order);
                                    setCart({});
                                    navigate('FoodTracking');
                                }}
                            />
                        )}

                        {currentScreen === 'FoodTracking' && (
                            <OrderTrackingScreen
                                orderId={activeOrder?._id || null}
                                initialOrder={activeOrder}
                                onBack={() => {
                                    setActiveOrder(null);
                                    navigate('Home');
                                }}
                                onBrowse={() => navigate('Food')}
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
                    <AuraFloatingButton hidden={!showAuraBubble} />
                    <AuraOverlay />
                </AuraProvider>
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
