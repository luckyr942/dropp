import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import DriverHomeScreen from '../screens/DriverHomeScreen.jsx';
import DriverNavigationScreen from '../screens/DriverNavigationScreen.jsx';
import DriverEarningsScreen from '../screens/DriverEarningsScreen.jsx';

export default function AppNavigator() {
    const [currentScreen, setCurrentScreen] = useState('DriverHome');

    const handleNavigate = (screenName) => {
        if (!screenName) return;
        setCurrentScreen(screenName);
    };

    return (
        <View style={styles.container}>
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
    container: { flex: 1 },
});
