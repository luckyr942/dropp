import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

export default function TripTrackingScreen({ onBack, onNavigate }) {
    const { theme, isDark } = useTheme();
    const { driver, pickupLocation, destination, deliveryOtp, resetTripState } = useRideStore();
    const [tripStage, setTripStage] = useState('EN_ROUTE'); // 'EN_ROUTE' | 'ARRIVED' | 'ON_TRIP'

    const handleEndTrip = () => {
        resetTripState(); // Resets pickup, dropoff, and rideStatus to clean IDLE state
        if (onNavigate) {
            onNavigate('Home');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Simulated Live Map Canvas */}
            <View style={styles.mapCanvas}>
                {/* Map Grid Pattern simulation */}
                <View style={styles.mapGrid}>
                    <View style={[styles.gridRoadHorizontal, { backgroundColor: theme.inputSeparator }]} />
                    <View style={[styles.gridRoadVertical, { backgroundColor: theme.inputSeparator }]} />
                </View>

                {/* Header Floating Bar */}
                <View style={styles.topMapHeader}>
                    <TouchableOpacity
                        style={[styles.mapHeaderIcon, { backgroundColor: theme.surface }]}
                        onPress={handleEndTrip}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>

                    <View style={[styles.statusBadge, { backgroundColor: theme.surface }]}>
                        <View style={[styles.greenPulse, { backgroundColor: theme.primaryGreen }]} />
                        <Text style={[styles.statusBadgeText, { color: theme.textPrimary }]}>
                            {tripStage === 'EN_ROUTE' ? 'Driver on the way' : tripStage === 'ARRIVED' ? 'Driver Arrived!' : 'On the Trip'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.mapHeaderIcon, { backgroundColor: theme.surface }]}
                        onPress={() => alert('Safety Center & Emergency Contact')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="shield-checkmark" size={20} color={theme.primaryGreen} />
                    </TouchableOpacity>
                </View>

                {/* Driver Location Marker */}
                <View style={[styles.driverMarker, { backgroundColor: theme.primaryGreen }]}>
                    <Ionicons name="car-sport" size={20} color="#000" />
                </View>

                {/* Pickup & Destination Pins */}
                <View style={styles.pickupPin}>
                    <Ionicons name="location" size={28} color={theme.primaryGreen} />
                </View>

                <View style={styles.destinationPin}>
                    <Ionicons name="flag" size={24} color="#EF4444" />
                </View>
            </View>

            {/* Bottom Sheet Details Container */}
            <View style={[styles.bottomCard, { backgroundColor: theme.surface }]}>
                <View style={styles.dragHandle} />

                {/* ETA & OTP Banner */}
                <View style={styles.etaRow}>
                    <View>
                        <Text style={[styles.etaTitle, { color: theme.textPrimary }]}>Arriving in {driver.etaMinutes} mins</Text>
                        <Text style={[styles.etaSub, { color: theme.textSecondary }]}>Distance: 1.8 km away</Text>
                    </View>

                    {/* Recipient Verification OTP */}
                    <View style={[styles.otpBadge, { backgroundColor: theme.tierCardActiveBg, borderColor: theme.primaryGreen }]}>
                        <Text style={[styles.otpLabel, { color: theme.textSecondary }]}>DELIVERY OTP</Text>
                        <Text style={[styles.otpCode, { color: theme.primaryGreen }]}>{deliveryOtp}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                {/* Driver Profile & Vehicle */}
                <View style={styles.driverRow}>
                    <Image
                        source={{ uri: driver.avatar }}
                        style={styles.avatar}
                    />
                    <View style={styles.driverMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.driverName, { color: theme.textPrimary }]}>{driver.name}</Text>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color={theme.starGold} />
                                <Text style={styles.ratingText}>{driver.rating}</Text>
                            </View>
                        </View>
                        <Text style={[styles.vehicleText, { color: theme.textSecondary }]}>{driver.vehicle}</Text>
                        <Text style={[styles.plateBadge, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}>
                            {driver.plate}
                        </Text>
                    </View>

                    {/* Contact Action Buttons */}
                    <View style={styles.actionCol}>
                        <TouchableOpacity
                            style={[styles.actionCircle, { backgroundColor: theme.primaryGreen }]}
                            onPress={() => alert(`Calling ${driver.name}...`)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="call" size={18} color="#000" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCircle, { backgroundColor: theme.inputBg }]}
                            onPress={() => alert(`Opening chat with ${driver.name}...`)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chatbubble-ellipses" size={18} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                {/* Ride Address Summary */}
                <View style={styles.addressBox}>
                    <View style={styles.locRow}>
                        <Ionicons name="ellipse" size={10} color={theme.primaryGreen} />
                        <Text style={[styles.addressText, { color: theme.textPrimary }]} numberOfLines={1}>
                            {pickupLocation || 'Pickup location'}
                        </Text>
                    </View>
                    <View style={styles.locRow}>
                        <Ionicons name="location" size={12} color="#EF4444" />
                        <Text style={[styles.addressText, { color: theme.textPrimary }]} numberOfLines={1}>
                            {destination || 'Destination'}
                        </Text>
                    </View>
                </View>

                {/* Cancel or Complete Button */}
                <TouchableOpacity
                    style={[styles.finishBtn, { backgroundColor: theme.inputBg }]}
                    onPress={handleEndTrip}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.finishBtnText, { color: theme.textPrimary }]}>End / Cancel Ride</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapCanvas: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapGrid: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.15,
    },
    gridRoadHorizontal: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        height: 18,
    },
    gridRoadVertical: {
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 18,
    },
    topMapHeader: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    mapHeaderIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    greenPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusBadgeText: {
        fontWeight: '700',
        fontSize: 13,
    },
    driverMarker: {
        position: 'absolute',
        top: '45%',
        left: '46%',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },
    pickupPin: {
        position: 'absolute',
        top: '25%',
        left: '20%',
    },
    destinationPin: {
        position: 'absolute',
        bottom: '25%',
        right: '20%',
    },
    bottomCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 30,
        elevation: 12,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#475569',
        alignSelf: 'center',
        marginBottom: 14,
    },
    etaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    etaTitle: { fontSize: 18, fontWeight: '800' },
    etaSub: { fontSize: 12, marginTop: 2 },
    otpBadge: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignItems: 'center',
    },
    otpLabel: { fontSize: 9, fontWeight: '800' },
    otpCode: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    divider: { height: 1, marginVertical: 14 },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        marginRight: 12,
    },
    driverMeta: { flex: 1 },
    driverName: { fontSize: 16, fontWeight: '800' },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: { color: '#F59E0B', fontWeight: '800', fontSize: 12 },
    vehicleText: { fontSize: 12, marginTop: 2 },
    plateBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
    },
    actionCol: {
        flexDirection: 'row',
        gap: 10,
    },
    actionCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressBox: { gap: 8, marginBottom: 16 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressText: { fontSize: 13, fontWeight: '500', flex: 1 },
    finishBtn: {
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    finishBtnText: { fontWeight: '700', fontSize: 14 },
});
