import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
    Easing,
    Platform,
    StatusBar,
    Image,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import { buildMapboxRouteUrl, extractLocationDetails, MAPBOX_TOKEN } from '../../../shared/utils/mapboxHelper';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || API_BASE.replace(/^http/, 'ws');

// Nearby decoy cars scattered around the pickup point on the static map
function buildFindingMapUrl(routeGeometry, pickup, destination) {
    const pu = pickup ? extractLocationDetails(pickup) : null;
    const dp = destination ? extractLocationDetails(destination) : null;

    const pLng = pu?.lng ?? 77.0492;
    const pLat = pu?.lat ?? 28.5427;
    const dLng = dp?.lng ?? 77.2199;
    const dLat = dp?.lat ?? 28.6338;

    const coords = routeGeometry?.coordinates;
    const hasRoute = Array.isArray(coords) && coords.length > 1;

    if (hasRoute) {
        const step = Math.max(1, Math.floor(coords.length / 50));
        const sampled = [];
        for (let i = 0; i < coords.length; i += step) {
            sampled.push([Number(coords[i][0].toFixed(5)), Number(coords[i][1].toFixed(5))]);
        }
        const last = coords[coords.length - 1];
        if (sampled[sampled.length - 1]?.[0] !== Number(last[0].toFixed(5))) {
            sampled.push([Number(last[0].toFixed(5)), Number(last[1].toFixed(5))]);
        }

        const geojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { stroke: '#00C96B', 'stroke-width': 4, 'stroke-opacity': 0.9 },
                    geometry: { type: 'LineString', coordinates: sampled },
                },
                {
                    type: 'Feature',
                    properties: { 'marker-color': '00C96B', 'marker-size': 'large', 'marker-symbol': 'circle' },
                    geometry: { type: 'Point', coordinates: [pLng, pLat] },
                },
                {
                    type: 'Feature',
                    properties: { 'marker-color': 'EF4444', 'marker-size': 'medium' },
                    geometry: { type: 'Point', coordinates: [dLng, dLat] },
                },
            ],
        };

        const enc = encodeURIComponent(JSON.stringify(geojson));
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/geojson(${enc})/auto/700x700@2x?padding=80,80,80,80&access_token=${MAPBOX_TOKEN}`;
    }

    // Fallback: just pickup + drop pins
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-a+00c96b(${pLng},${pLat}),pin-s-b+ef4444(${dLng},${dLat})/auto/700x700@2x?padding=80,80,80,80&access_token=${MAPBOX_TOKEN}`;
}

const STEPS = [
    { id: 'sent', label: 'Request Sent', sub: 'Broadcast to nearby drivers', done: true },
    { id: 'finding', label: 'Finding Driver', sub: 'Checking availability & ETA', active: true },
    { id: 'match', label: 'Almost There', sub: 'Matching best driver for you', done: false },
];

