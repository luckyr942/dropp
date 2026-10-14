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
import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';
import HeaderBar from '../../../shared/components/Header';
import BottomNavBar from '../../../shared/components/bottomNavBar';
import RecentPlaces from '../../../shared/components/recentplaces';
import ServiceCategoryGrid from '../../../shared/components/serviceCard';
import BrandBanner from '../../../shared/components/brandBanner';

export default function HomeScreen({ navigation, onNavigate }) {
    const { theme, isDark, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('Home');
    const [selectedService, setSelectedService] = useState('ride');

    const {
        pickupLocation,
        destination,
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

    const handleServiceSelect = (serv) => {
        setSelectedService(serv);
        setServiceType(serv);
        if (serv === 'food') {
            handleNavigate('Food');
        } else if (serv === 'delivery') {
            handleNavigate('PackageDetails');
        }
    };

    const handlePrimaryAction = () => {
        if (selectedService === 'delivery') {
            handleNavigate('PackageDetails');
        } else if (selectedService === 'food') {
            handleNavigate('Food');
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
                    onSelectService={handleServiceSelect}
                />

                {/* Primary Action Button */}
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: theme.primaryGreen }]}
                    onPress={handlePrimaryAction}
                    activeOpacity={0.8}
                >
                    <Text style={styles.ctaText}>
                        {selectedService === 'delivery'
                            ? 'Continue to Package Details'
                            : selectedService === 'food'
                            ? 'Explore Nearby Restaurants'
                            : 'Find a Ride'}
                    </Text>
                </TouchableOpacity>

                {/* Recent Places Section */}
                <RecentPlaces onSelectPlace={(place) => setDestination(place.title || place.address)} />
            </ScrollView>

            {/* Persistent Bottom Bar */}
            <BottomNavBar
                preset="main"
                activeTab={activeTab}
                onTabPress={(tab) => handleNavigate(tab)}
                centerAction={{
                    icon: 'microphone-outline',
                    family: 'MaterialCommunityIcons',
                    size: 28,
                    colors: ['#00E57B', '#00AD57'],
                    onPress: () => alert('Dropp Voice Assistant'),
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100,
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
