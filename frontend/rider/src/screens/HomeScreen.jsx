import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import { useRideStore } from '../../store/rideStore';
import HeaderBar from '../components/Header';
import BottomNavBar from '../components/bottomNavBar';
import RecentPlaces from '../components/recentplaces';
import ServiceCategoryGrid from '../components/serviceCard';
import BrandBanner from '../components/brandBanner';
// import LocationSearchScreen from './LocationSearchScreen';
export default function HomeScreen({ navigation, onNavigate }) {
    const { theme, isDark, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('Home');
    const [selectedService, setSelectedService] = useState('ride');


    const {
        pickupLocation,
        destination,
        serviceType,
        setServiceType,
        setRideStatus,
        setPickupLocation,
        setDestination,
    } = useRideStore();

    const handleNavigate = (screen) => {
        if (navigation) {
            navigation.navigate(screen);
        } else if (onNavigate) {
            onNavigate(screen);
        }
    };

    const handleRequestRide = () => {
        setRideStatus('SEARCHING');
        if (serviceType === 'package') {
            handleNavigate('PackageDetails');
        } else {
            handleNavigate('FindingDriver');
        }
    };

    const handleFindRide = () => {
        if (selectedService == 'delivery') {
            handleNavigate('PackageDetails');
        } else {
            handleNavigate('Location');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Header */}
                <HeaderBar
                    userAvatar={null}
                    onMenuPress={toggleTheme}
                    onNotificationPress={() => handleNavigate('Notifications')}
                    onProfilePress={() => handleNavigate('Profile')}
                />

                {/* Brand Hero Banner */}
                <BrandBanner activeService={selectedService} />

                {/* Location Input Box */}
                <TouchableOpacity
                    style={[styles.locationBox, { backgroundColor: theme.surface }]}
                    onPress={() => handleNavigate('Location')}
                    activeOpacity={0.9}
                >
                    <View style={styles.inputRow}>
                        <View style={[styles.pinDot, { backgroundColor: theme.placeholder }]} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            value={pickupLocation}
                            onChangeText={setPickupLocation}
                            onFocus={() => handleNavigate('Location')}
                            placeholder="Add a pick-up location"
                            placeholderTextColor={theme.placeholder}
                        />
                        <TouchableOpacity
                            style={[styles.useCurrentBadge, { borderColor: theme.primaryGreen }]}
                            onPress={() => setPickupLocation('Current Location')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="navigate-circle-outline" size={12} color={theme.primaryGreen} />
                            <Text style={[styles.badgeText, { color: theme.primaryGreen }]}>Use current</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.inputSeparator || '#262A34' }]} />

                    <View style={styles.inputRow}>
                        <View style={[styles.pinDot, { backgroundColor: theme.primaryGreen }]} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            value={destination}
                            onChangeText={setDestination}
                            onFocus={() => handleNavigate('Location')}
                            placeholder="Add your destination"
                            placeholderTextColor={theme.placeholder}
                        />
                    </View>
                </TouchableOpacity>


                {/* Service Category Grid (Ride, Food, Delivery, Shop) */}
                <ServiceCategoryGrid
                    activeService={selectedService}
                    onSelectService={(serv) => setSelectedService(serv)}
                />

                {/* Primary Action Button */}
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: theme.primaryGreen }]}
                    onPress={handleFindRide}
                    activeOpacity={0.8}
                >
                    <Text style={styles.ctaText}>
                        {serviceType === 'package' ? 'Continue to Package Details' : 'Find a Ride'}
                    </Text>
                </TouchableOpacity>

                {/* Recent Places Section */}
                <RecentPlaces onSelectPlace={(place) => setDestination(place.title || place.address)} />
            </ScrollView>

            {/* Persistent Bottom Bar */}
            <BottomNavBar activeTab={activeTab} onTabPress={(tab) => setActiveTab(tab)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 38,
        marginBottom: 20,
        letterSpacing: -0.6,
    },
    locationBox: {
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
    },
    divider: {
        height: 1,
        marginHorizontal: 8,
    },
    pinDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontWeight: '500',
        fontSize: 14,
    },
    useCurrentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    servicePills: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        marginBottom: 16,
    },
    pill: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillText: {
        fontWeight: '700',
        fontSize: 14,
    },
    ctaButton: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    ctaText: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 15,
    },
});