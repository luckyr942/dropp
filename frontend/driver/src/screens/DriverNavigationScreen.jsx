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
    Dimensions,
    ActivityIndicator,
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
import { MAPBOX_TOKEN, extractLocationDetails } from '../../../shared/utils/mapboxHelper';
import { API_BASE } from '../../../shared/utils/apiConfig';

const { width: SCREEN_W } = Dimensions.get('window');
const DRIVER_ID_KEY = '@dropp_driver_id';
const DRIVER_PROFILE_KEY = '@dropp_driver_profile';
const STEPS = ['PICKUP', 'EN_ROUTE', 'VERIFY_OTP'];

function calcBearing(lat1, lon1, lat2, lon2) {
    const toRad = d => (d * Math.PI) / 180;
    const toDeg = r => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);
}

function buildLiveMapUrl(driverCoords, puDetails, dropDetails, routeGeometry, step) {
    if (!MAPBOX_TOKEN) return null;
    const W = Math.min(800, Math.round(SCREEN_W * 2));
    const H = 600;
    const PADDING = '60,60,260,60';

    // Normalize coordinates - intelligently fallback to Amritsar/Punjab or Delhi
    const isAmritsar = (puDetails?.full || dropDetails?.full || '').toLowerCase().includes('amritsar');
    const isPunjab = isAmritsar || (puDetails?.full || dropDetails?.full || '').toLowerCase().includes('lpu') || (puDetails?.full || dropDetails?.full || '').toLowerCase().includes('phagwara');

    const defaultPuLng = isPunjab ? 75.7037 : 77.0492;
    const defaultPuLat = isPunjab ? 31.2536 : 28.5427;
    const defaultDropLng = isPunjab ? 74.8723 : 77.2199;
    const defaultDropLat = isPunjab ? 31.6340 : 28.6338;

    const pLng = Number(puDetails?.lng) || defaultPuLng;
    const pLat = Number(puDetails?.lat) || defaultPuLat;
    const dropLng = Number(dropDetails?.lng) || defaultDropLng;
    const dropLat = Number(dropDetails?.lat) || defaultDropLat;

    // Guard: Check if live device GPS is within India bounds (lon 65-98, lat 8-38)
    // If simulator reports California (-122°), snap driver along route so map NEVER centers in the Pacific Ocean!
    const isGpsInIndia = driverCoords?.lng && driverCoords.lng > 65 && driverCoords.lng < 98 && driverCoords.lat > 8 && driverCoords.lat < 38;
    const dLng = isGpsInIndia ? driverCoords.lng : (step === 'PICKUP' ? pLng - 0.004 : pLng + (dropLng - pLng) * 0.35);
    const dLat = isGpsInIndia ? driverCoords.lat : (step === 'PICKUP' ? pLat - 0.004 : pLat + (dropLat - pLat) * 0.35);

    const features = [];

    let coords = routeGeometry?.coordinates;
    if (!coords || !Array.isArray(coords) || coords.length < 2) {
        coords = [
            [pLng, pLat],
            [pLng + (dropLng - pLng) * 0.3, pLat + (dropLat - pLat) * 0.35],
            [pLng + (dropLng - pLng) * 0.7, pLat + (dropLat - pLat) * 0.65],
            [dropLng, dropLat],
        ];
    }

    if (Array.isArray(coords) && coords.length > 1) {
        const step2 = Math.max(1, Math.floor(coords.length / 40));
        const sampled = [];
        for (let i = 0; i < coords.length; i += step2) {
            sampled.push([+coords[i][0].toFixed(5), +coords[i][1].toFixed(5)]);
        }
        const last = coords[coords.length - 1];
        if (sampled[sampled.length - 1]?.[0] !== +last[0].toFixed(5)) {
            sampled.push([+last[0].toFixed(5), +last[1].toFixed(5)]);
        }
        features.push({
            type: 'Feature',
            properties: { stroke: '#00C96B', 'stroke-width': 5, 'stroke-opacity': 0.9 },
            geometry: { type: 'LineString', coordinates: sampled },
        });
    }

    if (step === 'PICKUP') {
        features.push({
            type: 'Feature',
            properties: { 'marker-color': '00C96B', 'marker-size': 'medium' },
            geometry: { type: 'Point', coordinates: [pLng, pLat] },
        });
    }

    features.push({
        type: 'Feature',
        properties: { 'marker-color': 'FF3B30', 'marker-size': 'large' },
        geometry: { type: 'Point', coordinates: [dropLng, dropLat] },
    });

    features.push({
        type: 'Feature',
        properties: { 'marker-color': 'F59E0B', 'marker-size': 'medium' },
        geometry: { type: 'Point', coordinates: [dLng, dLat] },
    });

    const geojson = { type: 'FeatureCollection', features };
    const enc = encodeURIComponent(JSON.stringify(geojson));
    return `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/static/geojson(${enc})/auto/${W}x${H}@2x?padding=${PADDING}&access_token=${MAPBOX_TOKEN}`;
}

