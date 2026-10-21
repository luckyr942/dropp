import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';
import RideOfferModal from './RideOfferModal';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = API_BASE.replace(/^http/, 'ws');

export default function DriverHomeScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const { isDriverOnline, toggleDriverOnline, driverEarningsToday, driverTripsToday, driverAcceptanceRate } = useRideStore();
    const [showIncomingOffer, setShowIncomingOffer] = useState(false);
    const [currentOffer, setCurrentOffer] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const lastHandledOfferId = useRef(null);

    // ── Live WebSocket & Polling Listener ────────────────────────────
    useEffect(() => {
        let ws = null;
        let pollInterval = null;
        let isMounted = true;

        function connectWs() {
            try {
                ws = new WebSocket(WS_URL);
                ws.onopen = () => {
                    if (isMounted) setWsConnected(true);
                    console.log('[DriverApp] Connected to live dispatch:', WS_URL);
                };
                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (
                            msg.type === 'driver.incoming_offer' ||
                            msg.type === 'ride.driver_assigned' ||
                            msg.type === 'ORDER_CONFIRMED' ||
                            msg.type === 'ORDER_PLACED_VOICE'
                        ) {
                            const offer = msg.data || msg;
                            handleNewIncomingOffer(offer);
                        }
                    } catch (err) {
                        console.warn('[DriverApp] WS parse error:', err.message);
                    }
                };
                ws.onerror = () => {
                    if (isMounted) setWsConnected(false);
                };
                ws.onclose = () => {
                    if (isMounted) {
                        setWsConnected(false);
                        setTimeout(connectWs, 3000);
                    }
                };
            } catch (_) {}
        }

        connectWs();

        // 2.5s Polling Fallback (ensures no missed dispatches across simulators)
        pollInterval = setInterval(async () => {
            if (!isMounted) return;
            try {
                const res = await fetch(`${API_BASE}/api/rides/driver/latest-offer`);
                const json = await res.json();
                if (json.success && json.data && json.data.offerId !== lastHandledOfferId.current) {
                    lastHandledOfferId.current = json.data.offerId;
                    handleNewIncomingOffer(json.data);
                }
            } catch (_) {}
        }, 2500);

        return () => {
            isMounted = false;
            if (ws) ws.close();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    function handleNewIncomingOffer(raw) {
        if (!raw) return;
        const formatted = {
            offerId: raw.offerId || 'offer_' + Date.now(),
            serviceType: raw.serviceType || (raw.rideType ? 'RIDE' : 'FOOD DELIVERY'),
            fare: raw.fare || (raw.totalAmount ? `₹${Math.round(raw.totalAmount * 0.25)}` : '₹361.00'),
            distance: raw.distance || (raw.distanceKm ? `${raw.distanceKm} km • ${raw.estimatedMins || 18} mins` : '15.97 km • 29 mins'),
            pickup: raw.pickup || raw.pickupLocation || 'Sector 1, Bokaro Steel City',
            destination: raw.destination || raw.dropLocation || 'Balidih Main Gate',
            otp: raw.otp || '4821',
            customerName: raw.customerName || 'Rahul Verma',
        };
        setCurrentOffer(formatted);
        setShowIncomingOffer(true);
    }

    const triggerTestOffer = (type) => {
        if (type === 'RIDE') {
            handleNewIncomingOffer({
                offerId: 'ride_sim_' + Date.now(),
                serviceType: 'RIDE',
                fare: '₹361.00',
                distance: '15.97 km • 29 mins',
                pickup: 'Sector 1, Bokaro Steel City',
                destination: 'Balidih Industrial Area',
                otp: '4821',
                customerName: 'Rahul Verma',
            });
        } else if (type === 'FOOD') {
            handleNewIncomingOffer({
                offerId: 'food_sim_' + Date.now(),
                serviceType: 'FOOD DELIVERY',
                fare: '₹249.00',
                distance: '3.6 km • 16 mins',
                pickup: 'Bawarchee Biryani House, Sector 28',
                destination: 'DLF Cyber City, Gurugram',
                otp: '7192',
                customerName: 'Priya Sharma',
            });
        } else {
            handleNewIncomingOffer({
                offerId: 'pkg_sim_' + Date.now(),
                serviceType: 'PACKAGE DELIVERY',
                fare: '₹140.00',
                distance: '5.2 km • 22 mins',
                pickup: 'Sector 14 Market',
                destination: 'Balidih Gate 3',
                otp: '9931',
                customerName: 'Amit Saxena',
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header Bar */}
            <View style={[styles.header, { borderBottomColor: theme.inputSeparator }]}>
                <View style={styles.titleRow}>
                    <Ionicons name="car-sport" size={24} color={theme.primaryGreen} />
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Dropp Partner</Text>
                </View>

                <View style={[styles.statusIndicator, { backgroundColor: isDriverOnline ? theme.tierCardActiveBg : theme.inputBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: isDriverOnline ? theme.primaryGreen : '#94A3B8' }]} />
                    <Text style={[styles.statusText, { color: isDriverOnline ? theme.primaryGreen : theme.textSecondary }]}>
                        {isDriverOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Big Online/Offline Toggle Button */}
                <TouchableOpacity
                    style={[
                        styles.onlineToggleBtn,
                        {
                            backgroundColor: isDriverOnline ? theme.surface : theme.primaryGreen,
                            borderColor: isDriverOnline ? theme.primaryGreen : 'transparent',
                        },
                    ]}
                    onPress={toggleDriverOnline}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name={isDriverOnline ? 'power-outline' : 'power'}
                        size={38}
                        color={isDriverOnline ? theme.primaryGreen : '#000000'}
                    />
                    <Text
                        style={[
                            styles.onlineBtnText,
                            { color: isDriverOnline ? theme.primaryGreen : '#000000' },
                        ]}
                    >
                        {isDriverOnline ? 'YOU ARE ONLINE • READY FOR DISPATCH' : 'GO ONLINE'}
                    </Text>
                    <Text
                        style={[
                            styles.onlineBtnSub,
                            { color: isDriverOnline ? theme.textSecondary : 'rgba(0,0,0,0.7)' },
                        ]}
                    >
                        {isDriverOnline ? 'Live dispatch connected • Listening for customer orders' : 'Tap to start accepting ride & parcel requests'}
                    </Text>
                </TouchableOpacity>

                {/* Earnings & Stats Summary Grid */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Today's Performance</Text>
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="cash-outline" size={22} color={theme.primaryGreen} />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>${driverEarningsToday.toFixed(2)}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Earnings Today</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="car-sport-outline" size={22} color="#3B82F6" />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{driverTripsToday}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Trips Completed</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={22} color="#F59E0B" />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{driverAcceptanceRate}%</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Acceptance Rate</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="time-outline" size={22} color="#8B5CF6" />
                        <Text style={[styles.statValue, { color: theme.textPrimary }]}>6.5h</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Online Hours</Text>
                    </View>
                </View>

                {/* Demand Map & Live Simulation Test */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Live Dispatch & Test Offers</Text>
                <View style={[styles.surgeMap, { backgroundColor: theme.surface }]}>
                    <View style={styles.surgeOverlay}>
                        <View style={[styles.surgeChip, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.surgeChipText}>🔥 1.8x Surge • Connaught Place</Text>
                        </View>
                        <View style={[styles.surgeChip, { backgroundColor: '#F59E0B', marginTop: 8 }]}>
                            <Text style={styles.surgeChipText}>⚡ 1.4x Surge • Cyber City</Text>
                        </View>
                    </View>

                    {/* Instant Test Buttons */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                        <TouchableOpacity
                            style={[styles.simOfferBtn, { flex: 1, backgroundColor: theme.primaryGreen }]}
                            onPress={() => triggerTestOffer('RIDE')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.simOfferText}>🚖 Ride (₹361)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.simOfferBtn, { flex: 1, backgroundColor: '#F59E0B' }]}
                            onPress={() => triggerTestOffer('FOOD')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.simOfferText, { color: '#FFF' }]}>🍛 Food (₹249)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.simOfferBtn, { flex: 1, backgroundColor: '#3B82F6' }]}
                            onPress={() => triggerTestOffer('PKG')}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.simOfferText, { color: '#FFF' }]}>📦 Parcel (₹140)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Driver Navigation shortcuts */}
                <View style={styles.quickNavRow}>
                    <TouchableOpacity
                        style={[styles.quickNavBtn, { backgroundColor: theme.surface }]}
                        onPress={() => onNavigate && onNavigate('DriverEarnings')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="stats-chart-outline" size={20} color={theme.primaryGreen} />
                        <Text style={[styles.quickNavText, { color: theme.textPrimary }]}>Payouts & Stats</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickNavBtn, { backgroundColor: theme.surface }]}
                        onPress={() => onNavigate && onNavigate('DriverNav')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="navigate-outline" size={20} color={theme.primaryGreen} />
                        <Text style={[styles.quickNavText, { color: theme.textPrimary }]}>Active Navigation</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Incoming Offer Modal */}
            {showIncomingOffer && (
                <RideOfferModal
                    offer={currentOffer}
                    onAccept={(accepted) => {
                        setShowIncomingOffer(false);
                        if (onNavigate) onNavigate('DriverNav');
                    }}
                    onDecline={() => setShowIncomingOffer(false)}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontWeight: '900', fontSize: 18 },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontWeight: '800', fontSize: 12 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    onlineToggleBtn: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginBottom: 24,
        elevation: 6,
    },
    onlineBtnText: { fontSize: 16, fontWeight: '900', marginTop: 10, letterSpacing: 0.5 },
    onlineBtnSub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: {
        width: '48%',
        borderRadius: 20,
        padding: 16,
    },
    statValue: { fontSize: 22, fontWeight: '900', marginVertical: 6 },
    statLabel: { fontSize: 12, fontWeight: '500' },
    surgeMap: {
        borderRadius: 24,
        padding: 16,
        height: 180,
        justifyContent: 'space-between',
    },
    surgeOverlay: { alignSelf: 'flex-start' },
    surgeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    surgeChipText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
    simOfferBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 46,
        borderRadius: 14,
        gap: 8,
    },
    simOfferText: { color: '#000', fontWeight: '800', fontSize: 13 },
    quickNavRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    quickNavBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 16,
        gap: 8,
    },
    quickNavText: { fontWeight: '700', fontSize: 13 },
});
