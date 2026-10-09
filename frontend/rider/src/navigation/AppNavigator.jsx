import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Splash Screen
import SplashScreen from '../../shared/screens/SplashScreen.jsx';

// Rider Core Screens
import HomeScreen from '../screens/HomeScreen.jsx';
import LocationSearchScreen from '../screens/LocationScreen.jsx';
import PackageDetailsScreen from '../screens/PackageDetailsScreen.jsx';
import FindingDriverScreen from '../screens/FindingDriverScreen.jsx';
import TripTrackingScreen from '../screens/TripTrackingScreen.jsx';

// Food Market Screens
import FoodMarketScreen from '../../food/src/screens/FoodMarketScreen.jsx';
import RestaurantDetailScreen from '../../food/src/screens/RestaurantDetailScreen.jsx';

// Other Common Screens
import BookingsScreen from '../../shared/screens/BookingsScreen.jsx';
import WalletScreen from '../../shared/screens/WalletScreen.jsx';
import ProfileScreen from '../../shared/screens/ProfileScreen.jsx';

// Driver App Screens
import DriverHomeScreen from '../../driver/src/screens/DriverHomeScreen.jsx';
import DriverNavigationScreen from '../../driver/src/screens/DriverNavigationScreen.jsx';
import DriverEarningsScreen from '../../driver/src/screens/DriverEarningsScreen.jsx';

export default function AppNavigator({ initialScreen = 'Splash' }) {
    const [currentScreen, setCurrentScreen] = useState(initialScreen);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    const handleNavigate = (screenName) => {
        if (!screenName) return;
        setCurrentScreen(screenName);
    };

    const handleBack = () => {
        setCurrentScreen('Home');
    };

    return (
        <View style={styles.container}>
            {/* Splash Entry Screen */}
            {currentScreen === 'Splash' && (
                <SplashScreen onFinish={() => setCurrentScreen('Home')} />
            )}

            {/* Rider Main Screens */}
            {currentScreen === 'Home' && (
                <HomeScreen onNavigate={handleNavigate} />
            )}

            {(currentScreen === 'Location' || currentScreen === 'Location Search' || currentScreen === 'LocationSearch') && (
                <LocationSearchScreen
                    onBack={handleBack}
                    onNavigate={handleNavigate}
                />
            )}

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
                <RestaurantDetailScreen
                    restaurant={selectedRestaurant}
                    onBack={() => setCurrentScreen('Food')}
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

            {(currentScreen === 'Activity' || currentScreen === 'Bookings' || currentScreen === 'Orders') && (
                <BookingsScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'Wallet' && (
                <WalletScreen onNavigate={handleNavigate} />
            )}

            {currentScreen === 'Profile' && (
                <ProfileScreen onNavigate={handleNavigate} />
            )}

            {/* Driver Mode Screens */}
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
