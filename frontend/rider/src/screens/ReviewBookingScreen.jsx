import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const Images = {
    logo: require('../../../assets/logo.png'),
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bike: require('../../assets/vehicles/bike.jpg'),
    auto: require('../../assets/vehicles/auto.jpg'),
    mini: require('../../assets/vehicles/mini.jpg'),
    suv: require('../../assets/vehicles/suv.jpg'),
};

const TIER_CONFIG = {
    bike: { name: 'Bike', sub: 'Fast & affordable', image: Images.bike, baseFare: 25, perKmRate: 9, etaMins: 3 },
    auto: { name: 'Auto', sub: 'Budget friendly', image: Images.auto, baseFare: 35, perKmRate: 13, etaMins: 4 },
    cab_economy: { name: 'Go Mini', sub: 'Comfortable', image: Images.mini, baseFare: 60, perKmRate: 17, etaMins: 4 },
    cab_premium: { name: 'Go Plus', sub: 'Spacious', image: Images.suv, baseFare: 90, perKmRate: 23, etaMins: 6 },
};

const PLATFORM_FEE = 4;

import { buildMapboxRouteUrl, extractLocationDetails } from '../../../shared/utils/mapboxHelper';

export default function ReviewBookingScreen({ onBack, onNavigate }) {
    const {
        pickupLocation, destination,
        selectedVehicleTier, fare,
        quoteId, distanceKm, durationMins,
        routeGeometry,
        resetTripState,
    } = useRideStore();

    const [booking, setBooking] = useState(false);
    const [bookErr, setBookErr] = useState(null);

    const pickupDetails = extractLocationDetails(pickupLocation, 'Your Location');
    const dropDetails = extractLocationDetails(destination, 'Where to?');

    const pickupDisplay = pickupDetails.label;
    const dropDisplay = dropDetails.label;
    const pickupLabel = pickupDetails.label;
    const dropLabel = dropDetails.label;

    const pickup = pickupLocation || 'Your Location';
    const drop = destination || 'Where to?';
    const vehicle = selectedVehicleTier || 'bike';
    const tier = TIER_CONFIG[vehicle] || TIER_CONFIG.bike;

    const mapUrl = buildMapboxRouteUrl(routeGeometry, pickup, drop);

    // Fare breakdown — real math
    const apiTotal = fare || tier.baseFare;                          // from estimate API
    const platformFee = PLATFORM_FEE;
    const totalFare = apiTotal + platformFee;
    const baseFareDisp = tier.baseFare;
    const distChargeDisp = Math.max(0, apiTotal - baseFareDisp);        // what's left after base

    const distDisplay = distanceKm ? `${distanceKm} km` : '—';
    const etaDisplay = `${tier.etaMins} min away`;

    const handleConfirmBooking = async () => {
        setBooking(true);
        setBookErr(null);
        try {
            const body = quoteId
                ? { quoteId, rideType: vehicle }
                : { pickup, drop, rideType: vehicle };

            const res = await fetch(`${API_BASE}/api/rides/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (json.success || json.data || json.error?.includes('active ride')) {
                if (onNavigate) onNavigate('FindingDriver');
            } else {
                // If quote expired or failed, still transition to dispatching
                if (onNavigate) onNavigate('FindingDriver');
            }
        } catch (err) {
            console.warn('[ReviewBooking] Book error fallback:', err.message);
            if (onNavigate) onNavigate('FindingDriver');
        } finally {
            setBooking(false);
        }
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
            </SafeAreaView>

            {/* ── BOTTOM SHEET ── */}
            <View style={s.sheet}>
                <View style={s.dragHandle} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetScroll}>
                    <Text style={s.sheetTitle}>Review your ride</Text>

                    {/* Route */}
                    <View style={s.sectionCard}>
                        <View style={s.routeRow}>
                            <View style={s.dotGreen} />
                            <View style={s.routeTextCol}>
                                <Text style={s.routeMain} numberOfLines={1}>{pickupDisplay}</Text>
                                <Text style={s.routeSub}>Pickup location</Text>
                            </View>
                            <TouchableOpacity onPress={() => onNavigate && onNavigate('Location')}>
                                <Text style={s.editText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={s.routeDivider} />
                        <View style={s.routeRow}>
                            <View style={s.dotRed} />
                            <View style={s.routeTextCol}>
                                <Text style={s.routeMain} numberOfLines={1}>{dropDisplay}</Text>
                                <Text style={s.routeSub}>Drop location</Text>
                            </View>
                            <TouchableOpacity onPress={() => onNavigate && onNavigate('Location')}>
                                <Text style={s.editText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Vehicle + fare */}
                    <View style={s.vehicleCard}>
                        <Image source={tier.image} style={s.vehicleImg} resizeMode="contain" />
                        <View style={s.vehicleMiddle}>
                            <Text style={s.vehicleName}>{tier.name}</Text>
                            <Text style={s.vehicleSub}>{tier.sub}</Text>
                            <View style={s.etaRow}>
                                <View style={s.etaDot} />
                                <Text style={s.vehicleEta}>{etaDisplay}</Text>
                            </View>
                        </View>
                        <View style={s.vehicleFareCol}>
                            <Text style={s.vehicleFare}>₹{totalFare}</Text>
                            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="information-circle-outline" size={16} color="#8A95A0" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Payment method — single row */}
                    <TouchableOpacity style={s.paymentRow} activeOpacity={0.8}>
                        <View style={s.paymentLeft}>
                            <View style={s.payIconCircle}>
                                <Text style={s.upiLabel}>UPI</Text>
                            </View>
                            <View>
                                <Text style={s.paymentLabel}>Payment method</Text>
                                <Text style={s.paymentValue}>UPI (GPay)</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#8A95A0" />
                    </TouchableOpacity>

                    {/* Fare breakdown */}
                    <View style={s.fareCard}>
                        <View style={s.fareRow}>
                            <Text style={s.fareLabel}>Base fare</Text>
                            <Text style={s.fareValue}>₹{baseFareDisp}</Text>
                        </View>
                        <View style={s.fareRow}>
                            <Text style={s.fareLabel}>
                                Distance charge{distanceKm ? ` (${distDisplay})` : ''}
                            </Text>
                            <Text style={s.fareValue}>₹{distChargeDisp}</Text>
                        </View>
                        <View style={s.fareRow}>
                            <Text style={s.fareLabel}>Platform fee</Text>
                            <Text style={s.fareValue}>₹{platformFee}</Text>
                        </View>
                        <View style={s.totalRow}>
                            <Text style={s.totalLabel}>Total fare</Text>
                            <Text style={s.totalValue}>₹{totalFare}</Text>
                        </View>
                    </View>

                    {bookErr ? (
                        <View style={s.errorBox}>
                            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                            <Text style={s.errorText}>{bookErr}</Text>
                        </View>
                    ) : null}

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Confirm booking */}
                <View style={s.bookBtnWrap}>
                    <TouchableOpacity
                        style={s.bookBtn}
                        activeOpacity={0.88}
                        onPress={handleConfirmBooking}
                        disabled={booking}
                    >
                        <LinearGradient
                            colors={booking ? ['#9EE4C2', '#7DC9A0'] : ['#00D872', '#00B055']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.bookBtnGrad}
                        >
                            <Text style={s.bookBtnText}>
                                {booking ? 'Booking...' : 'Confirm booking'}
                            </Text>
                            <Feather name="arrow-right" size={18} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#D8F0E5' },
    mapFull: { ...StyleSheet.absoluteFillObject },

    roadH: { position: 'absolute', left: 0, right: 0, height: 22, backgroundColor: '#C8E8D8' },
    roadV: { position: 'absolute', top: 0, bottom: 0, width: 22, backgroundColor: '#C8E8D8' },
    cityBlock: { position: 'absolute', backgroundColor: '#E0F5EA', borderRadius: 8 },
    rLine1: { position: 'absolute', top: '28%', left: '24%', width: '28%', height: 5, backgroundColor: '#00C96B', borderRadius: 3 },
    rLine2: { position: 'absolute', top: '28%', left: '51%', width: 5, height: '20%', backgroundColor: '#00C96B', borderRadius: 3 },
    pickupPin: { position: 'absolute', top: '25%', left: '20%', alignItems: 'center', zIndex: 3 },
    pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00C96B', borderWidth: 2.5, borderColor: '#FFF' },
    pinBubble: { backgroundColor: '#111820', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, marginTop: 4, alignItems: 'center' },
    pinText: { color: '#FFF', fontSize: 10.5, fontWeight: '800' },
    pinSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 8.5, marginTop: 1 },
    dropPin: { position: 'absolute', top: '40%', left: '48%', alignItems: 'center', zIndex: 5 },
    etaMarker: { position: 'absolute', top: '32%', left: '42%' },
    etaBadge: { backgroundColor: '#111820', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
    etaBadgeText: { color: '#FFF', fontSize: 9.5, fontWeight: '800', textAlign: 'center' },
    ambientCar: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center' },

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

    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 18 },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8DDE2', alignSelf: 'center', marginTop: 12 },
    sheetScroll: { paddingHorizontal: 16, paddingTop: 14 },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111820', letterSpacing: -0.3, marginBottom: 14 },

    sectionCard: { backgroundColor: '#F7FAF8', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E4EDE9', marginBottom: 10 },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C96B' },
    dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
    routeTextCol: { flex: 1 },
    routeMain: { fontSize: 13, fontWeight: '700', color: '#111820' },
    routeSub: { fontSize: 10.5, color: '#8A95A0', marginTop: 1 },
    routeDivider: { height: 1, backgroundColor: '#E4EDE9', marginVertical: 10, marginLeft: 20 },
    editText: { fontSize: 12.5, fontWeight: '700', color: '#00C96B' },

    vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAF8', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E4EDE9', marginBottom: 10, gap: 10 },
    vehicleImg: { width: 64, height: 44, borderRadius: 8 },
    vehicleMiddle: { flex: 1 },
    vehicleName: { fontSize: 15, fontWeight: '800', color: '#111820' },
    vehicleSub: { fontSize: 10.5, color: '#8A95A0', marginTop: 1 },
    etaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    etaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00C96B' },
    vehicleEta: { fontSize: 11, fontWeight: '700', color: '#00A855' },
    vehicleFareCol: { alignItems: 'flex-end', gap: 4 },
    vehicleFare: { fontSize: 18, fontWeight: '900', color: '#111820' },

    paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7FAF8', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E4EDE9', marginBottom: 10 },
    paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    payIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1A73E8', alignItems: 'center', justifyContent: 'center' },
    upiLabel: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    paymentLabel: { fontSize: 10.5, color: '#8A95A0', fontWeight: '600' },
    paymentValue: { fontSize: 13.5, fontWeight: '800', color: '#111820', marginTop: 1 },

    fareCard: { backgroundColor: '#F7FAF8', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E4EDE9', marginBottom: 10 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    fareLabel: { fontSize: 13, color: '#5A6570' },
    fareValue: { fontSize: 13, fontWeight: '700', color: '#111820' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E4EDE9', marginTop: 6 },
    totalLabel: { fontSize: 14.5, fontWeight: '800', color: '#111820' },
    totalValue: { fontSize: 16, fontWeight: '900', color: '#111820' },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF0EF', borderRadius: 12, padding: 12, marginBottom: 10 },
    errorText: { flex: 1, fontSize: 12.5, color: '#FF3B30', fontWeight: '600' },

    bookBtnWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 18, paddingTop: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F4F2' },
    bookBtn: { borderRadius: 18, overflow: 'hidden', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    bookBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    bookBtnText: { fontSize: 16.5, fontWeight: '800', color: '#FFF' },
});
