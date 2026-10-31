/**
 * DriverNavigationScreen — Multi-pillar navigation & delivery flow
 * Handles RIDE | FOOD DELIVERY | PARCEL DELIVERY | SHOPPING DELIVERY
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    StatusBar,
    Image,
    Alert,
    Animated,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
let Speech = null;
try {
    Speech = require('expo-speech');
} catch (_) {}
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useTheme } from '../theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';
import { extractLocationDetails } from '../../../shared/utils/mapboxHelper';
import { API_BASE, WS_BASE } from '../../../shared/utils/apiConfig';
import LiveMap from '../../../shared/components/LiveMap';

const DRIVER_ID_KEY = '@dropp_driver_id';

// Each step maps to exactly one backend status. `otp` steps need the customer's code, which the
// server checks — the driver app never knows the OTP.
const RIDE_STEPS = [
    { key: 'TO_PICKUP', label: 'Pickup', icon: 'car', status: 'arrived', cta: 'Arrived at Pickup', target: 'pickup' },
    { key: 'VERIFY', label: 'OTP', icon: 'key', status: 'in_progress', otp: true, cta: 'Start Trip', target: 'pickup' },
    { key: 'TO_DROP', label: 'Drop', icon: 'flag', status: 'completed', cta: 'Complete Ride', target: 'drop' },
];
const DELIVERY_STEPS = [
    { key: 'TO_PICKUP', label: 'Pickup', icon: 'storefront', status: 'arrived', cta: 'Arrived at Pickup', target: 'pickup' },
    { key: 'COLLECT', label: 'Collect', icon: 'bag-check', status: 'picked_up', cta: 'Order Picked Up', target: 'pickup' },
    { key: 'TO_DROP', label: 'Deliver', icon: 'navigate', status: null, cta: 'Arrived at Customer', target: 'drop' },
    { key: 'VERIFY', label: 'OTP', icon: 'key', status: 'completed', otp: true, cta: 'Complete Delivery', target: 'drop' },
];

const isInServiceArea = (c) => c && c.lat > 6 && c.lat < 37.5 && c.lng > 68 && c.lng < 97.5;

function distanceKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

const formatDistance = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

function calcBearing(lat1, lon1, lat2, lon2) {
    const toRad = d => (d * Math.PI) / 180;
    const toDeg = r => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);
}

export default function DriverNavigationScreen({ onNavigate }) {
    const { theme } = useTheme();
    const {
        pickupLocation,
        destination,
        routeGeometry,
        fare,
        serviceType,
        rideId,
        resetTripState,
    } = useRideStore();

    const [stepIdx, setStepIdx] = useState(0);
    const [enteredOtp, setEnteredOtp] = useState('');
    const [otpError, setOtpError] = useState(null);
    const [driverId, setDriverId] = useState(null);
    const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
    const [currentCoords, setCurrentCoords] = useState(null);
    const [isBusy, setIsBusy] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isFood = (serviceType || '').includes('FOOD');
    const isParcel = (serviceType || '').includes('PARCEL') || (serviceType || '').includes('DELIVERY');
    const isShop = (serviceType || '').includes('SHOP');

    const pillarColor = isFood ? '#F97316' : isParcel ? '#3B82F6' : isShop ? '#A855F7' : '#00C96B';
    const pillarIcon = isFood ? 'fast-food' : isParcel ? 'cube' : isShop ? 'cart' : 'car';
    const pillarLabel = isFood ? 'FOOD DELIVERY' : isParcel ? 'PARCEL DELIVERY' : isShop ? 'SHOPPING DELIVERY' : 'RIDE';

    const puDetails = extractLocationDetails(
        pickupLocation,
        isFood ? 'Restaurant Pickup' : isParcel ? 'Sender Pickup' : isShop ? 'Store Pickup' : 'Pickup Point'
    );
    const dropDetails = extractLocationDetails(
        destination,
        isFood ? 'Customer Location' : isParcel ? 'Recipient Address' : isShop ? 'Customer Location' : 'Destination'
    );

    // Food/shop orders are Order documents; rides and parcels are Ride documents with the ride flow
    const steps = isFood || isShop ? DELIVERY_STEPS : RIDE_STEPS;
    const step = steps[stepIdx] || steps[steps.length - 1];
    const targetPt = step.target === 'pickup' ? puDetails : dropDetails;
    const distToTarget = distanceKm(currentCoords, targetPt);
    const cleanFare = String(fare ?? '').replace('₹', '').trim();

    // Pulse animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Load Driver ID
    useEffect(() => {
        async function loadDriver() {
            try {
                const id = await AsyncStorage.getItem(DRIVER_ID_KEY);
                if (id) setDriverId(id);
            } catch (err) {
                console.warn('[DriverNav] Failed to load driverId:', err.message);
            }
        }
        loadDriver();
    }, []);

    const guidance =
        step.otp ? 'Ask the customer for their 4-digit OTP'
        : step.key === 'COLLECT' ? `Collect the order at ${puDetails.label || 'the pickup'}`
        : `Head to ${targetPt.label || (step.target === 'pickup' ? 'pickup' : 'destination')}`;

    // Spoken guidance when the step changes
    useEffect(() => {
        if (Speech?.speak) Speech.speak(guidance, { language: 'en-IN', rate: 0.95 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIdx]);

    // If the customer cancels mid-trip, stop and go home
    useEffect(() => {
        if (!rideId) return;
        let ws;
        try {
            ws = new WebSocket(`${WS_BASE}?role=driver`);
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    const d = msg.data || {};
                    const id = String(d.rideId || d.orderId || d.offerId || '');
                    if ((msg.type === 'ride.cancelled' || msg.type === 'ORDER_CANCELLED') && id === String(rideId)) {
                        Alert.alert('Trip Cancelled', 'The customer cancelled this trip.');
                        resetTripState();
                        onNavigate?.('DriverHome');
                    }
                } catch (_) {}
            };
        } catch (_) {}
        return () => { try { ws?.close(); } catch (_) {} };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rideId]);

    // Real GPS push every 3.5s
    useEffect(() => {
        if (!driverId || isSimulatingDrive) return;
        let cancelled = false;
        let intervalId = null;

        const pushGPS = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (cancelled || !loc?.coords) return;
                const { latitude: lat, longitude: lng, heading } = loc.coords;
                if (!isInServiceArea({ lat, lng })) return; // simulator default (California) — use the Sim drive instead
                setCurrentCoords({ lat, lng, bearing: heading ?? 0 });
                await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng, bearing: heading ?? 0 }),
                });
            } catch (_) {
                // Network blips are expected; the next tick retries
            }
        };

        pushGPS();
        intervalId = setInterval(pushGPS, 3500);
        return () => { cancelled = true; clearInterval(intervalId); };
    }, [driverId, isSimulatingDrive]);

    // Simulated drive
    useEffect(() => {
        if (!isSimulatingDrive || !driverId) return;

        const coords = routeGeometry?.coordinates;
        const pathPoints = (Array.isArray(coords) && coords.length > 1)
            ? coords
            : [[puDetails.lng, puDetails.lat], [dropDetails.lng, dropDetails.lat]].filter(([x, y]) => x != null && y != null);
        if (pathPoints.length < 2) {
            setIsSimulatingDrive(false);
            return;
        }

        let index = 0;
        const intervalId = setInterval(async () => {
            if (index >= pathPoints.length) {
                setIsSimulatingDrive(false);
                return;
            }
            const [lng, lat] = pathPoints[index];
            const [nextLng, nextLat] = pathPoints[Math.min(index + 1, pathPoints.length - 1)];
            const bearing = calcBearing(lat, lng, nextLat, nextLng);
            setCurrentCoords({ lat, lng, bearing });
            try {
                await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng, bearing }),
                });
            } catch (_) {}
            index += 1;
        }, 2000);

        return () => clearInterval(intervalId);
    }, [isSimulatingDrive, driverId, routeGeometry]);

    const postStatus = async (status, otp) => {
        const res = await fetch(`${API_BASE}/api/drivers/${driverId}/task/${rideId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(otp ? { status, otp } : { status }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
            throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status });
        }
        return json.data;
    };

    // Advance only after the server accepts the change, so driver and customer never disagree
    const handleNextStep = async () => {
        if (isBusy) return;
        if (!driverId || !rideId) {
            Alert.alert('No Active Trip', 'This trip is no longer available.');
            onNavigate?.('DriverHome');
            return;
        }
        if (step.otp && !/^\d{4}$/.test(enteredOtp.trim())) {
            setOtpError('Enter the 4-digit code from the customer');
            return;
        }
        setIsBusy(true);
        try {
            if (step.status) await postStatus(step.status, step.otp ? enteredOtp.trim() : null);
            setOtpError(null);
            setEnteredOtp('');
            if (stepIdx < steps.length - 1) {
                setStepIdx(stepIdx + 1);
            } else {
                Alert.alert(
                    isFood || isShop ? 'Delivered!' : isParcel ? 'Parcel Delivered!' : 'Ride Complete!',
                    cleanFare ? `₹${cleanFare} has been added to today's earnings.` : 'Trip completed.'
                );
                resetTripState();
                onNavigate?.('DriverHome');
            }
        } catch (err) {
            if (step.otp && err.status === 400) setOtpError(err.message);
            else if (err.status === 410) {
                Alert.alert('Trip Cancelled', err.message);
                resetTripState();
                onNavigate?.('DriverHome');
            } else Alert.alert('Could not update trip', err.message || 'Check your connection and try again.');
        } finally {
            setIsBusy(false);
        }
    };

    const headerTitle =
        step.otp ? 'Verify Customer OTP'
        : step.key === 'COLLECT' ? 'Collect the Order'
        : step.target === 'pickup'
            ? (isFood ? 'Heading to Restaurant' : isParcel ? 'Heading to Sender' : isShop ? 'Heading to Store' : 'Heading to Pickup')
            : (isFood || isShop ? 'Delivering to Customer' : isParcel ? 'Delivering to Recipient' : 'En Route to Drop');
    const buttonLabel = step.cta;
    const stepDefs = steps;
    const stepIndex = stepIdx;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => onNavigate && onNavigate('DriverHome')}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.topCenter}>
                    <View style={[styles.pillarBadge, { backgroundColor: pillarColor + '22', borderColor: pillarColor + '55' }]}>
                        <Ionicons name={pillarIcon} size={12} color={pillarColor} />
                        <Text style={[styles.pillarText, { color: pillarColor }]}>{pillarLabel}</Text>
                    </View>
                    <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>
                        {targetPt.label || (step.target === 'pickup' ? 'Pickup' : 'Destination')}
                    </Text>
                </View>

                {__DEV__ ? (
                <TouchableOpacity
                    style={[styles.simBtn, isSimulatingDrive && { backgroundColor: '#00C96B', borderColor: '#00C96B' }]}
                    onPress={() => setIsSimulatingDrive(prev => !prev)}
                >
                    <Ionicons name={isSimulatingDrive ? 'pause' : 'play'} size={12} color={isSimulatingDrive ? '#000' : '#FFF'} />
                    <Text style={[styles.simBtnText, isSimulatingDrive && { color: '#000' }]}>
                        {isSimulatingDrive ? 'Stop' : 'Sim drive'}
                    </Text>
                </TouchableOpacity>
                ) : <View style={{ width: 36 }} />}
            </View>

            {/* Progress Stepper */}
            <View style={styles.progressRow}>
                {stepDefs.map((s, i) => {
                    const done = stepIndex > i;
                    const active = stepIndex === i;
                    return (
                        <React.Fragment key={s.key}>
                            <View style={styles.stepItem}>
                                <View style={[
                                    styles.stepCircle,
                                    done && { backgroundColor: '#00C96B', borderColor: '#00C96B' },
                                    active && { backgroundColor: pillarColor, borderColor: pillarColor },
                                    !done && !active && { backgroundColor: '#1E293B', borderColor: '#334155' },
                                ]}>
                                    <Ionicons
                                        name={done ? 'checkmark' : s.icon}
                                        size={13}
                                        color={done || active ? '#000' : '#475569'}
                                    />
                                </View>
                                <Text style={[styles.stepLabel, (done || active) && { color: '#CBD5E1' }]}>{s.label}</Text>
                            </View>
                            {i < stepDefs.length - 1 && (
                                <View style={[styles.stepLine, done && { backgroundColor: '#00C96B' }]} />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>

            {/* Live Map */}
            <View style={styles.mapContainer}>
                {/* Floating Turn-by-Turn Maneuver Guidance Banner */}
                <View style={styles.maneuverBanner}>
                    <View style={styles.maneuverIconBox}>
                        <Ionicons
                            name={step.otp ? 'key' : step.target === 'pickup' ? 'arrow-up-circle' : 'navigate-circle'}
                            size={26}
                            color="#00C96B"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.maneuverDistance}>
                            {step.otp || step.key === 'COLLECT' ? 'At location' : distToTarget != null ? formatDistance(distToTarget) : 'Locating…'}
                        </Text>
                        <Text style={styles.maneuverInstruction} numberOfLines={1}>
                            {guidance}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.voiceMuteBtn}
                        onPress={() => {
                            if (Speech?.speak) Speech.speak(guidance, { language: 'en-IN', rate: 0.95 });
                        }}
                    >
                        <Ionicons name="volume-high" size={20} color="#00C96B" />
                    </TouchableOpacity>
                </View>

                <LiveMap
                    style={StyleSheet.absoluteFillObject}
                    pickup={puDetails.lat != null ? puDetails : null}
                    drop={dropDetails.lat != null ? dropDetails : null}
                    route={routeGeometry}
                    driver={currentCoords}
                    pickupLabel={puDetails.label}
                    dropLabel={dropDetails.label}
                    driverIcon={isFood ? 'bicycle' : 'navigate'}
                    followDriver={isSimulatingDrive}
                    edgePadding={{ top: 120, right: 50, bottom: 60, left: 50 }}
                />

                {/* GPS Badge */}
                <View style={styles.gpsBadge}>
                    <View style={[styles.gpsLiveDot, isSimulatingDrive && { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.gpsBadgeText}>
                        {isSimulatingDrive ? 'SIM DRIVE' : currentCoords ? 'LIVE GPS' : 'GPS…'}
                    </Text>
                </View>

                {/* Fare Badge */}
                {!!cleanFare && (
                    <View style={[styles.fareBadge, { backgroundColor: pillarColor }]}>
                        <Text style={styles.fareBadgeText}>₹{cleanFare}</Text>
                    </View>
                )}
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.locationPill}>
                    <View style={[styles.locationDot, { backgroundColor: step.target === 'pickup' ? '#00C96B' : '#FF3B30' }]} />
                    <Text style={styles.locationPillText} numberOfLines={1}>
                        {targetPt.full || targetPt.label || (step.target === 'pickup' ? 'Pickup' : 'Drop')}
                    </Text>
                </View>

                {step.otp && (
                    <View style={styles.otpContainer}>
                        <Text style={styles.otpInputLabel}>Enter the 4-digit OTP the customer shares with you</Text>
                        <TextInput
                            style={[styles.otpInput, { borderColor: otpError ? '#EF4444' : pillarColor }]}
                            placeholder="· · · ·"
                            placeholderTextColor="#334155"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={enteredOtp}
                            onChangeText={t => { setEnteredOtp(t.replace(/\D/g, '')); setOtpError(null); }}
                            autoFocus
                        />
                        {!!otpError && (
                            <View style={styles.otpErrorRow}>
                                <Ionicons name="close-circle" size={13} color="#EF4444" />
                                <Text style={styles.otpErrorText}>{otpError}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.ctaRow}>
                    <TouchableOpacity
                        style={styles.callBtn}
                        disabled={targetPt.lat == null}
                        onPress={() => Linking.openURL(`http://maps.apple.com/?daddr=${targetPt.lat},${targetPt.lng}&dirflg=d`).catch(() => {})}
                        accessibilityLabel="Open turn-by-turn navigation"
                    >
                        <Ionicons name="navigate" size={22} color="#00C96B" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryCta, { backgroundColor: pillarColor, opacity: isBusy ? 0.7 : 1 }]}
                        onPress={handleNextStep}
                        disabled={isBusy}
                        activeOpacity={0.85}
                    >
                        {isBusy ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <>
                                <Text style={styles.primaryCtaText}>{buttonLabel}</Text>
                                <Ionicons name="checkmark-done" size={18} color="#000" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F17' },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: '#0B0F17',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topCenter: { flex: 1 },
    pillarBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 2,
    },
    pillarText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    headerTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: '800' },
    headerSub: { color: '#64748B', fontSize: 11, marginTop: 1 },
    simBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    simBtnText: { fontSize: 10, fontWeight: '800', color: '#CBD5E1' },

    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: '#0B0F17',
    },
    stepItem: { alignItems: 'center', gap: 3 },
    stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    stepLabel: { fontSize: 9, color: '#475569', fontWeight: '700' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#1E293B', marginHorizontal: 4, marginBottom: 12 },

    mapContainer: { flex: 1, backgroundColor: '#0F172A', position: 'relative' },
    mapLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    mapLoadingText: { color: '#64748B', fontSize: 13 },
    mapPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    mapPlaceholderText: { color: '#475569', fontSize: 12, textAlign: 'center', paddingHorizontal: 40 },

    driverBlipContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverBlipRing: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        opacity: 0.5,
    },
    driverBlip: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
    },

    gpsBadge: {
        position: 'absolute',
        top: 92, // below the maneuver banner
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(11,15,23,0.88)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    gpsLiveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#00C96B',
    },
    gpsBadgeText: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

    fareBadge: {
        position: 'absolute',
        top: 92, // below the maneuver banner
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    fareBadgeText: { color: '#000', fontSize: 14, fontWeight: '900' },

    bottomSheet: {
        backgroundColor: '#0B0F17',
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        padding: 16,
        paddingBottom: 28,
        gap: 12,
    },

    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    locationDot: { width: 10, height: 10, borderRadius: 5 },
    locationPillText: { flex: 1, color: '#CBD5E1', fontSize: 13, fontWeight: '600' },

    otpContainer: { gap: 8 },
    otpHintBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0F172A',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    otpHintLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
    otpHintCode: { fontSize: 18, fontWeight: '900', letterSpacing: 4 },
    otpInputLabel: { color: '#64748B', fontSize: 11, fontWeight: '600' },
    otpInput: {
        height: 56,
        borderRadius: 14,
        borderWidth: 2,
        backgroundColor: '#1E293B',
        color: '#F1F5F9',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 12,
        textAlign: 'center',
    },
    otpErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    otpErrorText: { color: '#EF4444', fontSize: 11, fontWeight: '600' },

    ctaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    callBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    primaryCta: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryCtaText: { color: '#000', fontWeight: '900', fontSize: 15 },
    maneuverBanner: {
        position: 'absolute',
        top: 12,
        left: 14,
        right: 14,
        zIndex: 20,
        backgroundColor: '#0F172AEE',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    maneuverIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#00C96B1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    maneuverDistance: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    maneuverInstruction: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 1,
    },
    voiceMuteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
