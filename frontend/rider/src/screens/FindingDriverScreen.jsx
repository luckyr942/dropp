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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';
import { buildMapboxRouteUrl, extractLocationDetails } from '../../../shared/utils/mapboxHelper';

export default function FindingDriverScreen({ onNavigate, onCancel }) {
    const {
        pickupLocation, destination, fare, selectedVehicleTier,
        routeGeometry, setRideStatus, resetTripState,
    } = useRideStore();

    const pickupDetails = extractLocationDetails(pickupLocation, 'Pickup');
    const dropDetails = extractLocationDetails(destination, 'Destination');

    const [statusStep, setStatusStep] = useState(0);

    const mapUrl = buildMapboxRouteUrl(routeGeometry, pickupLocation, destination, {
        padding: '100,100,260,100',
    });

    // Radar pulse animation values
    const pulse1 = useRef(new Animated.Value(0)).current;
    const pulse2 = useRef(new Animated.Value(0)).current;
    const pulse3 = useRef(new Animated.Value(0)).current;

    const animatePulse = (anim, delay) => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 2200,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    useEffect(() => {
        animatePulse(pulse1, 0);
        animatePulse(pulse2, 700);
        animatePulse(pulse3, 1400);

        const stepTimer1 = setTimeout(() => setStatusStep(1), 1500);
        const stepTimer2 = setTimeout(() => setStatusStep(2), 2800);

        // Auto-match after 3.8 seconds to simulate real-time dispatch matching
        const timer = setTimeout(() => {
            setRideStatus('DRIVER_ASSIGNED');
            if (onNavigate) {
                onNavigate('TripTracking');
            }
        }, 3800);

        return () => {
            clearTimeout(stepTimer1);
            clearTimeout(stepTimer2);
            clearTimeout(timer);
        };
    }, []);

    const handleCancel = () => {
        resetTripState();
        if (onCancel) {
            onCancel();
        } else if (onNavigate) {
            onNavigate('Home');
        }
    };

    const statusTexts = [
        { title: 'Connecting to nearby drivers...', sub: 'Scanning 8 drivers within a 3 km radius' },
        { title: 'Sending ride request...', sub: 'Awaiting driver acceptance' },
        { title: 'Driver found! Assigning vehicle...', sub: 'Preparing live trip route' },
    ];

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Background Mapbox Map */}
            <View style={styles.mapBackground}>
                {mapUrl ? (
                    <Image source={{ uri: mapUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#EAF5EF' }]} />
                )}
                {/* Translucent overlay */}
                <View style={styles.mapDimmer} />
            </View>

            <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
                {/* Header Back / Cancel */}
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.topBackBtn} onPress={handleCancel} activeOpacity={0.8}>
                        <Ionicons name="close" size={20} color="#111820" />
                    </TouchableOpacity>
                    <View style={styles.liveTag}>
                        <View style={styles.liveGreenDot} />
                        <Text style={styles.liveTagText}>LIVE DISPATCH</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Radar Animation Hub */}
                <View style={styles.radarContainer}>
                    {[pulse1, pulse2, pulse3].map((pulse, idx) => {
                        const scale = pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 2.5],
                        });
                        const opacity = pulse.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.6, 0.3, 0],
                        });
                        return (
                            <Animated.View
                                key={idx}
                                style={[
                                    styles.pulseRing,
                                    {
                                        borderColor: '#00C96B',
                                        transform: [{ scale }],
                                        opacity,
                                    },
                                ]}
                            />
                        );
                    })}

                    <View style={styles.centerPin}>
                        <MaterialCommunityIcons name="car-side" size={32} color="#FFF" />
                    </View>
                </View>

                {/* Status Messages */}
                <View style={styles.statusBox}>
                    <Text style={styles.statusTitle}>
                        {statusTexts[statusStep].title}
                    </Text>
                    <Text style={styles.statusSub}>
                        {statusTexts[statusStep].sub}
                    </Text>
                </View>

                {/* Trip Details Card */}
                <View style={styles.card}>
                    <View style={styles.locRow}>
                        <View style={styles.greenDot} />
                        <Text style={styles.locText} numberOfLines={1}>
                            {pickupDetails.label}
                        </Text>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.locRow}>
                        <View style={styles.redDot} />
                        <Text style={styles.locText} numberOfLines={1}>
                            {dropDetails.label}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.fareRow}>
                        <View>
                            <Text style={styles.fareLabel}>Vehicle & Fare</Text>
                            <Text style={styles.tierName}>{selectedVehicleTier ? selectedVehicleTier.toUpperCase() : 'STANDARD'}</Text>
                        </View>
                        <Text style={styles.fareValue}>₹{fare ? Math.round(fare) : 129}</Text>
                    </View>
                </View>

                {/* Cancel CTA */}
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                >
                    <Ionicons name="close-circle-outline" size={19} color="#FF3B30" />
                    <Text style={styles.cancelText}>Cancel Request</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0F1720' },
    mapBackground: { ...StyleSheet.absoluteFillObject },
    mapDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 32, 0.72)' },

    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    },
    topBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    topBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 4,
    },
    liveTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    liveGreenDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#00C96B' },
    liveTagText: { fontSize: 11, fontWeight: '800', color: '#111820', letterSpacing: 0.5 },

    radarContainer: {
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
    },
    centerPin: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#00C96B',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#00C96B',
        shadowOpacity: 0.55,
        shadowRadius: 14,
    },

    statusBox: {
        alignItems: 'center',
        marginVertical: 10,
        paddingHorizontal: 20,
    },
    statusTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFF',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    statusSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginTop: 6,
    },

    card: {
        width: '100%',
        borderRadius: 20,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.97)',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    locRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C96B' },
    redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
    line: {
        width: 2,
        height: 14,
        marginLeft: 4,
        marginVertical: 2,
        backgroundColor: '#D1D5DB',
    },
    locText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111820',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    fareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fareLabel: { fontSize: 11.5, color: '#6B7280', fontWeight: '600' },
    tierName: { fontSize: 13.5, fontWeight: '800', color: '#111820', marginTop: 1 },
    fareValue: { fontSize: 20, fontWeight: '900', color: '#00C96B' },

    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        width: '100%',
        borderRadius: 16,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.3)',
        gap: 8,
    },
    cancelText: {
        color: '#FF3B30',
        fontWeight: '800',
        fontSize: 15,
    },
});
