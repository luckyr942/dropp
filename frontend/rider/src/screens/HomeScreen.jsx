import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Image, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import { useAuraContext } from '../../../shared/voice/AuraContext';
import AuraOverlay from '../../../shared/voice/AuraOverlay';
import BottomNavBar from '../../../shared/components/bottomNavBar';

const { width } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const Images = {
    logo: require('../../../assets/logo.png'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bike: require('../../assets/vehicles/bike.jpg'),
    auto: require('../../assets/vehicles/auto.jpg'),
    mini: require('../../assets/vehicles/mini.jpg'),
    suv: require('../../assets/vehicles/suv.jpg'),
};

const SERVICE_TABS = [
    { id: 'Ride', label: 'Ride', icon: 'car-sport', iconType: 'Ionicons' },
    { id: 'Food', label: 'Food', icon: 'silverware-fork-knife', iconType: 'MaterialCommunityIcons' },
    { id: 'Delivery', label: 'Delivery', icon: 'cube-outline', iconType: 'Ionicons' },
    { id: 'Shop', label: 'Shop', icon: 'bag-handle-outline', iconType: 'Ionicons' },
];

const SAVED_PLACES = [
    { id: 'rajiv', label: 'Rajiv Chowk', sub: 'Connaught Place', icon: 'business-outline', lat: 28.6328, lng: 77.2197 },
    { id: 'dwarka', label: 'Dwarka Sec 21', sub: 'Metro Station', icon: 'subway-outline', lat: 28.5523, lng: 77.0583 },
    { id: 'cybercity', label: 'Cyber City', sub: 'DLF Phase 2', icon: 'briefcase-outline', lat: 28.4950, lng: 77.0890 },
    { id: 'airport', label: 'IGI Airport T3', sub: 'Terminal 3', icon: 'airplane-outline', lat: 28.5562, lng: 77.1000 },
];

const TIER_META = {
    bike: { name: 'Bike', sub: 'Fast & affordable', image: Images.bike, fallbackFare: '49–69', eta: '3 min' },
    auto: { name: 'Auto', sub: 'Budget friendly', image: Images.auto, fallbackFare: '89–129', eta: '4 min' },
    cab_economy: { name: 'Go Mini', sub: 'Comfortable', image: Images.mini, fallbackFare: '149–199', eta: '4 min' },
    cab_premium: { name: 'Go Plus', sub: 'Spacious', image: Images.suv, fallbackFare: '249–349', eta: '6 min' },
};

export default function HomeScreen({ navigation, onNavigate }) {
    const { pickupLocation, destination, setPickupLocation, setDestination, setServiceType, selectVehicle } = useRideStore();
    const { openAura, isOpen } = useAuraContext();

    const [selectedService, setSelectedService] = useState('Ride');
    const [selectedRideType, setSelectedRideType] = useState('bike');
    const [activeNavTab, setActiveNavTab] = useState('Home');

    const pickupStr = (typeof pickupLocation === 'object' && pickupLocation !== null)
        ? (pickupLocation.label || pickupLocation.address || 'Your Location')
        : (pickupLocation || 'Your Location');

    const dropoffStr = (typeof destination === 'object' && destination !== null)
        ? (destination.label || destination.address || '')
        : (destination || '');

    const [pickup, setPickup] = useState(pickupStr);
    const [dropoff, setDropoff] = useState(dropoffStr);

    useEffect(() => {
        if (pickupLocation) {
            setPickup(typeof pickupLocation === 'object' ? (pickupLocation.label || pickupLocation.address) : pickupLocation);
        }
        if (destination) {
            setDropoff(typeof destination === 'object' ? (destination.label || destination.address) : destination);
        }
    }, [pickupLocation, destination]);

    const [quoteData, setQuoteData] = useState(null);
    const [loadingEstimate, setLoadingEstimate] = useState(false);
    const [estimateError, setEstimateError] = useState(null);

    const handleNavigate = (route, params = {}) => {
        if (navigation) navigation.navigate(route, params);
        else if (typeof onNavigate === 'function') onNavigate(route, params);
    };

    const fetchEstimate = useCallback(async (pu, dp) => {
        if (!pu || !dp) return;
        setLoadingEstimate(true);
        setEstimateError(null);
        try {
            const res = await fetch(`${API_BASE}/api/rides/estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup: pu, drop: dp }),
            });
            const data = await res.json();
            if (data.success && data.data) setQuoteData(data.data);
            else setEstimateError(data.error || 'Unable to fetch estimate');
        } catch (err) {
            console.warn('[HomeScreen] estimate error:', err.message);
            setEstimateError(err.message);
        } finally {
            setLoadingEstimate(false);
        }
    }, []);

    useEffect(() => { fetchEstimate(pickup, dropoff); }, [pickup, dropoff, fetchEstimate]);

    const handleServicePress = (id) => {
        setSelectedService(id);
        if (id === 'Food') handleNavigate('Food');
        if (id === 'Delivery') handleNavigate('PackageDetails');
        if (id === 'Shop') handleNavigate('Food');
    };

    const handleFindRide = () => {
        const tier = availableTiers.find(t => t.type === selectedRideType);
        setPickupLocation(pickup);
        setDestination(dropoff);
        setServiceType(selectedRideType);
        if (tier) selectVehicle(selectedRideType, tier.fare);
        handleNavigate('FindingDriver', {
            quoteId: quoteData?.quoteId,
            rideType: selectedRideType,
            fare: tier?.fare,
        });
    };

    // Build tiers from live quote or fallback
    const availableTiers = (quoteData?.fares?.length > 0)
        ? quoteData.fares.map(f => {
            const m = TIER_META[f.type] || { name: f.name || 'Cab', sub: 'Quick ride', image: Images.mini, eta: '4 min' };
            return { type: f.type, name: m.name, sub: m.sub, image: m.image, fare: f.fare, eta: `${f.etaMins || 4} min`, live: true };
        })
        : Object.entries(TIER_META).map(([type, m]) => ({
            type, name: m.name, sub: m.sub, image: m.image,
            fare: m.fallbackFare, eta: m.eta, live: false,
        }));

    return (
        <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4FAF7" />
            <LinearGradient colors={['#EAF8F1', '#F5FCF8', '#FFFFFF']} locations={[0, 0.25, 0.6]} style={StyleSheet.absoluteFillObject} />

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── 1. HEADER ── */}
                <View style={s.header}>
                    <View style={s.headerLeft}>
                        <Image source={Images.logo} style={s.logo} resizeMode="contain" />
                        <TouchableOpacity style={s.locationRow} activeOpacity={0.7} onPress={() => handleNavigate('Location')}>
                            <Ionicons name="location-sharp" size={13} color="#00C96B" />
                            <Text style={s.locationText} numberOfLines={1}>{pickup || 'Your Location'}</Text>
                            <Ionicons name="chevron-down" size={12} color="#5A6570" />
                        </TouchableOpacity>
                    </View>
                    <View style={s.headerRight}>
                        <TouchableOpacity style={s.walletPill} onPress={() => handleNavigate('Wallet')}>
                            <Ionicons name="wallet-outline" size={14} color="#1A1D20" />
                            <Text style={s.walletAmt}>₹450</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.iconCircle}>
                            <Ionicons name="notifications-outline" size={16} color="#1A1D20" />
                            <View style={s.notifBadge} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.avatarWrap} onPress={() => handleNavigate('Profile')}>
                            <Image source={{ uri: Images.avatar }} style={s.avatar} />
                            <View style={s.onlineDot} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── 2. SERVICE TABS ── */}
                <View style={s.tabsRow}>
                    {SERVICE_TABS.map(tab => {
                        const active = selectedService === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                style={[s.tabPill, active && s.tabPillActive]}
                                activeOpacity={0.8}
                                onPress={() => handleServicePress(tab.id)}
                            >
                                {tab.iconType === 'Ionicons'
                                    ? <Ionicons name={tab.icon} size={14} color={active ? '#FFF' : '#1A1D20'} />
                                    : <MaterialCommunityIcons name={tab.icon} size={14} color={active ? '#FFF' : '#1A1D20'} />
                                }
                                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── 3. MAP CANVAS ── */}
                <View style={s.mapCanvas}>
                    {/* Roads */}
                    <View style={[s.roadH, { top: '30%' }]} />
                    <View style={[s.roadH, { top: '70%' }]} />
                    <View style={[s.roadV, { left: '25%' }]} />
                    <View style={[s.roadV, { left: '68%' }]} />
                    {/* Blocks */}
                    {[
                        { top: '8%', left: '8%', width: '14%', height: '18%' },
                        { top: '8%', left: '30%', width: '34%', height: '18%' },
                        { top: '8%', right: '6%', width: '22%', height: '18%' },
                        { top: '36%', left: '30%', width: '34%', height: '28%' },
                        { top: '76%', left: '8%', width: '14%', height: '18%' },
                        { top: '76%', right: '6%', width: '22%', height: '18%' },
                    ].map((b, i) => <View key={i} style={[s.block, b]} />)}

                    {/* Green route */}
                    <View style={s.route1} />
                    <View style={s.route2} />

                    {/* Ambient cars */}
                    {[
                        { top: '12%', left: '6%' }, { top: '12%', left: '50%' },
                        { top: '12%', right: '4%' }, { top: '50%', right: '4%' },
                        { top: '80%', left: '30%' }, { top: '80%', right: '4%' },
                    ].map((pos, i) => (
                        <View key={i} style={[s.ambientCar, pos]}>
                            <MaterialCommunityIcons name="car-side" size={13} color="#788896" />
                        </View>
                    ))}

                    {/* Pickup pin pill */}
                    <View style={s.pickupPill}>
                        <View style={s.pickupDot} />
                        <View>
                            <Text style={s.pinTitle}>{typeof pickup === 'string' ? pickup.split(',')[0] : (pickup?.label || 'Your Location')}</Text>
                            <Text style={s.pinSub}>Pickup location</Text>
                        </View>
                    </View>

                    {/* Drop pin pill */}
                    <View style={s.dropPill}>
                        <Ionicons name="location-sharp" size={18} color="#FF3B30" />
                        <View>
                            <Text style={s.pinTitle}>{typeof dropoff === 'string' ? dropoff.split(',')[0] : (dropoff?.label || 'Where to?')}</Text>
                            <Text style={s.pinSub}>Destination</Text>
                        </View>
                    </View>

                    {/* 3 min away badge */}
                    <View style={s.etaMarker}>
                        <View style={s.etaBadge}><Text style={s.etaBadgeText}>3 min{'\n'}away</Text></View>
                    </View>

                    {/* Distance tag */}
                    {Boolean(quoteData?.distanceKm) ? (
                        <View style={s.distTag}>
                            <Ionicons name="navigate-outline" size={10} color="#00C96B" />
                            <Text style={s.distTagText}>{quoteData.distanceKm} km · {quoteData.durationMins} min</Text>
                        </View>
                    ) : null}

                    {/* Recenter */}
                    <TouchableOpacity style={s.recenter} onPress={() => fetchEstimate(pickup, dropoff)}>
                        {loadingEstimate
                            ? <ActivityIndicator size="small" color="#00C96B" />
                            : <Ionicons name="locate" size={18} color="#1A1D20" />
                        }
                    </TouchableOpacity>
                </View>

                {/* ── 4. WHERE ARE YOU GOING CARD ── */}
                <View style={s.card}>
                    <View style={s.dragHandle} />

                    <View style={s.cardHeader}>
                        <View>
                            <Text style={s.cardTitle}>Where are you going?</Text>
                            <Text style={s.cardSub}>Book a ride in seconds</Text>
                        </View>
                        <TouchableOpacity style={s.useCurrentBtn} onPress={() => setPickup('Current Location')}>
                            <Ionicons name="locate" size={12} color="#00C96B" />
                            <Text style={s.useCurrentText}>Use current</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input rows */}
                    <View style={s.inputsBox}>
                        <View style={s.dotsCol}>
                            <View style={s.dotGreen} />
                            <View style={s.dotLine} />
                            <View style={s.dotRed} />
                        </View>
                        <View style={s.inputsRight}>
                            <TouchableOpacity style={s.inputRow} onPress={() => handleNavigate('Location')}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.inputBold} numberOfLines={1}>
                                        {typeof pickup === 'object' ? (pickup?.label || pickup?.address || 'Your Location') : (pickup || 'Your Location')}
                                    </Text>
                                    <Text style={s.inputSub}>Pickup location</Text>
                                </View>
                                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setPickup('')}>
                                    <Ionicons name="close" size={16} color="#8A95A0" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                            <View style={s.inputDivider} />
                            <TouchableOpacity style={s.inputRow} onPress={() => handleNavigate('Location')}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.inputBold, !dropoff && { color: '#9AA5AF', fontWeight: '500' }]} numberOfLines={1}>
                                        {typeof dropoff === 'object' ? (dropoff?.label || dropoff?.address || 'Where to?') : (dropoff || 'Where to?')}
                                    </Text>
                                    <Text style={s.inputSub}>Drop location</Text>
                                </View>
                                <Ionicons name="add" size={18} color="#8A95A0" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Saved places */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.savedRow}>
                        {SAVED_PLACES.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={s.savedChip}
                                onPress={() => {
                                    const destObj = { label: p.label, address: p.sub, lat: p.lat, lng: p.lng };
                                    setDestination(destObj);
                                    setDropoff(p.label);
                                    handleNavigate('ConfirmLocation');
                                }}
                            >
                                <Ionicons name={p.icon} size={14} color="#1A1D20" />
                                <View>
                                    <Text style={s.savedChipTitle}>{p.label}</Text>
                                    <Text style={s.savedChipSub}>{p.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Find a Ride */}
                    <TouchableOpacity style={s.findBtn} activeOpacity={0.88} onPress={handleFindRide}>
                        <LinearGradient colors={['#00C96B', '#00B055']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.findBtnGrad}>
                            <Text style={s.findBtnText}>{loadingEstimate ? 'Calculating...' : 'Find a Ride'}</Text>
                            <Feather name="arrow-right" size={17} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* ── 5. CHOOSE A RIDE TYPE ── */}
                <View style={s.ridesSection}>
                    <View style={s.ridesSectionHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.sectionTitle}>Choose a ride type</Text>
                            {loadingEstimate && <ActivityIndicator size="small" color="#00C96B" />}
                        </View>
                        <TouchableOpacity style={s.seeAllRow}>
                            <Text style={s.seeAll}>See all</Text>
                            <Ionicons name="chevron-forward" size={14} color="#00C96B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.ridesScroll}>
                        {availableTiers.map(ride => {
                            const sel = selectedRideType === ride.type;
                            return (
                                <TouchableOpacity
                                    key={ride.type}
                                    style={[s.rideCard, sel && s.rideCardSel]}
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedRideType(ride.type)}
                                >
                                    <View style={s.rideImgWrap}>
                                        <Image source={ride.image} style={s.rideImg} resizeMode="contain" />
                                    </View>
                                    <Text style={s.rideName}>{ride.name}</Text>
                                    <Text style={s.rideSub}>{ride.sub}</Text>
                                    <Text style={s.rideFare}>
                                        {ride.live ? `₹${ride.fare}` : `₹${ride.fare}`}
                                    </Text>
                                    <View style={[s.rideEtaPill, sel && s.rideEtaPillSel]}>
                                        <Text style={[s.rideEta, sel && s.rideEtaSel]}>{ride.eta}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── 6. FLOATING BOTTOM NAV BAR (Universal) ── */}
            <BottomNavBar
                preset="main"
                activeTab={activeNavTab}
                onTabPress={(tabId) => {
                    setActiveNavTab(tabId);
                    if (tabId === 'Home') handleNavigate('Home');
                    else if (tabId === 'Activity' || tabId === 'Orders') handleNavigate('Bookings');
                    else if (tabId === 'Wallet') handleNavigate('Wallet');
                    else if (tabId === 'Profile') handleNavigate('Profile');
                }}
                centerAction={{
                    icon: 'microphone-outline',
                    family: 'MaterialCommunityIcons',
                    size: 28,
                    colors: ['#00E57B', '#00AD57'],
                    onPress: openAura,
                }}
            />

            {/* ── Aura Voice Overlay ── */}
            <AuraOverlay />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F4FAF7' },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: Platform.OS === 'android' ? 6 : 2 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6 },
    headerLeft: { flex: 1 },
    logo: { width: 90, height: 30, marginBottom: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
    locationText: { fontSize: 12, fontWeight: '700', color: '#1A1D20', marginHorizontal: 4 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    walletPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5.5, borderRadius: 20, gap: 4, borderWidth: 1, borderColor: '#E8ECEF' },
    walletAmt: { fontSize: 12, fontWeight: '800', color: '#11181C' },
    iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8ECEF', position: 'relative' },
    notifBadge: { position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', borderWidth: 1, borderColor: '#FFF' },
    avatarWrap: { position: 'relative' },
    avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#FFF' },
    onlineDot: { position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#00C96B', borderWidth: 1.5, borderColor: '#FFF' },

    // Service tabs
    tabsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 10, gap: 8 },
    tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F3EE', paddingVertical: 8, borderRadius: 22, gap: 5 },
    tabPillActive: { backgroundColor: '#00C96B', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    tabLabel: { fontSize: 12, fontWeight: '700', color: '#2A3037' },
    tabLabelActive: { color: '#FFF' },

    // Map
    mapCanvas: { height: 220, marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', position: 'relative', backgroundColor: '#DDF3E8', borderWidth: 1, borderColor: '#CBEBDC' },
    roadH: { position: 'absolute', left: 0, right: 0, height: 18, backgroundColor: '#D1EFE0' },
    roadV: { position: 'absolute', top: 0, bottom: 0, width: 18, backgroundColor: '#D1EFE0' },
    block: { position: 'absolute', backgroundColor: '#E5F6EE', borderRadius: 6 },
    route1: { position: 'absolute', top: 58, left: '26%', width: '42%', height: 5, backgroundColor: '#00C96B', borderRadius: 3 },
    route2: { position: 'absolute', top: 58, left: '67%', width: 5, height: 80, backgroundColor: '#00C96B', borderRadius: 3 },
    ambientCar: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
    pickupPill: { position: 'absolute', top: 44, left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    pickupDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#00C96B' },
    dropPill: { position: 'absolute', bottom: 44, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, gap: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    pinTitle: { fontSize: 10.5, fontWeight: '800', color: '#111820' },
    pinSub: { fontSize: 8.5, color: '#6A7680' },
    etaMarker: { position: 'absolute', top: '38%', left: '46%', alignItems: 'center' },
    etaBadge: { backgroundColor: '#111820', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
    etaBadgeText: { fontSize: 9.5, fontWeight: '800', color: '#FFF', textAlign: 'center' },
    distTag: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    distTagText: { fontSize: 9.5, fontWeight: '800', color: '#111820' },
    recenter: { position: 'absolute', bottom: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },

    // Card
    card: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#EDF2F0' },
    dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDE2E5', alignSelf: 'center', marginBottom: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    cardTitle: { fontSize: 16.5, fontWeight: '900', color: '#111820', letterSpacing: -0.3 },
    cardSub: { fontSize: 11, color: '#707A84', marginTop: 1 },
    useCurrentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, backgroundColor: '#EAF8F1' },
    useCurrentText: { fontSize: 10.5, fontWeight: '700', color: '#00C96B' },
    inputsBox: { flexDirection: 'row', backgroundColor: '#F7FAF8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E8EFEB', marginBottom: 12 },
    dotsCol: { width: 18, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C96B' },
    dotLine: { width: 1.5, flex: 1, backgroundColor: '#D1E5DC', marginVertical: 4 },
    dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
    inputsRight: { flex: 1, paddingLeft: 8 },
    inputRow: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    inputBold: { fontSize: 12.5, fontWeight: '700', color: '#111820' },
    inputSub: { fontSize: 9.5, color: '#7B8792' },
    inputDivider: { height: 1, backgroundColor: '#E8ECEF' },
    savedRow: { gap: 8, paddingVertical: 2, marginBottom: 14 },
    savedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, gap: 7, borderWidth: 1, borderColor: '#E8ECEF' },
    savedChipTitle: { fontSize: 11, fontWeight: '700', color: '#111820' },
    savedChipSub: { fontSize: 9, color: '#7B8792' },
    findBtn: { borderRadius: 18, overflow: 'hidden', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 3 },
    findBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
    findBtnText: { fontSize: 14.5, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },

    // Rides
    ridesSection: { marginTop: 14, paddingLeft: 16 },
    ridesSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111820', letterSpacing: -0.2 },
    seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#00C96B' },
    ridesScroll: { paddingRight: 16, gap: 10 },
    rideCard: { width: 114, backgroundColor: '#FFF', borderRadius: 18, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8ECEF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    rideCardSel: { borderColor: '#00C96B', backgroundColor: '#F5FCF8', shadowColor: '#00C96B', shadowOpacity: 0.18, shadowRadius: 6 },
    rideImgWrap: { width: 76, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    rideImg: { width: '100%', height: '100%', borderRadius: 8 },
    rideName: { fontSize: 12.5, fontWeight: '800', color: '#111820' },
    rideSub: { fontSize: 9, color: '#7B8792', marginBottom: 3 },
    rideFare: { fontSize: 13, fontWeight: '800', color: '#111820', marginTop: 1 },
    rideEtaPill: { backgroundColor: '#EDF3F0', paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 10, marginTop: 5 },
    rideEtaPillSel: { backgroundColor: '#E0F8ED' },
    rideEta: { fontSize: 10, fontWeight: '700', color: '#55606A' },
    rideEtaSel: { color: '#00A855', fontWeight: '800' },

    // Bottom nav
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 68, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#EBF0ED', paddingHorizontal: 8, paddingBottom: Platform.OS === 'ios' ? 10 : 0, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 8 },
    navItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, minWidth: 50 },
    navLabel: { fontSize: 10, fontWeight: '600', color: '#8A95A0', marginTop: 2 },
    navLabelActive: { color: '#00C96B', fontWeight: '800' },
    navCenter: { alignItems: 'center', justifyContent: 'center', width: 60 },
    auraBtn: { top: -16, width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: '#FFF', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
    auraBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
