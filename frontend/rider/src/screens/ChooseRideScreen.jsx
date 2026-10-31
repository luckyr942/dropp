import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Image, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';

import { API_BASE } from '../../../shared/utils/apiConfig';

const Images = {
    logo: require('../../../assets/logo.png'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bike: require('../../assets/vehicles/bike.jpg'),
    auto: require('../../assets/vehicles/auto.jpg'),
    mini: require('../../assets/vehicles/mini.jpg'),
    suv: require('../../assets/vehicles/suv.jpg'),
};

const TIER_META = {
    bike: { name: 'Bike', sub: 'Fast & affordable', image: Images.bike },
    auto: { name: 'Auto', sub: 'Budget friendly', image: Images.auto },
    cab_economy: { name: 'Go Mini', sub: 'Comfortable', image: Images.mini },
    cab_premium: { name: 'Go Plus', sub: 'Spacious', image: Images.suv },
};

// Fallback fares if API fails
const FALLBACK_TIERS = [
    { type: 'bike', name: 'Bike', sub: 'Fast & affordable', fareRange: '₹49–69', eta: '3 min', image: Images.bike },
    { type: 'auto', name: 'Auto', sub: 'Budget friendly', fareRange: '₹89–129', eta: '4 min', image: Images.auto },
    { type: 'cab_economy', name: 'Go Mini', sub: 'Comfortable', fareRange: '₹149–199', eta: '4 min', image: Images.mini },
    { type: 'cab_premium', name: 'Go Plus', sub: 'Spacious', fareRange: '₹249–349', eta: '6 min', image: Images.suv },
];

import { buildMapboxRouteUrl } from '../../../shared/utils/mapboxHelper';

export default function ChooseRideScreen({ onBack, onNavigate }) {
    const {
        pickupLocation, destination,
        routeGeometry, distanceKm: storedDistance, durationMins: storedDuration, allFares, quoteId: storedQuoteId,
        setQuote, selectVehicle, setServiceType,
    } = useRideStore();

    const pickup = pickupLocation || 'Your Location';
    const drop = destination || 'Where to?';

    const pickupLabel = (typeof pickup === 'object' && pickup !== null ? (pickup.label || pickup.address || 'Your Location') : pickup).split(',')[0];
    const dropLabel = (typeof drop === 'object' && drop !== null ? (drop.label || drop.address || 'Where to?') : drop).split(',')[0];

    const initialTiers = (allFares && allFares.length > 0)
        ? allFares.map(f => {
            const meta = TIER_META[f.type] || { name: f.name, sub: 'Quick ride', image: Images.mini };
            return {
                type: f.type,
                name: meta.name,
                sub: meta.sub,
                image: meta.image,
                fare: f.fare,
                fareRange: `₹${f.fare}`,
                eta: `${f.etaMins || 4} min`,
                live: true,
            };
        })
        : FALLBACK_TIERS;

    const [selectedType, setSelectedType] = useState('bike');
    const [tiers, setTiers] = useState(initialTiers);
    const [loading, setLoading] = useState(allFares?.length ? false : true);
    const [distanceKm, setDistanceKm] = useState(storedDistance);
    const [durationMins, setDurationMins] = useState(storedDuration);
    const [error, setError] = useState(null);

    const [mapUrl, setMapUrl] = useState(() => buildMapboxRouteUrl(routeGeometry, pickup, drop));

    const fetchEstimate = useCallback(async () => {
        // If we already have a recent quote with fares and geometry from ConfirmLocationScreen, keep it
        if (storedQuoteId && allFares?.length > 0 && routeGeometry) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/rides/estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pickup, drop }),
            });
            const json = await res.json();
            if (json.success && json.data) {
                const { quoteId, distanceKm: dKm, durationMins: dMin, fares, geometry } = json.data;

                // Save to global store
                setQuote({ quoteId, distanceKm: dKm, durationMins: dMin, fares, geometry });
                setDistanceKm(dKm);
                setDurationMins(dMin);

                if (geometry) {
                    setMapUrl(buildMapboxRouteUrl(geometry, pickup, drop));
                }

                // Map fares to display tiers
                const liveTiers = fares.map(f => {
                    const meta = TIER_META[f.type] || { name: f.name, sub: 'Quick ride', image: Images.mini };
                    return {
                        type: f.type,
                        name: meta.name,
                        sub: meta.sub,
                        image: meta.image,
                        fare: f.fare,
                        fareRange: `₹${f.fare}`,
                        eta: `${f.etaMins || 4} min`,
                        live: true,
                    };
                });
                setTiers(liveTiers);
            } else {
                setError(json.error || 'Could not get estimates');
            }
        } catch (err) {
            console.warn('[ChooseRide] estimate error:', err.message);
            setError('Using estimated fares');
        } finally {
            setLoading(false);
        }
    }, [pickup, drop, storedQuoteId, allFares, routeGeometry, setQuote]);

    useEffect(() => { fetchEstimate(); }, [fetchEstimate]);

    const handleContinue = () => {
        const tier = tiers.find(t => t.type === selectedType);
        selectVehicle(selectedType, tier?.fare || 0);
        setServiceType('ride');
        if (onNavigate) onNavigate('ReviewBooking');
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* ── REAL MAPBOX MAP WITH LIVE ROAD PATH ── */}
            <View style={s.mapFull}>
                {mapUrl ? (
                    <Image
                        source={{ uri: mapUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient colors={['#D8F0E5', '#E8F8EF']} style={StyleSheet.absoluteFillObject} />
                )}

                {/* Floating Destination Card (matching screenshot) */}
                <View style={s.destCard}>
                    <Text style={s.destCardSub}>Destination</Text>
                    <View style={s.cardRow}>
                        <Text style={s.destCardTitle} numberOfLines={1}>{dropLabel}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#FFF" />
                    </View>
                </View>

                {/* Floating Pickup Point Card (matching screenshot) */}
                <View style={s.pickupCard}>
                    <Text style={s.pickupCardSub}>Pick up point · {durationMins ? `${durationMins} min` : '2 min'}</Text>
                    <View style={s.cardRow}>
                        <Text style={s.pickupCardTitle} numberOfLines={1}>{pickupLabel}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#1A1D20" />
                    </View>
                </View>

                {/* Real road distance tag */}
                {distanceKm && (
                    <View style={s.distTag}>
                        <Ionicons name="navigate" size={11} color="#00C96B" />
                        <Text style={s.distTagText}>{distanceKm} km · {durationMins} min</Text>
                    </View>
                )}
            </View>

            {/* ── HEADER OVERLAY ── */}
            <SafeAreaView edges={['top']} style={s.topOverlay}>
                <View style={s.topBar}>
                    <View style={s.topLeft}>
                        <Image source={Images.logo} style={s.logo} resizeMode="contain" />
                        <TouchableOpacity style={s.locationRow}>
                            <Ionicons name="location-sharp" size={12} color="#00C96B" />
                            <Text style={s.locationText} numberOfLines={1}>{pickupLabel || 'Your Location'}</Text>
                            <Ionicons name="chevron-down" size={11} color="#5A6570" />
                        </TouchableOpacity>
                    </View>
                    <View style={s.topRight}>
                        <TouchableOpacity style={s.walletPill}>
                            <Ionicons name="wallet-outline" size={13} color="#1A1D20" />
                            <Text style={s.walletAmt}>₹450</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.iconCircle}>
                            <Ionicons name="notifications-outline" size={15} color="#1A1D20" />
                        </TouchableOpacity>
                        <Image source={{ uri: Images.avatar }} style={s.avatar} />
                    </View>
                </View>

                {/* Back button on map */}
                <TouchableOpacity style={s.mapBackBtn} onPress={onBack} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color="#1A1D20" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* ── BOTTOM SHEET ── */}
            <View style={s.sheet}>
                <View style={s.dragHandle} />

                <View style={s.sheetHeader}>
                    <View>
                        <Text style={s.sheetTitle}>Choose a ride type</Text>
                        {loading && <ActivityIndicator size="small" color="#00C96B" style={{ position: 'absolute', right: -30, top: 3 }} />}
                    </View>
                    <TouchableOpacity style={s.seeAllRow}>
                        <Text style={s.seeAll}>See all</Text>
                        <Ionicons name="chevron-forward" size={14} color="#00C96B" />
                    </TouchableOpacity>
                </View>

                {error ? (
                    <Text style={s.errorNote}>{error}</Text>
                ) : null}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.ridesRow}>
                    {tiers.map(ride => {
                        const sel = selectedType === ride.type;
                        return (
                            <TouchableOpacity
                                key={ride.type}
                                style={[s.rideCard, sel && s.rideCardSel]}
                                activeOpacity={0.85}
                                onPress={() => setSelectedType(ride.type)}
                            >
                                <View style={s.rideImgWrap}>
                                    <Image source={ride.image} style={s.rideImg} resizeMode="contain" />
                                </View>
                                <Text style={s.rideName}>{ride.name}</Text>
                                <Text style={s.rideSub}>{ride.sub}</Text>
                                <Text style={s.rideFare}>
                                    {loading && !ride.live ? '...' : ride.fareRange}
                                </Text>
                                <View style={[s.etaPill, sel && s.etaPillSel]}>
                                    <Text style={[s.etaText, sel && s.etaTextSel]}>{ride.eta}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity style={s.continueBtn} activeOpacity={0.88} onPress={handleContinue} disabled={loading}>
                    <LinearGradient
                        colors={loading ? ['#9EE4C2', '#7DC9A0'] : ['#00D872', '#00B055']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.continueBtnGrad}
                    >
                        <Text style={s.continueBtnText}>
                            {loading ? 'Getting prices...' : 'Continue'}
                        </Text>
                        <Feather name="arrow-right" size={18} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#D8F0E5' },
    mapFull: { ...StyleSheet.absoluteFillObject },

    destCard: {
        position: 'absolute',
        top: '25%',
        left: '16%',
        right: '16%',
        backgroundColor: '#1E232B',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    destCardSub: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 2,
    },
    destCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
    },
    pickupCard: {
        position: 'absolute',
        top: '46%',
        left: '20%',
        right: '12%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    pickupCardSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 2,
    },
    pickupCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1A1D20',
        flex: 1,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    distTag: {
        position: 'absolute',
        top: '37%',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    distTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#111820',
    },

    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    topLeft: { flex: 1 },
    logo: { width: 86, height: 28, marginBottom: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
    locationText: { fontSize: 11.5, fontWeight: '700', color: '#1A1D20', marginHorizontal: 2 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    walletPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E8ECEF' },
    walletAmt: { fontSize: 12, fontWeight: '800', color: '#111820' },
    iconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8ECEF' },
    avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#FFF' },

    mapBackBtn: { marginLeft: 14, marginTop: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },

    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 36 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 18 },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8DDE2', alignSelf: 'center', marginTop: 12, marginBottom: 14 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sheetTitle: { fontSize: 17, fontWeight: '900', color: '#111820', letterSpacing: -0.2 },
    seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAll: { fontSize: 12, fontWeight: '700', color: '#00C96B' },
    errorNote: { fontSize: 11, color: '#FF8C00', fontWeight: '600', marginBottom: 8 },

    ridesRow: { paddingRight: 6, gap: 10 },
    rideCard: { width: 112, backgroundColor: '#FFF', borderRadius: 18, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8ECEF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    rideCardSel: { borderColor: '#00C96B', backgroundColor: '#F5FCF8', shadowColor: '#00C96B', shadowOpacity: 0.16, shadowRadius: 6 },
    rideImgWrap: { width: 80, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
    rideImg: { width: '100%', height: '100%', borderRadius: 8 },
    rideName: { fontSize: 12.5, fontWeight: '800', color: '#111820' },
    rideSub: { fontSize: 9.5, color: '#7B8792', marginBottom: 3, textAlign: 'center' },
    rideFare: { fontSize: 13, fontWeight: '800', color: '#111820', marginTop: 2 },
    etaPill: { backgroundColor: '#EDF3F0', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
    etaPillSel: { backgroundColor: '#E0F8ED' },
    etaText: { fontSize: 10, fontWeight: '700', color: '#55606A' },
    etaTextSel: { color: '#00A855', fontWeight: '800' },

    continueBtn: { marginTop: 16, borderRadius: 18, overflow: 'hidden', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    continueBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 8 },
    continueBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