export default function DriverNavigationScreen({ onNavigate }) {
    const { theme } = useTheme();
    const {
        deliveryOtp,
        pickupLocation,
        destination,
        routeGeometry,
        fare,
        serviceType,
        rideId,
        resetTripState,
    } = useRideStore();

    const [step, setStep] = useState('PICKUP');
    const [enteredOtp, setEnteredOtp] = useState('');
    const [otpError, setOtpError] = useState(false);
    const [driverId, setDriverId] = useState(null);
    const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
    const [currentCoords, setCurrentCoords] = useState(null);
    const [mapUrl, setMapUrl] = useState(null);
    const [mapLoading, setMapLoading] = useState(true);
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

    const stepIndex = STEPS.indexOf(step);
    const cleanFare = String(fare || '').replace('₹', '').trim() || (isFood ? '65' : isParcel ? '90' : isShop ? '80' : '180');

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
                let id = await AsyncStorage.getItem(DRIVER_ID_KEY);
                if (id) {
                    try {
                        const r = await fetch(`${API_BASE}/api/drivers/${id}`);
                        if (r.status === 404) id = null;
                    } catch (_) {}
                }
                if (!id) {
                    const r = await fetch(`${API_BASE}/api/drivers`);
                    const j = await r.json();
                    if (j.success && j.data?.length > 0) {
                        const picked = j.data.find(d => d.name === 'Lucky' || d.name === 'Rome') || j.data[0];
                        id = picked._id;
                        await Promise.all([
                            AsyncStorage.setItem(DRIVER_ID_KEY, id),
                            AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(picked)),
                        ]);
                    }
                }
                if (id) setDriverId(id);
            } catch (err) {
                console.warn('[DriverNav] Failed to load driverId:', err.message);
            }
        }
        loadDriver();
    }, []);

    // Build live map URL when coords or step changes
    useEffect(() => {
        const url = buildLiveMapUrl(currentCoords, puDetails, dropDetails, routeGeometry, step);
        if (url) {
            setMapUrl(url);
        }
    }, [currentCoords, step]);

    // Spoken turn-by-turn guidance when navigation step changes
    useEffect(() => {
        let text = '';
        if (step === 'PICKUP') {
            text = `Heading to pickup at ${puDetails.label || 'customer location'}.`;
        } else if (step === 'EN_ROUTE') {
            text = `En route to ${dropDetails.label || 'destination'}. Continue on Grand Trunk Road.`;
        } else if (step === 'VERIFY_OTP') {
            text = 'Arrived at dropoff point. Please collect customer OTP.';
        }
        if (text && Speech?.speak) {
            Speech.speak(text, { language: 'en-IN', rate: 0.95 });
        }
    }, [step]);

    // Initial map on mount
    useEffect(() => {
        const url = buildLiveMapUrl(null, puDetails, dropDetails, routeGeometry, 'PICKUP');
        setMapUrl(url);
        setMapLoading(true);
    }, []);

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
                setCurrentCoords({ lat, lng });
                await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat, lng, bearing: heading ?? 0 }),
                });
            } catch (err) {
                console.warn('[DriverNav] GPS push error:', err.message);
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
            : [
                [puDetails.lng || 77.0492, puDetails.lat || 28.5427],
                [(((puDetails.lng || 77.0492) + (dropDetails.lng || 77.2199)) / 2),
                 (((puDetails.lat || 28.5427) + (dropDetails.lat || 28.6338)) / 2)],
                [dropDetails.lng || 77.2199, dropDetails.lat || 28.6338],
            ];

        let index = 0;
        const intervalId = setInterval(async () => {
            if (index >= pathPoints.length) {
                setIsSimulatingDrive(false);
                return;
            }
            const [lng, lat] = pathPoints[index];
            const [nextLng, nextLat] = pathPoints[Math.min(index + 1, pathPoints.length - 1)];
            const bearing = calcBearing(lat, lng, nextLat, nextLng);
            setCurrentCoords({ lat, lng });
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

    const handleNextStep = async () => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            if (step === 'PICKUP') {
                setStep('EN_ROUTE');
                if (driverId && rideId) {
                    fetch(`${API_BASE}/api/drivers/${driverId}/task/${rideId}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'in_progress' }),
                    }).catch(() => {});
                }
                Alert.alert(
                    isFood ? 'Order Picked Up' : isParcel ? 'Parcel Collected' : isShop ? 'Items Collected' : 'Passenger Onboard',
                    isFood ? 'Proceed to customer location.' : isParcel ? 'Proceed to recipient.' : isShop ? 'Proceed to customer.' : 'Proceed to destination.',
                );
            } else if (step === 'EN_ROUTE') {
                setStep('VERIFY_OTP');
                if (driverId && rideId) {
                    fetch(`${API_BASE}/api/drivers/${driverId}/task/${rideId}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'arrived' }),
                    }).catch(() => {});
                }
            } else if (step === 'VERIFY_OTP') {
                const correctOtp = String(deliveryOtp || '4821').trim();
                const entered = enteredOtp.trim();
                if (entered !== correctOtp) {
                    setOtpError(true);
                    setIsBusy(false);
                    return;
                }
                if (driverId && rideId) {
                    fetch(`${API_BASE}/api/drivers/${driverId}/task/${rideId}/status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'completed', otp: entered }),
                    }).catch(() => {});
                }
                Alert.alert(
                    'Task Completed!',
                    isFood ? `Food delivered! Fare: Rs.${cleanFare}` : isParcel ? `Parcel delivered! Fare: Rs.${cleanFare}` : isShop ? `Delivery done! Fare: Rs.${cleanFare}` : `Ride complete! Fare: Rs.${cleanFare}`,
                );
                resetTripState();
                if (onNavigate) onNavigate('DriverHome');
            }
        } catch (err) {
            console.error('[DriverNav] Step error:', err.message);
        } finally {
            setIsBusy(false);
        }
    };

    const headerTitle =
        step === 'PICKUP'
            ? (isFood ? 'Heading to Restaurant' : isParcel ? 'Heading to Sender' : isShop ? 'Heading to Store' : 'Heading to Pickup')
        : step === 'EN_ROUTE'
            ? (isFood ? 'Delivering to Customer' : isParcel ? 'Delivering to Recipient' : isShop ? 'Delivering to Customer' : 'En Route to Drop')
        : (isFood ? 'Verify & Handover Food' : isParcel ? 'Verify & Handover Parcel' : isShop ? 'Verify & Handover Items' : 'Verify Arrival');

    const buttonLabel =
        step === 'PICKUP'
            ? (isFood ? 'Arrived at Restaurant' : isParcel ? 'Arrived at Sender' : isShop ? 'Arrived at Store' : 'Arrived at Pickup')
        : step === 'EN_ROUTE'
            ? (isFood ? 'Arrived at Customer' : isParcel ? 'Arrived at Recipient' : isShop ? 'Arrived at Customer' : 'Arrived at Dropoff')
        : (isFood ? 'Complete Food Delivery' : isParcel ? 'Complete Parcel Delivery' : isShop ? 'Complete Store Delivery' : 'Complete Ride');

    const stepDefs = [
        { key: 'PICKUP', icon: pillarIcon, label: isFood ? 'Restaurant' : isParcel ? 'Sender' : isShop ? 'Store' : 'Pickup' },
        { key: 'EN_ROUTE', icon: 'navigate', label: 'En Route' },
        { key: 'VERIFY_OTP', icon: 'checkmark-done-circle', label: 'Verify' },
    ];

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
                        {step === 'PICKUP' ? (puDetails.label || 'Pickup') : (dropDetails.label || 'Destination')}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.simBtn, isSimulatingDrive && { backgroundColor: '#00C96B', borderColor: '#00C96B' }]}
                    onPress={() => setIsSimulatingDrive(prev => !prev)}
                >
                    <Ionicons name={isSimulatingDrive ? 'pause' : 'play'} size={12} color={isSimulatingDrive ? '#000' : '#FFF'} />
                    <Text style={[styles.simBtnText, isSimulatingDrive && { color: '#000' }]}>
                        {isSimulatingDrive ? 'Stop' : 'Sim'}
                    </Text>
                </TouchableOpacity>
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
                            {i < 2 && (
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
                            name={step === 'PICKUP' ? 'arrow-up-circle' : step === 'EN_ROUTE' ? 'navigate-circle' : 'checkmark-circle'}
                            size={26}
                            color="#00C96B"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.maneuverDistance}>
                            {step === 'PICKUP' ? 'In 350 m' : step === 'EN_ROUTE' ? 'In 900 m' : 'Arrived'}
                        </Text>
                        <Text style={styles.maneuverInstruction} numberOfLines={1}>
                            {step === 'PICKUP'
                                ? `Head to ${puDetails.label || 'Pickup Point'}`
                                : step === 'EN_ROUTE'
                                ? `Continue on Grand Trunk Rd to ${dropDetails.label || 'Destination'}`
                                : 'Collect 4-digit code from customer'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.voiceMuteBtn}
                        onPress={() => {
                            const spoken = step === 'PICKUP'
                                ? `Heading to pickup at ${puDetails.label}`
                                : step === 'EN_ROUTE'
                                ? `Continue on Grand Trunk Road towards ${dropDetails.label}`
                                : 'Arrived at dropoff point';
                            if (Speech?.speak) {
                                Speech.speak(spoken, { language: 'en-IN', rate: 0.95 });
                            }
                        }}
                    >
                        <Ionicons name="volume-high" size={20} color="#00C96B" />
                    </TouchableOpacity>
                </View>

                {mapUrl ? (
                    <>
                        <Image
                            source={{ uri: mapUrl }}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode="cover"
                            onLoad={() => setMapLoading(false)}
                            onError={() => setMapLoading(false)}
                        />
                        {mapLoading && (
                            <View style={styles.mapLoadingOverlay}>
                                <ActivityIndicator size="large" color="#00C96B" />
                                <Text style={styles.mapLoadingText}>Loading map...</Text>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <Ionicons name="map" size={48} color="#334155" />
                        <Text style={styles.mapPlaceholderText}>Set EXPO_PUBLIC_MAPBOX_TOKEN to enable map</Text>
                    </View>
                )}

                {/* Animated Driver Blip */}
                <View style={styles.driverBlipContainer} pointerEvents="none">
                    <Animated.View style={[
                        styles.driverBlipRing,
                        { transform: [{ scale: pulseAnim }], borderColor: pillarColor }
                    ]} />
                    <View style={[styles.driverBlip, { backgroundColor: pillarColor }]}>
                        <Ionicons name="navigate" size={16} color="#000" />
                    </View>
                </View>

                {/* GPS Badge */}
                <View style={styles.gpsBadge}>
                    <View style={[styles.gpsLiveDot, isSimulatingDrive && { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.gpsBadgeText}>
                        {isSimulatingDrive ? 'SIMULATING' : currentCoords ? 'LIVE GPS' : 'GPS...'}
                    </Text>
                </View>

                {/* Fare Badge */}
                <View style={[styles.fareBadge, { backgroundColor: pillarColor }]}>
                    <Text style={styles.fareBadgeText}>Rs.{cleanFare}</Text>
                </View>
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.locationPill}>
                    <View style={[styles.locationDot, { backgroundColor: step === 'PICKUP' ? '#00C96B' : '#FF3B30' }]} />
                    <Text style={styles.locationPillText} numberOfLines={1}>
                        {step === 'PICKUP'
                            ? (puDetails.full || puDetails.label || 'Pickup')
                            : (dropDetails.full || dropDetails.label || 'Drop')}
                    </Text>
                </View>

                {step === 'VERIFY_OTP' && (
                    <View style={styles.otpContainer}>
                        <View style={[styles.otpHintBanner, { borderColor: pillarColor + '55' }]}>
                            <Ionicons name="key" size={15} color={pillarColor} />
                            <Text style={styles.otpHintLabel}>Customer Code: </Text>
                            <Text style={[styles.otpHintCode, { color: pillarColor }]}>{deliveryOtp || '4821'}</Text>
                        </View>
                        <Text style={styles.otpInputLabel}>Enter the 4-digit code from customer</Text>
                        <TextInput
                            style={[styles.otpInput, { borderColor: otpError ? '#EF4444' : pillarColor }]}
                            placeholder="· · · ·"
                            placeholderTextColor="#334155"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={enteredOtp}
                            onChangeText={t => { setEnteredOtp(t); setOtpError(false); }}
                            autoFocus
                        />
                        {otpError && (
                            <View style={styles.otpErrorRow}>
                                <Ionicons name="close-circle" size={13} color="#EF4444" />
                                <Text style={styles.otpErrorText}>Wrong code. Code: {deliveryOtp || '4821'}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.ctaRow}>
                    <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Alert.alert('Calling Customer', 'Connecting via secure masked line...')}
                    >
                        <Ionicons name="call" size={22} color="#00C96B" />
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
        top: 12,
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
        top: 12,
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
