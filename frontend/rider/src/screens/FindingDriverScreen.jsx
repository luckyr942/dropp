import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
    Easing,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

export default function FindingDriverScreen({ onNavigate, onCancel }) {
    const { theme, isDark } = useTheme();
    const { pickupLocation, destination, fare, serviceType, setRideStatus, resetTripState } = useRideStore();

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

        // Auto-match after 3.5 seconds to simulate real-time dispatch matching
        const timer = setTimeout(() => {
            setRideStatus('DRIVER_ASSIGNED');
            if (onNavigate) {
                onNavigate('TripTracking');
            }
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    const handleCancel = () => {
        resetTripState(); // Resets pickup, dropoff, and rideStatus to clean IDLE state
        if (onCancel) {
            onCancel();
        } else if (onNavigate) {
            onNavigate('Home');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Radar Animation Hub */}
            <View style={styles.radarContainer}>
                {[pulse1, pulse2, pulse3].map((pulse, idx) => {
                    const scale = pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 2.4],
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
                                    borderColor: theme.primaryGreen,
                                    transform: [{ scale }],
                                    opacity,
                                },
                            ]}
                        />
                    );
                })}

                <View style={[styles.centerPin, { backgroundColor: theme.primaryGreen }]}>
                    <Ionicons
                        name={serviceType === 'package' ? 'cube' : 'car-sport'}
                        size={32}
                        color="#000000"
                    />
                </View>
            </View>

            {/* Status Messages */}
            <View style={styles.statusBox}>
                <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                    {serviceType === 'package' ? 'Finding Nearby Courier...' : 'Finding Your Dropp Driver...'}
                </Text>
                <Text style={[styles.statusSub, { color: theme.textSecondary }]}>
                    Scanning 14 available drivers in your 3 km radius
                </Text>
            </View>

            {/* Trip Details Card */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.locRow}>
                    <View style={[styles.dot, { backgroundColor: theme.primaryGreen }]} />
                    <Text style={[styles.locText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {pickupLocation || 'Current Location'}
                    </Text>
                </View>
                <View style={[styles.line, { backgroundColor: theme.inputSeparator }]} />
                <View style={styles.locRow}>
                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.locText, { color: theme.textPrimary }]} numberOfLines={1}>
                        {destination || 'Destination'}
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel, { color: theme.textSecondary }]}>Estimated Fare</Text>
                    <Text style={[styles.fareValue, { color: theme.primaryGreen }]}>${fare.toFixed(2)}</Text>
                </View>
            </View>

            {/* Cancel Search CTA */}
            <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.inputSeparator }]}
                onPress={handleCancel}
                activeOpacity={0.8}
            >
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.cancelText}>Cancel Search</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    radarContainer: {
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    pulseRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
    },
    centerPin: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#22C55E',
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    statusBox: {
        alignItems: 'center',
        marginVertical: 10,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    statusSub: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
    },
    card: {
        width: '100%',
        borderRadius: 20,
        padding: 16,
    },
    locRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    line: {
        width: 2,
        height: 14,
        marginLeft: 4,
        marginVertical: 2,
    },
    locText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    fareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fareLabel: { fontSize: 13, fontWeight: '500' },
    fareValue: { fontSize: 18, fontWeight: '800' },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        width: '100%',
        borderRadius: 14,
        borderWidth: 1,
        gap: 8,
    },
    cancelText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 15,
    },
});
