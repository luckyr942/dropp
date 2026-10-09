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

import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

// Components
import LocationInputCard from '../components/locationInput';
import SavedPlaceCard from '../components/savedLocation';
import RecentLocations from '../components/recentPlaces';
import LocationHeader from '../components/locationHeader';
import VehicleSelectionModal from '../components/VehicleSelectionModal';

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
    const [showVehicleModal, setShowVehicleModal] = useState(false);

    // Handle location swapping
    const handleSwapLocation = () => {
        const tempPickup = pickupLocation;
        setPickupLocation(destination);
        setDestination(tempPickup);
    };

    // Back button handler
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

        if (!pickupLocation) {
            setPickupLocation('Current Location (Green Park)');
        }

        if (focusedField === 'pickup') {
            setPickupLocation(formatted);
            setFocusedField('destination');
        } else {
            setDestination(formatted);
            setShowVehicleModal(true); // Open Vehicle Picker Modal immediately
        }
    };

    const backIconColor = theme.textPrimary || '#FFFFFF';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <LocationHeader
                onBack={handleBackButton}
                onUseCurrent={() => {
                    setPickupLocation('Current Location (Green Park)');
                }}
            >
                <Ionicons name="chevron-back" size={28} color={backIconColor} />
            </LocationHeader>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 1. Location Input Card */}
                <LocationInputCard
                    pickupLocation={pickupLocation}
                    destination={destination}
                    setPickupLocation={setPickupLocation}
                    setDestination={setDestination}
                    onFocusPickup={() => setFocusedField('pickup')}
                    onFocusDrop={() => setFocusedField('destination')}
                    onSwap={handleSwapLocation}
                />

                {/* Confirm Locations Button if filled */}
                {destination ? (
                    <TouchableOpacity
                        style={[styles.chooseVehicleBtn, { backgroundColor: theme.primaryGreen }]}
                        onPress={() => {
                            if (!pickupLocation) setPickupLocation('Current Location (Green Park)');
                            setShowVehicleModal(true);
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.chooseVehicleText}>Choose Vehicle & View Fares</Text>
                        <Ionicons name="arrow-forward" size={18} color="#000" />
                    </TouchableOpacity>
                ) : null}

                {/* 2. Horizontal Saved Places */}
                <SavedPlaceCard
                    places={SAVED_PLACES}
                    onSelectPlace={handleSelectPlace}
                    onAddNewPlace={() => alert('Add new place')}
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

            {/* Vehicle Selection Modal */}
            <VehicleSelectionModal
                visible={showVehicleModal}
                pickup={pickupLocation || 'Current Location (Green Park)'}
                drop={destination}
                onClose={() => setShowVehicleModal(false)}
                onConfirmBook={() => {
                    setShowVehicleModal(false);
                    if (onNavigate) {
                        onNavigate('FindingDriver');
                    }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 40,
    },
    chooseVehicleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 14,
        marginVertical: 12,
        gap: 8,
    },
    chooseVehicleText: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 15,
    },
});
