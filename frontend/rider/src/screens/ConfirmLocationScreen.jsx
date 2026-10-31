import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import { buildMapboxRouteUrl, extractLocationDetails } from '../../../shared/utils/mapboxHelper';

import { API_BASE } from '../../../shared/utils/apiConfig';

export default function ConfirmLocationScreen({ onBack, onNavigate }) {
    const {
        destination, pickupLocation,
        routeGeometry, distanceKm: storedDistance, durationMins: storedDuration,
        setQuote,
    } = useRideStore();

    const pickupDetails = extractLocationDetails(pickupLocation, 'Dwarka Sector 21');
    const dropDetails = extractLocationDetails(destination, 'Rajiv Chowk');

    const [distanceKm, setDistanceKm] = useState(storedDistance);
    const [durationMins, setDurationMins] = useState(storedDuration);
    const [loadingRoute, setLoadingRoute] = useState(!routeGeometry);
    const [mapUrl, setMapUrl] = useState(() =>
        buildMapboxRouteUrl(routeGeometry, pickupLocation, destination)
    );

    // Fetch live road routing & estimate from backend
    const fetchRoute = useCallback(async () => {
        try {
            setLoadingRoute(true);
            const res = await fetch(`${API_BASE}/api/rides/estimate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup: pickupLocation || { lat: 28.5427, lng: 77.0492, label: 'Dwarka Sector 21' },
                    drop: destination || { lat: 28.6339, lng: 77.2199, label: 'Rajiv Chowk' },
                }),
            });
            const json = await res.json();
            if (json.success && json.data) {
                const { quoteId, distanceKm: dKm, durationMins: dMin, fares, geometry } = json.data;
                setDistanceKm(dKm);
                setDurationMins(dMin);
                setQuote({ quoteId, distanceKm: dKm, durationMins: dMin, fares, geometry });
                if (geometry) {
                    setMapUrl(buildMapboxRouteUrl(geometry, pickupLocation, destination));
                }
            }
        } catch (err) {
            console.warn('[ConfirmLocationScreen] route estimate error:', err.message);
        } finally {
            setLoadingRoute(false);
        }
    }, [pickupLocation, destination, setQuote]);

    useEffect(() => {
        fetchRoute();
    }, [fetchRoute]);

    const handleConfirm = () => {
        if (onNavigate) onNavigate('ChooseRide');
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* ── REAL MAPBOX STREET MAP WITH ROAD PATH OVERLAY ── */}
            <View style={s.mapFull}>
                {mapUrl ? (
                    <Image
                        key={mapUrl}
                        source={{ uri: mapUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient colors={['#D8F0E5', '#E8F8EF']} style={StyleSheet.absoluteFillObject} />
                )}

                {/* Floating Destination Badge (Matching reference app) */}
                <View style={s.floatingDestCard}>
                    <View style={s.floatingDestDot} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.floatingDestTitle} numberOfLines={1}>{dropDetails.label}</Text>
                        <Text style={s.floatingDestSub} numberOfLines={1}>
                            {distanceKm ? `${distanceKm} km · ${durationMins || 25} min drive` : dropDetails.address}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#FFF" style={{ opacity: 0.7 }} />
                </View>

                {/* Floating Pickup Point Badge (Matching reference screenshot) */}
                <View style={s.floatingPickupCard}>
                    <View style={s.pickupCompassCircle}>
                        <Ionicons name="navigate" size={15} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.pickupPointTitle}>
                            Pick up point {durationMins ? `· ~${Math.min(5, Math.max(2, Math.round(durationMins * 0.15)))} min away` : ''}
                        </Text>
                        <Text style={s.pickupPointSub} numberOfLines={1}>{pickupDetails.label}</Text>
                    </View>
                </View>

                {/* Ambient Cars */}
                {[
                    { top: '15%', left: '10%' },
                    { top: '22%', right: '8%' },
                    { top: '48%', right: '12%' },
                ].map((pos, i) => (
                    <View key={i} style={[s.ambientCar, pos]}>
                        <MaterialCommunityIcons name="car-side" size={13} color="#4A6572" />
                    </View>
                ))}

                {/* Recenter Button */}
                <TouchableOpacity
                    style={s.recenterBtn}
                    onPress={fetchRoute}
                    activeOpacity={0.8}
                >
                    <Ionicons name="locate" size={19} color="#111820" />
                </TouchableOpacity>
            </View>

            {/* ── TOP SAFE OVERLAY ── */}
            <SafeAreaView edges={['top']} style={s.topOverlay} pointerEvents="box-none">
                <View style={s.topBar}>
                    <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={20} color="#1A1D20" />
                    </TouchableOpacity>
                    <View style={s.locationPill}>
                        <Ionicons name="location-sharp" size={15} color="#FF3B30" />
                        <Text style={s.locationPillText} numberOfLines={1}>{dropDetails.label}</Text>
                        {loadingRoute && <ActivityIndicator size="small" color="#00C96B" style={{ marginLeft: 6 }} />}
                    </View>
                </View>
            </SafeAreaView>

            {/* ── BOTTOM CONFIRMATION SHEET ── */}
            <View style={s.bottomCard}>
                <View style={s.dragHandle} />

                {/* Header row with title & real distance badge */}
                <View style={s.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.confirmTitle}>Confirm destination</Text>
                        <Text style={s.confirmSub}>Review live road path and proceed</Text>
                    </View>
                    {distanceKm ? (
                        <View style={s.distanceChip}>
                            <Ionicons name="speedometer-outline" size={13} color="#008A45" />
                            <Text style={s.distanceChipText}>{distanceKm} km</Text>
                        </View>
                    ) : null}
                </View>

                {/* Destination Details Card */}
                <View style={s.destinationRow}>
                    <View style={s.destIconCircle}>
                        <Ionicons name="location-sharp" size={22} color="#FF3B30" />
                    </View>
                    <View style={s.destTextCol}>
                        <View style={s.destTitleRow}>
                            <Text style={s.destMain} numberOfLines={1}>{dropDetails.label}</Text>
                            {durationMins ? (
                                <Text style={s.durationText}>~{durationMins} min</Text>
                            ) : null}
                        </View>
                        <Text style={s.destSub} numberOfLines={2}>
                            {dropDetails.address || dropDetails.full}
                        </Text>
                    </View>
                </View>

                {/* Confirm destination button */}
                <TouchableOpacity style={s.confirmBtn} activeOpacity={0.88} onPress={handleConfirm}>
                    <LinearGradient
                        colors={['#00D872', '#00B055']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.confirmBtnGrad}
                    >
                        <Text style={s.confirmBtnText}>Confirm destination</Text>
                        <Feather name="arrow-right" size={19} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#D8F0E5' },
    mapFull: { ...StyleSheet.absoluteFillObject },

    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
    locationPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 22, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
    locationPillText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111820' },

    // Floating cards over the map (matching reference screenshot)
    floatingDestCard: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 95,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#161C24',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        maxWidth: '86%',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    floatingDestDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
    floatingDestTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    floatingDestSub: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, marginTop: 1 },

    floatingPickupCard: {
        position: 'absolute',
        bottom: 275,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.96)',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 5,
    },
    pickupCompassCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#00C96B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickupPointTitle: { fontSize: 12.5, fontWeight: '800', color: '#111820' },
    pickupPointSub: { fontSize: 11, color: '#6B7280', marginTop: 1 },

    ambientCar: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    recenterBtn: { position: 'absolute', right: 16, bottom: 215, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },

    // Bottom sheet
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 18,
    },
    dragHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#D8DDE2', alignSelf: 'center', marginTop: 12, marginBottom: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    confirmTitle: { fontSize: 20, fontWeight: '900', color: '#111820', letterSpacing: -0.3 },
    confirmSub: { fontSize: 12, color: '#8A95A0', marginTop: 2 },
    distanceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F8EF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#B7EACD' },
    distanceChipText: { fontSize: 12, fontWeight: '800', color: '#008A45' },

    destinationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFF8F8',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FFE5E3',
        marginBottom: 16,
    },
    destIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0EF', alignItems: 'center', justifyContent: 'center' },
    destTextCol: { flex: 1 },
    destTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    destMain: { fontSize: 15, fontWeight: '800', color: '#111820', flex: 1 },
    durationText: { fontSize: 12, fontWeight: '800', color: '#FF3B30', marginLeft: 8 },
    destSub: { fontSize: 11.5, color: '#6B7280', lineHeight: 16 },

    confirmBtn: { borderRadius: 18, overflow: 'hidden', shadowColor: '#00C96B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
    confirmBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    confirmBtnText: { fontSize: 16.5, fontWeight: '800', color: '#FFF' },
});
