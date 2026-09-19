import React, { useState } from React;
import { Text, View, StatusBar, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../theme/themeContext";
import { useRideStore } from "../../store/rideStore";
import SwapLocationsButton from "../components/location/swapLocationButton";

const SAVED_PLACES = [

    {
        id: 'home',
        title: 'home',
        address: '123 Green Park, New Delhi',
        icon: 'home',
        badge: 'saved',
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


export default function LocationSearchScreen({ onBack, onNavigate, onSetOnMap }) {
    const { theme, isDark } = useTheme();

    //the global ride state  from Zustand store}
    const { pickupLocation, destination, setPickupLocation, setDestination } = useRideStore();

    //track the filed 
    const [focusedField, setFocusedField] = useState('destination');

    const handleSwapLocation = () => {
        const tempPickup = pickupLocation;
        setPickupLocation(destination);
        setDestination(tempPickup);
    };

    // Handle 

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* header */}
            <SwapLocationsButton />


        </SafeAreaView>
    )
};


const styles = StyleSheet.create({

});