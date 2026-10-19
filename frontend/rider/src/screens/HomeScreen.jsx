import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Platform,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Ionicons,
    MaterialCommunityIcons,
    Feather,
} from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import useAura from '../../../shared/voice/useAura';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const Images = {
    logo: require('../../../assets/logo.png'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bike: require('../../../assets/vehicles/bike.jpg'),
    auto: require('../../../assets/vehicles/auto.jpg'),
    mini: require('../../../assets/vehicles/mini.jpg'),
    suv: require('../../../assets/vehicles/suv.jpg'),
};

const SERVICE_TABS = [
    { id: 'Ride', label: 'Ride', icon: 'car-sport', iconType: 'Ionicons' },
    { id: 'Food', label: 'Food', icon: 'silverware-fork-knife', iconType: 'MaterialCommunityIcons' },
    { id: 'Delivery', label: 'Delivery', icon: 'cube-outline', iconType: 'Ionicons' },
    { id: 'Shop', label: 'Shop', icon: 'bag-handle-outline', iconType: 'Ionicons' },
];

const SAVED_PLACES = [
    { id: 'home', label: 'Home', sub: 'Add', icon: 'home-outline' },
    { id: 'work', label: 'Work', sub: 'Add', icon: 'briefcase-outline' },
    { id: 'galleria', label: 'Galleria', sub: '12 min', icon: 'location-outline' },
    { id: 'add', label: 'Add New', sub: 'Saved place', icon: 'star-outline' },
];

// Fallback & mapping metadata for tiers
const TIER_METADATA = {
    bike: {
        name: 'Bike',
        sub: 'Fast & affordable',
        image: Images.bike,
        defaultFare: 49,
        etaMins: 3,
    },
    auto: {
        name: 'Auto',
        sub: 'Budget friendly',
        image: Images.auto,
        defaultFare: 89,
        etaMins: 4,
    },
    cab_economy: {
        name: 'Go Mini',
        sub: 'Comfortable AC',
        image: Images.mini,
        defaultFare: 149,
        etaMins: 4,
    },
    cab_premium: {
        name: 'Go Plus',
        sub: 'Spacious SUV',
        image: Images.suv,
        defaultFare: 249,
        etaMins: 6,
    },
};

export default function HomeScreen({ navigation, onNavigate }) {
    const [selectedService, setSelectedService] = useState('Ride');
    const [selectedRideType, setSelectedRideType] = useState('bike');
    const [activeNavTab, setActiveNavTab] = useState('Home');
    const [pickup, setPickup] = useState('Sector 28, Gurugram');
    const [dropoff, setDropoff] = useState('Cyber Hub, Gurugram');

    // Real-time backend quote state
    const [quoteData, setQuoteData] = useState(null);
    const [loadingEstimate, setLoadingEstimate] = useState(false);
    const [estimateError, setEstimateError] = useState(null);

    const { setPickupLocation, setDestination, setServiceType, selectVehicle } = useRideStore();
    const { startListening, isListening } = useAura();

    const handleNavigate = (route, params = {}) => {
        if (navigation) {
            navigation.navigate(route, params);
        } else if (typeof onNavigate === 'function') {
            onNavigate(route, params);
        }
    };

    // ─── Fetch real-time price estimate from backend ─────────────────
    const fetchRideEstimate = useCallback(async (pickupLoc, dropLoc) => {
        if (!pickupLoc || !dropLoc) return;
        setLoadingEstimate(true);
        setEstimateError(null);

        try {
            const res = await fetch(`${API_BASE}/api/rides/estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup: pickupLoc,
                    drop: dropLoc,
                }),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setQuoteData(data.data);
            } else {
                setEstimateError(data.error || 'Unable to fetch estimate');
            }
        } catch (err) {
            console.warn('[HomeScreen] Live estimate fetch error:', err.message);
            setEstimateError(err.message);
        } finally {
            setLoadingEstimate(false);
        }
    }, []);

    // Initial fetch on mount or whenever pickup/dropoff changes
    useEffect(() => {
        fetchRideEstimate(pickup, dropoff);
    }, [pickup, dropoff, fetchRideEstimate]);

    const handleServicePress = (serviceId) => {
        setSelectedService(serviceId);
        if (serviceId === 'Food') {
            handleNavigate('Food');
        } else if (serviceId === 'Delivery') {
            handleNavigate('PackageDetails');
        } else if (serviceId === 'Shop') {
            handleNavigate('Food');
        }
    };

    const handleFindRide = () => {
        const selectedTier = availableTiers.find((t) => t.type === selectedRideType);
        setPickupLocation(pickup);
        setDestination(dropoff);
        setServiceType(selectedRideType);
        if (selectedTier) {
            selectVehicle(selectedRideType, selectedTier.fare);
        }
        handleNavigate('FindingDriver', {
            quoteId: quoteData?.quoteId,
            rideType: selectedRideType,
            fare: selectedTier?.fare,
        });
    };

    // Compose real-time tiers from backend or fallback to initial estimates
    const availableTiers = (quoteData?.fares && quoteData.fares.length > 0)
        ? quoteData.fares.map((f) => {
            const meta = TIER_METADATA[f.type] || {
                name: f.name || 'Cab',
                sub: 'Quick ride',
                image: Images.mini,
                etaMins: f.etaMins || 4,
            };
            return {
                type: f.type,
                name: meta.name,
                sub: meta.sub,
                fare: f.fare,
                eta: `${f.etaMins || meta.etaMins} min`,
                image: meta.image,
            };
        })
        : [
            { type: 'bike', name: 'Bike', sub: 'Fast & affordable', fare: 49, eta: '3 min', image: Images.bike },
            { type: 'auto', name: 'Auto', sub: 'Budget friendly', fare: 89, eta: '4 min', image: Images.auto },
            { type: 'cab_economy', name: 'Go Mini', sub: 'Comfortable AC', fare: 149, eta: '4 min', image: Images.mini },
            { type: 'cab_premium', name: 'Go Plus', sub: 'Spacious SUV', fare: 249, eta: '6 min', image: Images.suv },
        ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4FAF7" />

            {/* Soft mint backdrop gradient */}
            <LinearGradient
                colors={['#EAF8F1', '#F5FCF8', '#FFFFFF']}
                locations={[0, 0.25, 0.6]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─────────────────────────────────────────────────────────────
                    1. TOP HEADER (dropp, Gurugram Sector 28, Wallet ₹450, Bell, Avatar)
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={Images.logo}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />

                        <TouchableOpacity
                            style={styles.locationSelector}
                            activeOpacity={0.7}
                            onPress={() => handleNavigate('Location')}
                        >
                            <Ionicons name="location-sharp" size={13} color="#00C96B" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                Gurugram, Sector 28
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#5A6570" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.walletPill}
                            activeOpacity={0.8}
                            onPress={() => handleNavigate('Wallet')}
                        >
                            <Ionicons name="wallet-outline" size={14} color="#1A1D20" />
                            <Text style={styles.walletAmount}>₹450</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconCircleButton}
                            activeOpacity={0.8}
                            onPress={() => alert('No new notifications')}
                        >
                            <Ionicons name="notifications-outline" size={16} color="#1A1D20" />
                            <View style={styles.notificationBadge} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.avatarWrapper}
                            activeOpacity={0.8}
                            onPress={() => handleNavigate('Profile')}
                        >
                            <Image
                                source={{ uri: Images.avatar }}
                                style={styles.avatarImage}
                            />
                            <View style={styles.onlineBadge} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    2. SERVICE PILLS (Ride, Food, Delivery, Shop)
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.serviceTabsContainer}>
                    {SERVICE_TABS.map((tab) => {
                        const isActive = selectedService === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[
                                    styles.serviceTabPill,
                                    isActive && styles.serviceTabPillActive,
                                ]}
                                activeOpacity={0.8}
                                onPress={() => handleServicePress(tab.id)}
                            >
                                {tab.iconType === 'Ionicons' ? (
                                    <Ionicons
                                        name={tab.icon}
                                        size={14}
                                        color={isActive ? '#FFFFFF' : '#1A1D20'}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name={tab.icon}
                                        size={14}
                                        color={isActive ? '#FFFFFF' : '#1A1D20'}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.serviceTabLabel,
                                        isActive && styles.serviceTabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    3. STYLIZED MAP CANVAS WITH ROUTE & CARS
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.mapCanvas}>
                    {/* Grid Layout Roads & City Blocks */}
                    <View style={styles.gridOverlay}>
                        <View style={[styles.gridRoadH, { top: '30%' }]} />
                        <View style={[styles.gridRoadH, { top: '70%' }]} />
                        <View style={[styles.gridRoadV, { left: '25%' }]} />
                        <View style={[styles.gridRoadV, { left: '68%' }]} />
                        <View style={[styles.gridBlock, { top: '8%', left: '8%', width: '14%', height: '18%' }]} />
                        <View style={[styles.gridBlock, { top: '8%', left: '30%', width: '34%', height: '18%' }]} />
                        <View style={[styles.gridBlock, { top: '8%', right: '6%', width: '22%', height: '18%' }]} />
                        <View style={[styles.gridBlock, { top: '36%', left: '30%', width: '34%', height: '28%' }]} />
                        <View style={[styles.gridBlock, { top: '76%', left: '8%', width: '14%', height: '18%' }]} />
                        <View style={[styles.gridBlock, { top: '76%', right: '6%', width: '22%', height: '18%' }]} />
                    </View>

                    {/* Green Route Polyline */}
                    <View style={styles.routeContainer}>
                        <View style={styles.routeSegment1} />
                        <View style={styles.routeSegment2} />
                        <View style={styles.routeSegment3} />
                    </View>

                    {/* Real-time Distance & Duration Tag on Map */}
                    {quoteData?.distanceKm && (
                        <View style={styles.routeMetaTag}>
                            <Ionicons name="navigate-outline" size={11} color="#00C96B" />
                            <Text style={styles.routeMetaText}>
                                {quoteData.distanceKm} km • {quoteData.durationMins} mins
                            </Text>
                        </View>
                    )}

                    {/* Nearby White Car with "3 min away" Badge */}
                    <View style={styles.nearbyCarWrapper}>
                        <View style={styles.etaBadge}>
                            <Text style={styles.etaBadgeText}>3 min away</Text>
                        </View>
                        <View style={styles.carMarkerCircle}>
                            <MaterialCommunityIcons name="car-side" size={17} color="#00C96B" />
                        </View>
                    </View>

                    {/* Ambient cars on road grid */}
                    <View style={[styles.ambientCar, { top: '24%', right: '22%' }]}>
                        <MaterialCommunityIcons name="car-side" size={13} color="#788896" />
                    </View>
                    <View style={[styles.ambientCar, { bottom: '22%', left: '16%' }]}>
                        <MaterialCommunityIcons name="car-side" size={13} color="#788896" />
                    </View>

                    {/* Sector 28 (Pickup location) Pin Pill */}
                    <View style={styles.pickupPinPill}>
                        <View style={styles.pickupDot} />
                        <View>
                            <Text style={styles.pickupPinTitle}>Sector 28</Text>
                            <Text style={styles.pickupPinSub}>Pickup location</Text>
                        </View>
                    </View>

                    {/* Cyber Hub (Gurugram) Drop Pin Pill */}
                    <View style={styles.dropPinPill}>
                        <Ionicons name="location-sharp" size={16} color="#FF3B30" />
                        <View>
                            <Text style={styles.dropPinTitle}>Cyber Hub</Text>
                            <Text style={styles.dropPinSub}>Gurugram</Text>
                        </View>
                    </View>

                    {/* Crosshair / Recenter Button */}
                    <TouchableOpacity
                        style={styles.crosshairButton}
                        activeOpacity={0.8}
                        onPress={() => fetchRideEstimate(pickup, dropoff)}
                    >
                        {loadingEstimate ? (
                            <ActivityIndicator size="small" color="#00C96B" />
                        ) : (
                            <Ionicons name="locate" size={18} color="#1A1D20" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    4. "WHERE ARE YOU GOING?" FLOATING CARD
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.whereCard}>
                    {/* Top drag handle indicator */}
                    <View style={styles.dragHandle} />

                    {/* Card Header & "Use current" button */}
                    <View style={styles.cardHeaderRow}>
                        <View>
                            <Text style={styles.cardTitle}>Where are you going?</Text>
                            <Text style={styles.cardSubtitle}>Book a ride in seconds</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.useCurrentBtn}
                            activeOpacity={0.7}
                            onPress={() => setPickup('Sector 28, Gurugram')}
                        >
                            <Ionicons name="locate" size={12} color="#00C96B" />
                            <Text style={styles.useCurrentText}>Use current</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pickup & Destination Inputs Container */}
                    <View style={styles.inputsContainer}>
                        {/* Left Vertical Line with Dot & Square */}
                        <View style={styles.routeDotsCol}>
                            <View style={styles.dotGreen} />
                            <View style={styles.dotsLine} />
                            <View style={styles.dotRed} />
                        </View>

                        {/* Right Input Fields */}
                        <View style={styles.inputsCol}>
                            {/* Pickup Row */}
                            <TouchableOpacity
                                style={styles.inputRow}
                                activeOpacity={0.7}
                                onPress={() => handleNavigate('Location')}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputTextBold} numberOfLines={1}>
                                        {pickup}
                                    </Text>
                                    <Text style={styles.inputLabelSub}>Pickup location</Text>
                                </View>
                                <TouchableOpacity
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    onPress={() => setPickup('Current Location')}
                                >
                                    <Ionicons name="close" size={17} color="#8A95A0" />
                                </TouchableOpacity>
                            </TouchableOpacity>

                            <View style={styles.inputDivider} />

                            {/* Dropoff Row */}
                            <TouchableOpacity
                                style={styles.inputRow}
                                activeOpacity={0.7}
                                onPress={() => handleNavigate('Location')}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputTextBold} numberOfLines={1}>
                                        {dropoff}
                                    </Text>
                                    <Text style={styles.inputLabelSub}>Drop location</Text>
                                </View>
                                <TouchableOpacity
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    onPress={() => handleNavigate('Location')}
                                >
                                    <Ionicons name="add" size={19} color="#8A95A0" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Saved Place Chips (Home, Work, Galleria, Add New) */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.savedPlacesScroll}
                    >
                        {SAVED_PLACES.map((place) => (
                            <TouchableOpacity
                                key={place.id}
                                style={styles.savedChip}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (place.id === 'add') {
                                        handleNavigate('Location');
                                    } else {
                                        setDropoff(place.label + ', Gurugram');
                                    }
                                }}
                            >
                                <Ionicons
                                    name={place.icon}
                                    size={15}
                                    color="#1A1D20"
                                />
                                <View>
                                    <Text style={styles.savedChipTitle}>{place.label}</Text>
                                    <Text style={styles.savedChipSub}>{place.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Action Button: Find a Ride ➔ */}
                    <TouchableOpacity
                        style={styles.findRideBtn}
                        activeOpacity={0.88}
                        onPress={handleFindRide}
                    >
                        <LinearGradient
                            colors={['#00C96B', '#00B860']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.findRideGradient}
                        >
                            <Text style={styles.findRideBtnText}>
                                {loadingEstimate ? 'Calculating Route...' : 'Find a Ride'}
                            </Text>
                            <Feather name="arrow-right" size={17} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    5. "CHOOSE A RIDE TYPE" CAROUSEL (Real-time live prices)
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.rideTypeSection}>
                    <View style={styles.rideTypeSectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.sectionHeaderTitle}>Choose a ride type</Text>
                            {loadingEstimate && (
                                <ActivityIndicator size="small" color="#00C96B" />
                            )}
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleNavigate('Location')}
                            style={styles.seeAllRow}
                        >
                            <Text style={styles.seeAllText}>See all</Text>
                            <Ionicons name="chevron-forward" size={14} color="#00C96B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.rideTypesScroll}
                    >
                        {availableTiers.map((ride) => {
                            const isSelected = selectedRideType === ride.type;
                            return (
                                <TouchableOpacity
                                    key={ride.type}
                                    style={[
                                        styles.rideTypeCard,
                                        isSelected && styles.rideTypeCardSelected,
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedRideType(ride.type)}
                                >
                                    {/* 3D Vehicle Render Image */}
                                    <View style={styles.vehicleImageWrapper}>
                                        <Image
                                            source={ride.image}
                                            style={styles.vehicleImage}
                                            resizeMode="contain"
                                        />
                                    </View>

                                    {/* Vehicle Name */}
                                    <Text style={styles.rideName}>{ride.name}</Text>
                                    <Text style={styles.rideSub}>{ride.sub}</Text>

                                    {/* Real-time Calculated Fare */}
                                    <Text style={styles.ridePrice}>₹{ride.fare}</Text>

                                    {/* ETA pill */}
                                    <View style={[
                                        styles.etaPill,
                                        isSelected && styles.etaPillSelected,
                                    ]}>
                                        <Text style={[
                                            styles.etaText,
                                            isSelected && styles.etaTextSelected,
                                        ]}>
                                            {ride.eta}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Bottom spacing for floating navigation bar */}
                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ─────────────────────────────────────────────────────────────
                6. BOTTOM NAVIGATION BAR WITH CENTER SCANNER / AURA BUTTON
            ───────────────────────────────────────────────────────────── */}
            <View style={styles.bottomNavContainer}>
                {/* Home */}
                <TouchableOpacity
                    style={styles.navItem}
                    activeOpacity={0.7}
                    onPress={() => {
                        setActiveNavTab('Home');
                        handleNavigate('Home'); // Back to main 4-box home
                    }}
                >
                    <Ionicons
                        name="home"
                        size={21}
                        color="#00C96B"
                    />
                    <Text style={[styles.navLabel, styles.navLabelActive]}>
                        Home
                    </Text>
                </TouchableOpacity>

                {/* Orders / Activity */}
                <TouchableOpacity
                    style={styles.navItem}
                    activeOpacity={0.7}
                    onPress={() => {
                        setActiveNavTab('Orders');
                        handleNavigate('Bookings');
                    }}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={21}
                        color="#8A95A0"
                    />
                    <Text style={styles.navLabel}>
                        Orders
                    </Text>
                </TouchableOpacity>

                {/* Floating Center QR Scanner / Aura Voice Button */}
                <View style={styles.navCenterWrapper}>
                    <TouchableOpacity
                        style={styles.floatingCenterBtn}
                        activeOpacity={0.85}
                        onPress={() => startListening()}
                    >
                        <LinearGradient
                            colors={['#00E57B', '#00B860']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.floatingCenterGradient}
                        >
                            <MaterialCommunityIcons
                                name={isListening ? 'microphone' : 'qrcode-scan'}
                                size={23}
                                color="#FFFFFF"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Wallet */}
                <TouchableOpacity
                    style={styles.navItem}
                    activeOpacity={0.7}
                    onPress={() => {
                        setActiveNavTab('Wallet');
                        handleNavigate('Wallet');
                    }}
                >
                    <Ionicons
                        name="wallet-outline"
                        size={21}
                        color="#8A95A0"
                    />
                    <Text style={styles.navLabel}>
                        Wallet
                    </Text>
                </TouchableOpacity>

                {/* Profile */}
                <TouchableOpacity
                    style={styles.navItem}
                    activeOpacity={0.7}
                    onPress={() => {
                        setActiveNavTab('Profile');
                        handleNavigate('Profile');
                    }}
                >
                    <Ionicons
                        name="person-outline"
                        size={21}
                        color="#8A95A0"
                    />
                    <Text style={styles.navLabel}>
                        Profile
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4FAF7',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: Platform.OS === 'android' ? 6 : 2,
    },

    /* ─── 1. Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    logoImage: {
        width: 90,
        height: 30,
        marginBottom: 2,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A1D20',
        marginHorizontal: 4,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 5.5,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: '#E8ECEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    walletAmount: {
        fontSize: 12,
        fontWeight: '800',
        color: '#11181C',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    iconCircleButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E8ECEF',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 6,
        right: 7,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarImage: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    onlineBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: '#00C96B',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },

    /* ─── 2. Service Tabs ─── */
    serviceTabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 10,
        gap: 8,
    },
    serviceTabPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F3EE',
        paddingVertical: 8,
        borderRadius: 22,
        gap: 5,
    },
    serviceTabPillActive: {
        backgroundColor: '#00C96B',
        shadowColor: '#00C96B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    serviceTabLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2A3037',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    serviceTabLabelActive: {
        color: '#FFFFFF',
    },

    /* ─── 3. Stylized Map Canvas ─── */
    mapCanvas: {
        height: 220,
        marginHorizontal: 16,
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#DDF3E8',
        borderWidth: 1,
        borderColor: '#CBEBDC',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    gridRoadH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 18,
        backgroundColor: '#D1EFE0',
    },
    gridRoadV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 18,
        backgroundColor: '#D1EFE0',
    },
    gridBlock: {
        position: 'absolute',
        backgroundColor: '#E5F6EE',
        borderRadius: 6,
    },
    routeContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    routeSegment1: {
        position: 'absolute',
        top: 60,
        left: '26%',
        width: '42%',
        height: 5,
        backgroundColor: '#00C96B',
        borderRadius: 3,
    },
    routeSegment2: {
        position: 'absolute',
        top: 60,
        left: '67%',
        width: 5,
        height: 75,
        backgroundColor: '#00C96B',
        borderRadius: 3,
    },
    routeSegment3: {
        position: 'absolute',
        top: 132,
        left: '52%',
        width: '16%',
        height: 5,
        backgroundColor: '#00C96B',
        borderRadius: 3,
    },
    routeMetaTag: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    routeMetaText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },

    /* Nearby Car & ETA Badge */
    nearbyCarWrapper: {
        position: 'absolute',
        top: 40,
        left: '42%',
        alignItems: 'center',
    },
    etaBadge: {
        backgroundColor: '#111820',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        marginBottom: 3,
    },
    etaBadgeText: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    carMarkerCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
        borderWidth: 1.5,
        borderColor: '#00C96B',
    },
    ambientCar: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Pin Pills */
    pickupPinPill: {
        position: 'absolute',
        top: 46,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    pickupDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00C96B',
    },
    pickupPinTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    pickupPinSub: {
        fontSize: 8.5,
        color: '#6A7680',
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    dropPinPill: {
        position: 'absolute',
        bottom: 50,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    dropPinTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    dropPinSub: {
        fontSize: 8.5,
        color: '#6A7680',
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    crosshairButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 3,
    },

    /* ─── 4. "Where are you going?" Floating Card ─── */
    whereCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#EDF2F0',
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#DDE2E5',
        alignSelf: 'center',
        marginBottom: 10,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16.5,
        fontWeight: '900',
        color: '#111820',
        letterSpacing: -0.3,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    cardSubtitle: {
        fontSize: 11,
        color: '#707A84',
        marginTop: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    useCurrentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: '#EAF8F1',
    },
    useCurrentText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#00C96B',
        fontFamily: 'PlusJakartaSans_700Bold',
    },

    /* Inputs Container */
    inputsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F7FAF8',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E8EFEB',
        marginBottom: 12,
    },
    routeDotsCol: {
        width: 18,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    dotGreen: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00C96B',
    },
    dotsLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: '#D1E5DC',
        marginVertical: 4,
    },
    dotRed: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
    },
    inputsCol: {
        flex: 1,
        paddingLeft: 8,
    },
    inputRow: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inputTextBold: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    inputLabelSub: {
        fontSize: 9.5,
        color: '#7B8792',
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    inputDivider: {
        height: 1,
        backgroundColor: '#E8ECEF',
    },

    /* Saved Places */
    savedPlacesScroll: {
        gap: 8,
        paddingVertical: 2,
        marginBottom: 14,
    },
    savedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        gap: 7,
        borderWidth: 1,
        borderColor: '#E8ECEF',
    },
    savedChipTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    savedChipSub: {
        fontSize: 9,
        color: '#7B8792',
        fontFamily: 'PlusJakartaSans_500Medium',
    },

    /* Find a Ride Button */
    findRideBtn: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#00C96B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 3,
    },
    findRideGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        gap: 8,
    },
    findRideBtnText: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.2,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },

    /* ─── 5. Ride Type Carousel ─── */
    rideTypeSection: {
        marginTop: 14,
        paddingLeft: 16,
    },
    rideTypeSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 16,
        marginBottom: 10,
    },
    sectionHeaderTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111820',
        letterSpacing: -0.2,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    seeAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#00C96B',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    rideTypesScroll: {
        paddingRight: 16,
        gap: 10,
    },
    rideTypeCard: {
        width: 114,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E8ECEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    rideTypeCardSelected: {
        borderColor: '#00C96B',
        backgroundColor: '#F5FCF8',
        shadowColor: '#00C96B',
        shadowOpacity: 0.18,
        shadowRadius: 6,
    },
    vehicleImageWrapper: {
        width: 76,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    vehicleImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    rideName: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    rideSub: {
        fontSize: 9,
        color: '#7B8792',
        marginBottom: 3,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    ridePrice: {
        fontSize: 13,
        fontWeight: '800',
        color: '#111820',
        marginTop: 1,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    etaPill: {
        backgroundColor: '#EDF3F0',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 10,
        marginTop: 5,
    },
    etaPillSelected: {
        backgroundColor: '#E0F8ED',
    },
    etaText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#55606A',
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    etaTextSelected: {
        color: '#00A855',
        fontWeight: '800',
    },

    /* ─── 6. Bottom Navigation Bar ─── */
    bottomNavContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 68,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#EBF0ED',
        paddingHorizontal: 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 8,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        minWidth: 50,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#8A95A0',
        marginTop: 2,
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    navLabelActive: {
        color: '#00C96B',
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    navCenterWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    floatingCenterBtn: {
        top: -16,
        width: 52,
        height: 52,
        borderRadius: 26,
        overflow: 'hidden',
        shadowColor: '#00C96B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    floatingCenterGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
