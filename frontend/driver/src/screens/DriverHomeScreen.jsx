import React, { useState } from 'react';
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

export default function DriverHomeScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const { isDriverOnline, toggleDriverOnline, driverEarningsToday, driverTripsToday, driverAcceptanceRate } = useRideStore();
    const [showIncomingOffer, setShowIncomingOffer] = useState(false);

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
                        {isDriverOnline ? 'YOU ARE ONLINE • READY FOR RIDES' : 'GO ONLINE'}
                    </Text>
                    <Text
                        style={[
                            styles.onlineBtnSub,
                            { color: isDriverOnline ? theme.textSecondary : 'rgba(0,0,0,0.7)' },
                        ]}
                    >
                        {isDriverOnline ? 'Tap to go offline and stop receiving offers' : 'Tap to start accepting ride & parcel requests'}
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

                {/* Demand Map & Surge */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>High Demand Surge Zones</Text>
                <View style={[styles.surgeMap, { backgroundColor: theme.surface }]}>
                    <View style={styles.surgeOverlay}>
                        <View style={[styles.surgeChip, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.surgeChipText}>🔥 1.8x Surge • Connaught Place</Text>
                        </View>
                        <View style={[styles.surgeChip, { backgroundColor: '#F59E0B', marginTop: 8 }]}>
                            <Text style={styles.surgeChipText}>⚡ 1.4x Surge • Cyber City</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.simOfferBtn, { backgroundColor: theme.primaryGreen }]}
                        onPress={() => setShowIncomingOffer(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications" size={18} color="#000" />
                        <Text style={styles.simOfferText}>Simulate Incoming Ride Request</Text>
                    </TouchableOpacity>
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
                    onAccept={() => {
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
