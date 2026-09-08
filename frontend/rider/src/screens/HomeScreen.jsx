import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useTheme } from './../theme/themeContext';
import { useRideStore } from '../../store/rideStore';
import HeaderBar from './../components/Header';

const VEHICLE_TIERS = [
    { id: 'standard', name: 'Standard', time: '3 min', seats: 4, price: 10 },
    { id: 'comfort', name: 'Comfort', time: '3 min', seats: 4, price: 15 },
    { id: 'luxury', name: 'Luxury', time: '3 min', seats: 4, price: 25 },
];

export default function HomeScreen({ navigation, onNavigate }) {
    const { theme, isDark, toggleTheme } = useTheme();

    const {
        pickupLocation,
        destination,
        fare,
        selectedVehicleTier,
        serviceType,
        driver,
        selectVehicle,
        setServiceType,
        setRideStatus,
        setPickupLocation,
        setDestination,
    } = useRideStore();

    const handleOpenMenu = () => {
        toggleTheme();
    };

    const handleOpenNotifications = () => {
        if (navigation) {
            navigation.navigate('Notifications');
        } else if (onNavigate) {
            onNavigate('Notifications');
        }
    };

    const handleOpenProfile = () => {
        if (navigation) {
            navigation.navigate('Profile');
        } else if (onNavigate) {
            onNavigate('Profile');
        }
    };

    const handleRequestRide = () => {
        setRideStatus('SEARCHING');
        if (serviceType === 'package') {
            navigation?.navigate('PackageDetails') || onNavigate?.('PackageDetails');
        } else {
            navigation?.navigate('FindingDriver') || onNavigate?.('FindingDriver');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top Header */}
                <HeaderBar
                    userAvatar={null}
                    onMenuPress={handleOpenMenu}
                    onNotificationPress={handleOpenNotifications}
                    onProfilePress={handleOpenProfile}
                />

                {/* Headline */}
                <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>
                    Where do you{'\n'}want to go?
                </Text>

                {/* Driver Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
                    <Image
                        source={{
                            uri:
                                driver?.avatar ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                        }}
                        style={styles.profileAvatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                            {driver?.name || 'Ucok Behel'}
                        </Text>
                        <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
                            {driver?.vehicle || 'Honda CRV'}
                        </Text>
                    </View>
                    <Text style={[styles.stars, { color: theme.starGold }]}>
                        ★ {driver?.rating || '5.0'}
                    </Text>
                </View>

                {/* Location Box */}
                <View style={[styles.locationBox, { backgroundColor: theme.inputBg }]}>
                    <View style={styles.inputRow}>
                        <View style={[styles.pinDot, { backgroundColor: theme.placeholder }]} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            value={pickupLocation}
                            onChangeText={setPickupLocation}
                            placeholder="Add a pick-up location"
                            placeholderTextColor={theme.placeholder}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />
                    <View style={styles.inputRow}>
                        <View style={[styles.pinDot, { backgroundColor: theme.primaryGreen }]} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            value={destination}
                            onChangeText={setDestination}
                            placeholder="Add your destination"
                            placeholderTextColor={theme.placeholder}
                        />
                    </View>
                </View>

                {/* Service Toggle Pills */}
                <View style={[styles.servicePills, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity
                        style={[
                            styles.pill,
                            serviceType === 'driver' && { backgroundColor: theme.primaryGreen },
                        ]}
                        onPress={() => setServiceType('driver')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.pillText,
                                { color: serviceType === 'driver' ? '#FFFFFF' : theme.textSecondary },
                            ]}
                        >
                            🚗 Driver
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.pill,
                            serviceType === 'package' && { backgroundColor: theme.primaryGreen },
                        ]}
                        onPress={() => setServiceType('package')}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.pillText,
                                { color: serviceType === 'package' ? '#FFFFFF' : theme.textSecondary },
                            ]}
                        >
                            📦 Package
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Vehicle Carousel */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContainer}
                    style={styles.carousel}
                >
                    {VEHICLE_TIERS.map((tier) => {
                        const isSelected = selectedVehicleTier === tier.id;
                        return (
                            <TouchableOpacity
                                key={tier.id}
                                style={[
                                    styles.vCard,
                                    {
                                        backgroundColor: isSelected
                                            ? theme.tierCardActiveBg
                                            : theme.tierCardInactiveBg,
                                        borderColor: isSelected
                                            ? theme.tierCardActiveBorder
                                            : theme.tierCardInactiveBorder,
                                    },
                                ]}
                                onPress={() => selectVehicle(tier.id, tier.price)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.vHeader}>
                                    <Text
                                        style={[
                                            styles.vName,
                                            { color: isSelected ? theme.primaryGreen : theme.textPrimary },
                                        ]}
                                    >
                                        {tier.name}
                                    </Text>
                                    <Text style={[styles.vTime, { color: theme.placeholder }]}>
                                        {tier.time}
                                    </Text>
                                </View>

                                <Text style={[styles.vSeats, { color: theme.textSecondary }]}>
                                    👤 {tier.seats}
                                </Text>

                                <View style={styles.vFooter}>
                                    <View
                                        style={[
                                            styles.steeringCircle,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.iconCircleActiveBg
                                                    : theme.iconCircleInactiveBg,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.steeringText,
                                                {
                                                    color: isSelected
                                                        ? theme.iconCircleActiveColor
                                                        : theme.iconCircleInactiveColor,
                                                },
                                            ]}
                                        >
                                            ☸
                                        </Text>
                                    </View>
                                    <Text style={[styles.vPrice, { color: theme.textPrimary }]}>
                                        ${tier.price}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Request CTA Button */}
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: theme.primaryGreen }]}
                    onPress={handleRequestRide}
                    activeOpacity={0.8}
                >
                    <Text style={styles.ctaText}>
                        {serviceType === 'package'
                            ? 'Continue to Package Details'
                            : `Request Dropp Ride ($${fare || 10})`}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
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
        paddingBottom: 32,
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: '800',
        lineHeight: 38,
        marginBottom: 20,
        letterSpacing: -0.6,
    },
    profileCard: {
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FDE047',
        marginRight: 12,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontWeight: '700',
        fontSize: 15,
    },
    profileSub: {
        fontSize: 12,
        marginTop: 2,
    },
    stars: {
        fontSize: 13,
        fontWeight: '700',
    },
    locationBox: {
        borderRadius: 20,
        paddingVertical: 4,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 16,
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    pinDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontWeight: '500',
        fontSize: 14,
    },
    servicePills: {
        flexDirection: 'row',
        borderRadius: 18,
        padding: 6,
        marginBottom: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
    },
    pill: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillText: {
        fontWeight: '700',
        fontSize: 14,
    },
    carousel: {
        marginBottom: 20,
    },
    carouselContainer: {
        gap: 12,
        paddingRight: 8,
    },
    vCard: {
        width: 124,
        borderRadius: 20,
        padding: 14,
        borderWidth: 1.5,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
    },
    vHeader: {
        marginBottom: 4,
    },
    vName: {
        fontWeight: '700',
        fontSize: 15,
    },
    vTime: {
        fontSize: 12,
        marginTop: 2,
    },
    vSeats: {
        fontSize: 13,
        fontWeight: '600',
        marginVertical: 12,
    },
    vFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    steeringCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    steeringText: {
        fontSize: 14,
    },
    vPrice: {
        fontWeight: '800',
        fontSize: 16,
    },
    ctaButton: {
        height: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    ctaText: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 16,
    },
});