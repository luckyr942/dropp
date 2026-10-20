import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    Platform,
    StatusBar,
    Animated,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import { buildMapboxRouteUrl, extractLocationDetails } from '../../../shared/utils/mapboxHelper';

export default function TripTrackingScreen({ onBack, onNavigate }) {
    const {
        driver, pickupLocation, destination, deliveryOtp,
        routeGeometry, distanceKm, durationMins, resetTripState,
    } = useRideStore();

    const [tripStage, setTripStage] = useState('EN_ROUTE'); // 'EN_ROUTE' | 'ARRIVED' | 'ON_TRIP'

    const pickupDetails = extractLocationDetails(pickupLocation, 'Pickup Location');
    const dropDetails = extractLocationDetails(destination, 'Destination');

    const mapUrl = buildMapboxRouteUrl(routeGeometry, pickupLocation, destination, {
        padding: '120,100,280,100',
    });

    // Driver pin pulse animation
    const pinPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pinPulse, {
                    toValue: 1.18,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pinPulse, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Simulate driver arriving after 6 seconds
        const arrivedTimer = setTimeout(() => {
            setTripStage('ARRIVED');
        }, 6000);

        return () => clearTimeout(arrivedTimer);
    }, []);

    const handleEndTrip = () => {
        resetTripState();
        if (onNavigate) {
            onNavigate('Home');
        } else if (onBack) {
            onBack();
        }
    };

    const handleCall = () => {
        Alert.alert('Calling Driver', `Dialing ${driver?.name || 'Driver'} at ${driver?.phone || '+91 98765 43210'}`);
    };

    const handleChat = () => {
        Alert.alert('Driver Chat', `Chat with ${driver?.name || 'Driver'} is active: "I have reached the pickup location!"`);
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Real Mapbox Route Map */}
            <View style={styles.mapCanvas}>
                {mapUrl ? (
                    <Image source={{ uri: mapUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#EAF5EF' }]} />
                )}

                {/* Animated Driver Marker */}
                <Animated.View style={[styles.driverMarker, { transform: [{ scale: pinPulse }] }]}>
                    <View style={styles.driverDotOuter}>
                        <MaterialCommunityIcons name="car-side" size={18} color="#FFF" />
                    </View>
                </Animated.View>
            </View>

            {/* Floating Top Bar */}
            <SafeAreaView edges={['top']} style={styles.topMapHeader} pointerEvents="box-none">
                <TouchableOpacity
                    style={styles.mapHeaderIcon}
                    onPress={handleEndTrip}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chevron-back" size={22} color="#111820" />
                </TouchableOpacity>

                <View style={styles.statusBadge}>
                    <View style={[styles.greenPulse, tripStage === 'ARRIVED' && { backgroundColor: '#FF9500' }]} />
                    <Text style={styles.statusBadgeText}>
                        {tripStage === 'EN_ROUTE' ? 'Driver on the way' : tripStage === 'ARRIVED' ? 'Driver Arrived!' : 'On the Trip'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.mapHeaderIcon}
                    onPress={() => Alert.alert('Dropp Safety Guard', '24x7 Safety assistance, live GPS sharing & emergency helpline active.')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="shield-checkmark" size={20} color="#00C96B" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Bottom Sheet Details Container */}
            <View style={styles.bottomCard}>
                <View style={styles.dragHandle} />

                {/* ETA & OTP Banner */}
                <View style={styles.etaRow}>
                    <View>
                        <Text style={styles.etaTitle}>
                            {tripStage === 'ARRIVED' ? 'Driver is waiting' : `Arriving in ${driver.etaMinutes || 4} mins`}
                        </Text>
                        <Text style={styles.etaSub}>
                            {distanceKm ? `${distanceKm} km trip · Road route active` : '1.8 km away'}
                        </Text>
                    </View>

                    {/* Recipient Verification OTP */}
                    <View style={styles.otpBadge}>
                        <Text style={styles.otpLabel}>START OTP</Text>
                        <Text style={styles.otpCode}>{deliveryOtp || '4821'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Driver Profile & Vehicle */}
                <View style={styles.driverRow}>
                    <Image
                        source={{ uri: driver.avatar }}
                        style={styles.avatar}
                    />
                    <View style={styles.driverMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.driverName}>{driver.name}</Text>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={11} color="#FFB800" />
                                <Text style={styles.ratingText}>{driver.rating}</Text>
                            </View>
                        </View>
                        <Text style={styles.vehicleText}>{driver.vehicle}</Text>
                        <Text style={styles.plateBadge}>{driver.plate}</Text>
                    </View>

                    {/* Contact Action Buttons */}
                    <View style={styles.actionCol}>
                        <TouchableOpacity
                            style={styles.actionCircleGreen}
                            onPress={handleCall}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={18} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCircleGrey}
                            onPress={handleChat}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chatbubble-ellipses" size={18} color="#111820" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Ride Address Summary */}
                <View style={styles.addressBox}>
                    <View style={styles.locRow}>
                        <View style={styles.pickupDot} />
                        <Text style={styles.addressText} numberOfLines={1}>
                            {pickupDetails.label}
                        </Text>
                    </View>
                    <View style={styles.locRow}>
                        <View style={styles.dropDot} />
                        <Text style={styles.addressText} numberOfLines={1}>
                            {dropDetails.label}
                        </Text>
                    </View>
                </View>

                {/* Cancel or Complete Button */}
                <TouchableOpacity
                    style={styles.finishBtn}
                    onPress={handleEndTrip}
                    activeOpacity={0.85}
                >
                    <Text style={styles.finishBtnText}>End / Cancel Ride</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#D8F0E5' },
    mapCanvas: { flex: 1, position: 'relative' },

    topMapHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        zIndex: 10,
    },
    mapHeaderIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 5,
        elevation: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 22,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    greenPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C96B' },
    statusBadgeText: { fontSize: 13, fontWeight: '800', color: '#111820' },

    driverMarker: {
        position: 'absolute',
        top: '40%',
        left: '46%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverDotOuter: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#00C96B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: '#00C96B',
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
    },

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
        shadowOpacity: 0.14,
        shadowRadius: 14,
        elevation: 18,
    },
    dragHandle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D8DDE2',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 14,
    },

    etaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    etaTitle: { fontSize: 18, fontWeight: '900', color: '#111820' },
    etaSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    otpBadge: {
        alignItems: 'center',
        backgroundColor: '#E8F8EF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#B7EACD',
    },
    otpLabel: { fontSize: 9.5, fontWeight: '800', color: '#008A45', letterSpacing: 0.5 },
    otpCode: { fontSize: 18, fontWeight: '900', color: '#008A45', letterSpacing: 2 },

    divider: { height: 1, backgroundColor: '#F0F2F5', marginVertical: 12 },

    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E5E7EB' },
    driverMeta: { flex: 1 },
    driverName: { fontSize: 15, fontWeight: '800', color: '#111820' },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
    vehicleText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    plateBadge: {
        fontSize: 11,
        fontWeight: '800',
        color: '#111820',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 4,
    },

    actionCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionCircleGreen: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#00C96B',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00C96B',
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 3,
    },
    actionCircleGrey: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    addressBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 12,
        gap: 8,
        marginBottom: 14,
    },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pickupDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C96B' },
    dropDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
    addressText: { fontSize: 12.5, fontWeight: '700', color: '#111820', flex: 1 },

    finishBtn: {
        height: 46,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    finishBtnText: { fontSize: 13.5, fontWeight: '700', color: '#6B7280' },
});