export default function FindingDriverScreen({ onNavigate, onCancel }) {
    const {
        pickupLocation,
        destination,
        fare,
        selectedVehicleTier,
        routeGeometry,
        driver,
        setRideStatus,
        setDriver,
        setDeliveryOtp,
        resetTripState,
    } = useRideStore();

    const pickupDetails = extractLocationDetails(pickupLocation, 'Pickup Location');
    const dropDetails = extractLocationDetails(destination, 'Destination');

    const [stepIdx, setStepIdx] = useState(0);
    const [matchedDriver, setMatchedDriver] = useState(null);

    const mapUrl = buildFindingMapUrl(routeGeometry, pickupLocation, destination);

    // Spinner rotation animation for the "finding" icon
    const spinAnim = useRef(new Animated.Value(0)).current;
    const matchScale = useRef(new Animated.Value(0.85)).current;
    const matchOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 2200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    useEffect(() => {
        const t1 = setTimeout(() => setStepIdx(1), 2500);
        const t2 = setTimeout(() => setStepIdx(2), 5000);

        let ws;
        let isDone = false;

        const handleMatch = (driverData, otp) => {
            if (isDone) return;
            isDone = true;

            const fallbackPool = [
                { name: 'Vikram Singh', vehicle: 'White Swift Dzire • DL 1Z A 4421', rating: 4.89, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80', etaMinutes: 4 },
                { name: 'Rajesh Sharma', vehicle: 'Yellow Bajaj Auto • HR 26 AT 8812', rating: 4.75, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80', etaMinutes: 3 },
                { name: 'Mohit Verma', vehicle: 'Honda Activa • DL 4S B 1092', rating: 4.92, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80', etaMinutes: 2 },
                { name: 'Arjun Nair', vehicle: 'Maruti Suzuki Ertiga • KA 05 MX 7741', rating: 4.81, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&q=80', etaMinutes: 5 },
                { name: 'Deepak Yadav', vehicle: 'Hyundai Grand i10 • UP 14 CK 9901', rating: 4.88, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80', etaMinutes: 4 },
                { name: 'Anil Kumar', vehicle: 'Mahindra eVerito • DL 7CF AB 2231', rating: 4.95, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=160&q=80', etaMinutes: 3 },
            ];

            const raw = driverData || (driver?.name ? driver : fallbackPool[Math.floor(Math.random() * fallbackPool.length)]);
            const vehicleParts = (raw.vehicle || '').split('•').map(p => p.trim());
            const fullDriver = {
                ...raw,
                name: raw.name || 'Captain Assigned',
                plate: raw.plate || vehicleParts[1] || 'DL 1Z A 4421',
                vehicle: vehicleParts[0] || raw.vehicle || 'Swift Dzire',
                rating: raw.rating || 4.88,
                etaMinutes: raw.etaMinutes || 4,
                avatar: raw.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
            };

            setDriver(fullDriver);
            if (otp) setDeliveryOtp(otp);
            setMatchedDriver(fullDriver);

            Animated.parallel([
                Animated.spring(matchScale, { toValue: 1, friction: 7, useNativeDriver: true }),
                Animated.timing(matchOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();

            setRideStatus('DRIVER_ASSIGNED');

            setTimeout(() => {
                if (onNavigate) onNavigate('TripTracking');
            }, 1600);
        };

        // Real WebSocket
        try {
            ws = new WebSocket(WS_URL);
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (
                        msg.type === 'ride.driver_confirmed' ||
                        msg.type === 'ride.driver_assigned' ||
                        msg.type === 'DRIVER_ASSIGNED'
                    ) {
                        const payload = msg.data || msg;
                        handleMatch(payload.driver, payload.otp);
                    }
                } catch (_) { }
            };
        } catch (_) { }

        // Fallback after 9s so demo never stalls
        const fallback = setTimeout(() => handleMatch(), 9000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(fallback);
            try { ws?.close(); } catch (_) { }
        };
    }, []);

    const handleCancel = () => {
        resetTripState();
        if (onCancel) onCancel();
        else if (onNavigate) onNavigate('Home');
    };

    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* ── Full-screen map (top 60%) ── */}
            <View style={s.mapArea}>
                {mapUrl ? (
                    <Image source={{ uri: mapUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E8F5EE' }]} />
                )}

                {/* Top overlay: Dropp header */}
                <SafeAreaView edges={['top']} style={s.mapHeader} pointerEvents="box-none">
                    <View style={s.mapHeaderInner}>
                        <View style={s.droppLogo}>
                            <Ionicons name="location" size={18} color="#00C96B" />
                            <Text style={s.droppLogoText}>Dropp</Text>
                        </View>
                        <Text style={s.mapHeaderSub}>Finding your driver...</Text>
                        <TouchableOpacity style={s.cancelTopBtn} onPress={handleCancel} activeOpacity={0.8}>
                            <Ionicons name="close" size={16} color="#111820" />
                            <Text style={s.cancelTopText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pickup / Drop pill */}
                    <View style={s.routePill}>
                        <View style={s.routeRow}>
                            <View style={s.greenDot} />
                            <Text style={s.routeText} numberOfLines={1}>{pickupDetails.label}</Text>
                            <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                        </View>
                        <View style={s.routeDividerLine} />
                        <View style={s.routeRow}>
                            <View style={s.redDot} />
                            <Text style={s.routeText} numberOfLines={1}>{dropDetails.label}</Text>
                        </View>
                    </View>
                </SafeAreaView>

                {/* Pulsing pickup marker overlay */}
                <View style={s.pickupMarkerArea} pointerEvents="none">
                    <View style={s.pickupCallout}>
                        <Text style={s.pickupCalloutText}>Your pickup location</Text>
                    </View>
                </View>
            </View>

            {/* ── White bottom sheet ── */}
            <View style={s.sheet}>
                <View style={s.dragHandle} />

                {/* Status header */}
                <View style={s.statusHeader}>
                    <Animated.View style={[s.spinnerWrap, { transform: [{ rotate: spin }] }]}>
                        <MaterialCommunityIcons name="radar" size={28} color="#00C96B" />
                    </Animated.View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.statusTitle}>Finding your driver...</Text>
                        <Text style={s.statusSub}>We're checking nearby drivers for your ride</Text>
                    </View>
                </View>

                {/* Step progress */}
                <View style={s.stepsContainer}>
                    {STEPS.map((step, idx) => {
                        const isActive = idx === stepIdx;
                        const isDone = idx < stepIdx;
                        return (
                            <View key={step.id} style={s.stepRow}>
                                <View style={s.stepIconCol}>
                                    <View style={[
                                        s.stepCircle,
                                        isDone && s.stepCircleDone,
                                        isActive && s.stepCircleActive,
                                    ]}>
                                        {isDone ? (
                                            <Ionicons name="checkmark" size={13} color="#FFF" />
                                        ) : isActive ? (
                                            <View style={s.stepDotInner} />
                                        ) : (
                                            <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                                        )}
                                    </View>
                                    {idx < STEPS.length - 1 && (
                                        <View style={[s.stepLine, (isDone || isActive) && s.stepLineDone]} />
                                    )}
                                </View>
                                <View style={s.stepContent}>
                                    <Text style={[s.stepLabel, (isDone || isActive) && s.stepLabelActive]}>
                                        {step.label}
                                    </Text>
                                    <Text style={s.stepSub}>{step.sub}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Matched driver banner (reveals when driver found) */}
                {matchedDriver && (
                    <Animated.View style={[s.matchBanner, { transform: [{ scale: matchScale }], opacity: matchOpacity }]}>
                        <Ionicons name="checkmark-circle" size={20} color="#00C96B" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={s.matchName}>{matchedDriver.name}</Text>
                            <Text style={s.matchSub}>{matchedDriver.vehicle || 'On the way'}</Text>
                        </View>
                        <Text style={s.matchEta}>{matchedDriver.etaMinutes || 4} min</Text>
                    </Animated.View>
                )}

                {/* Safety trust badge */}
                <View style={s.safetyBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#00C96B" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.safetyTitle}>Your ride is safe with Dropp</Text>
                        <Text style={s.safetySub}>Verified drivers. Real-time tracking. 24x7 support.</Text>
                    </View>
                </View>

                {/* Fare row */}
                <View style={s.fareRow}>
                    <MaterialCommunityIcons name="car-side" size={26} color="#374151" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.fareServiceName}>
                            Ride · {selectedVehicleTier ? selectedVehicleTier.charAt(0).toUpperCase() + selectedVehicleTier.slice(1).replace('_', ' ') : 'Economy'}
                        </Text>
                    </View>
                    <Text style={s.fareAmt}>Est. Fare</Text>
                    <Text style={s.fareValue}>₹{fare ? Math.round(fare) : 149}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>

                {/* Cancel button */}
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                    <Ionicons name="call-outline" size={17} color="#EF4444" />
                    <Text style={s.cancelBtnText}>Cancel Search</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F9FAFB' },

    // Map area (top 60%)
    mapArea: { flex: 1 },
    mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    mapHeaderInner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 6,
        backgroundColor: '#FFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    droppLogo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    droppLogoText: { fontSize: 16, fontWeight: '800', color: '#111820' },
    mapHeaderSub: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '500' },
    cancelTopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    cancelTopText: { fontSize: 13, fontWeight: '600', color: '#374151' },

    routePill: {
        marginHorizontal: 12,
        marginTop: 8,
        backgroundColor: '#FFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    routeDividerLine: {
        width: 2,
        height: 14,
        backgroundColor: '#D1FAE5',
        marginLeft: 4,
        marginVertical: 3,
    },
    greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C96B' },
    redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
    routeText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111820' },

    pickupMarkerArea: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    pickupCallout: {
        backgroundColor: '#111820',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    pickupCalloutText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

    // Bottom sheet
    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 12,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 16,
    },

    statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    spinnerWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    statusTitle: { fontSize: 17, fontWeight: '700', color: '#111820' },
    statusSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

    // Steps
    stepsContainer: { marginBottom: 16 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
    stepIconCol: { alignItems: 'center', width: 28 },
    stepCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
    },
    stepCircleDone: { backgroundColor: '#00C96B', borderColor: '#00C96B' },
    stepCircleActive: { borderColor: '#00C96B', borderWidth: 2.5 },
    stepDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C96B' },
    stepLine: { width: 2, height: 28, backgroundColor: '#E5E7EB', marginTop: 2 },
    stepLineDone: { backgroundColor: '#D1FAE5' },
    stepContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
    stepLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    stepLabelActive: { color: '#111820' },
    stepSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

    // Driver match banner
    matchBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    matchName: { fontSize: 15, fontWeight: '700', color: '#111820' },
    matchSub: { fontSize: 12, color: '#6B7280' },
    matchEta: { fontSize: 14, fontWeight: '800', color: '#00C96B' },

    // Safety badge
    safetyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    safetyTitle: { fontSize: 13, fontWeight: '700', color: '#111820' },
    safetySub: { fontSize: 11.5, color: '#6B7280', marginTop: 2 },

    // Fare row
    fareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    fareServiceName: { fontSize: 14, fontWeight: '600', color: '#374151' },
    fareAmt: { fontSize: 12, color: '#9CA3AF', marginRight: 4 },
    fareValue: { fontSize: 16, fontWeight: '800', color: '#111820', marginRight: 4 },

    // Cancel
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        backgroundColor: '#FFF1F2',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
