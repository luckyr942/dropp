import React, { useState } from 'react';
import {
    Text,
    View,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/themeContext';
import { useRideStore } from '../../store/rideStore';

// Components
import LocationInputCard from '../components/location/locationInput';
import SavedPlaceCard from '../components/location/savedLocation';
import RecentLocations from '../components/location/recentPlaces';

const SAVED_PLACES = [
    {
        id: 'home',
        title: 'Home',
        address: '123 Green Park, New Delhi',
        icon: 'home',
        badge: 'Saved',
    },
    {
        id: 'work',
        title: 'Work',
        address: 'Cyber Hub, Building 10, Gurugram',
        icon: 'briefcase',
        badge: 'Saved',
    },
    {
        id: 'gym',
        title: 'Gym',
        address: "Gold's Gym, Hauz Khas Enclave",
        icon: 'fitness',
        badge: 'Recent',
    },
    {
        id: 'cafe',
        title: 'Favorite Cafe',
        address: 'Blue Tokai Coffee, Saidulajab',
        icon: 'cafe',
        badge: 'Recent',
    },
];

const RECENT_LOCATIONS = [
    {
        id: '1',
        title: 'Connaught Place',
        address: 'New Delhi',
        icon: 'time-outline',
    },
    {
        id: '2',
        title: 'Indira Gandhi International Airport',
        address: 'Terminal 3, New Delhi',
        icon: 'time-outline',
    },
    {
        id: '3',
        title: 'Select Citywalk',
        address: 'Saket, New Delhi',
        icon: 'location-outline',
    },
];

export default function LocationSearchScreen({
    onBack,
    onNavigate,
    onSetOnMap,
    onSeeAllRecent,
}) {
    const { theme, isDark } = useTheme();

    // Zustand Global Ride State
    const {
        pickupLocation,
        destination,
        setPickupLocation,
        setDestination,
    } = useRideStore();

    // Track active input: 'pickup' | 'destination'
    const [focusedField, setFocusedField] = useState('destination');

    // Handle location swapping
    const handleSwapLocation = () => {
        const tempPickup = pickupLocation;
        setPickupLocation(destination);
        setDestination(tempPickup);
    };

    // Back button handler with safety check
    const handleBackButton = () => {
        if (onBack) {
            onBack();
        } else if (onNavigate) {
            onNavigate('Home');
        }
    };

    // Selection handler for Saved Places & Recent Locations
    const handleSelectPlace = (place) => {
        const formatted = place.address
            ? `${place.title}, ${place.address}`
            : place.title;

        if (focusedField === 'pickup') {
            setPickupLocation(formatted);
            setFocusedField('destination'); // Auto-switch focus to drop after pickup is selected
        } else {
            setDestination(formatted);
        }
    };

    const backIconColor =
        theme.textPrimary || theme.textPrimaryHeading || '#FFFFFF';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header Back Button */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={handleBackButton}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={28} color={backIconColor} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 1. Location Input Card with embedded Swap button */}
                <LocationInputCard
                    pickupLocation={pickupLocation}
                    destination={destination}
                    setPickupLocation={setPickupLocation}
                    setDestination={setDestination}
                    onFocusPickup={() => setFocusedField('pickup')}
                    onFocusDrop={() => setFocusedField('destination')}
                    onSwap={handleSwapLocation}
                />

                {/* 2. Horizontal Saved Places */}
                <SavedPlaceCard
                    places={SAVED_PLACES}
                    onSelectPlace={handleSelectPlace}
                    onAddNewPlace={() => console.log('Add new place tapped')}
                />

                {/* 3. Vertical Recent Locations */}
                <RecentLocations
                    locations={RECENT_LOCATIONS}
                    onSelectLocation={handleSelectPlace}
                    onSeeAll={
                        onSeeAllRecent ||
                        (() => onNavigate && onNavigate('RecentLocationsFull'))
                    }
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 40,
    },
});