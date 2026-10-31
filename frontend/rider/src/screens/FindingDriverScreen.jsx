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
import { extractLocationDetails } from '../../../shared/utils/mapboxHelper';
import LiveMap from '../../../shared/components/LiveMap';
import { getCustomerId } from '../../../shared/utils/authStorage';
import { API_BASE, WS_BASE } from '../../../shared/utils/apiConfig';

const WS_URL = WS_BASE;

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
        rideId,
        setRideStatus,
        setDriver,
        setDeliveryOtp,
        setRideId,
        setCustomerId,
        resetTripState,
    } = useRideStore();

    const pickupDetails = extractLocationDetails(pickupLocation, 'Pickup Location');
    const dropDetails = extractLocationDetails(destination, 'Destination');

    const [stepIdx, setStepIdx] = useState(0);
    const [matchedDriver, setMatchedDriver] = useState(null);

    const [searchSecs, setSearchSecs] = useState(0);

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
        const t2 = setTimeout(() => setStepIdx(2), 6000);
        const ticker = setInterval(() => setSearchSecs((n) => n + 1), 1000);

        let ws;
        let poll;
        let isDone = false;

        // Only ever shows the driver who actually accepted — no invented fallback driver
        const handleMatch = (d, otp) => {
            if (isDone || !d?.name) return;
            isDone = true;
            const [vehicleModel, plate] = String(d.vehicle || '').split('•').map((p) => p.trim());
            const fullDriver = { ...d, vehicle: vehicleModel || d.vehicle || '', plate: plate || d.plate || '' };
            setDriver(fullDriver);
            if (otp) setDeliveryOtp(otp);
            setMatchedDriver(fullDriver);
            Animated.parallel([
                Animated.spring(matchScale, { toValue: 1, friction: 7, useNativeDriver: true }),
                Animated.timing(matchOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
            setRideStatus('DRIVER_ASSIGNED');
            setTimeout(() => onNavigate?.('TripTracking'), 1600);
        };

        const handleCancelled = () => {
            if (isDone) return;
            isDone = true;
            resetTripState();
            onNavigate?.('Home');
        };

        (async () => {
            const customerId = await getCustomerId().catch(() => null);
            try {
                ws = new WebSocket(`${WS_URL}${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ''}`);
                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        const payload = msg.data || msg;
                        if (rideId && payload.rideId && String(payload.rideId) !== String(rideId)) return;
                        if (msg.type === 'ride.driver_confirmed' || msg.type === 'ride.driver_assigned') {
                            handleMatch(payload.driver, payload.otp);
                        } else if (msg.type === 'ride.cancelled') {
                            handleCancelled();
                        }
                    } catch (_) { }
                };
            } catch (_) { }
        })();

        // Backup in case the socket event is missed (e.g. it fired before we connected)
        if (rideId) {
            poll = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/rides/${rideId}`);
                    const json = await res.json();
                    const ride = json.data || json;
                    if (ride?.driver?.name) handleMatch(ride.driver, ride.otp);
                    else if (ride?.status === 'cancelled') handleCancelled();
                } catch (_) { }
            }, 3000);
        }

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearInterval(ticker);
            clearInterval(poll);
            try { ws?.close(); } catch (_) { }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rideId]);

    const handleCancel = async () => {
        if (rideId) {
            try {
                // Rides booked through Aura carry their own customer id in the store
                const customerId = useRideStore.getState().customerId || (await getCustomerId().catch(() => null));
                await fetch(`${API_BASE}/api/rides/${rideId}/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(customerId ? { 'x-customer-id': customerId } : {}) },
                    body: JSON.stringify({ customerId }),
                });
            } catch (_) { }
        }
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
                <LiveMap
                    style={StyleSheet.absoluteFillObject}
                    pickup={pickupDetails.lat != null ? pickupDetails : null}
                    drop={dropDetails.lat != null ? dropDetails : null}
                    route={routeGeometry}
                    pickupLabel={pickupDetails.label}
                    dropLabel={dropDetails.label}
                    edgePadding={{ top: 170, right: 50, bottom: 60, left: 50 }}
                />

                {/* Top overlay: Dropp header */}
                <SafeAreaView edges={['top']} style={s.mapHeader} pointerEvents="box-none">
                    <View style={s.mapHeaderInner}>
                        <View style={s.droppLogo}>
                            <Ionicons name="location" size={18} color="#00C96B" />
                            <Text style={s.droppLogoText}>Dropp</Text>
                        </View>
                        <Text style={s.mapHeaderSub}>{matchedDriver ? 'Driver found!' : `Finding your driver… ${searchSecs}s`}</Text>
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
                            <Text style={s.matchSub}>{[matchedDriver.vehicle, matchedDriver.plate].filter(Boolean).join(' • ') || 'On the way'}</Text>
                        </View>
                        {matchedDriver.etaMinutes != null && <Text style={s.matchEta}>{matchedDriver.etaMinutes} min</Text>}
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
                    <Text style={s.fareValue}>{fare ? `₹${Math.round(fare)}` : '—'}</Text>
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
