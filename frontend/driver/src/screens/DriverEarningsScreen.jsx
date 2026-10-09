import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';

const WEEKLY_DATA = [
    { day: 'Mon', amount: 110, height: 60 },
    { day: 'Tue', amount: 95, height: 50 },
    { day: 'Wed', amount: 140, height: 80 },
    { day: 'Thu', amount: 120, height: 68 },
    { day: 'Fri', amount: 177.8, height: 100 },
];

export default function DriverEarningsScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.inputSeparator }]}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => onNavigate && onNavigate('DriverHome')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Driver Payouts & Earnings</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Total Balance Card */}
                <View style={[styles.payoutCard, { backgroundColor: '#166534' }]}>
                    <Text style={styles.payoutLabel}>AVAILABLE FOR CASHOUT</Text>
                    <Text style={styles.payoutAmount}>$642.80</Text>
                    <Text style={styles.payoutSub}>Weekly payout scheduled for Monday, Oct 12</Text>

                    <TouchableOpacity
                        style={styles.cashoutBtn}
                        onPress={() => alert('Cashout request submitted!')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="wallet-outline" size={18} color="#000" />
                        <Text style={styles.cashoutText}>Instant Cashout to Bank</Text>
                    </TouchableOpacity>
                </View>

                {/* Weekly Chart */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>This Week's Breakdown</Text>
                <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.barContainer}>
                        {WEEKLY_DATA.map((item) => (
                            <View key={item.day} style={styles.barCol}>
                                <Text style={[styles.barAmount, { color: theme.primaryGreen }]}>${item.amount}</Text>
                                <View style={[styles.barBg, { backgroundColor: theme.inputBg }]}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            {
                                                height: item.height,
                                                backgroundColor: theme.primaryGreen,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.barDay, { color: theme.textSecondary }]}>{item.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '800' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    payoutCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
    },
    payoutLabel: { color: '#4ADE80', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    payoutAmount: { color: '#FFF', fontSize: 38, fontWeight: '900', marginVertical: 8 },
    payoutSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 16 },
    cashoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4ADE80',
        height: 48,
        borderRadius: 14,
        gap: 8,
    },
    cashoutText: { color: '#000', fontWeight: '900', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    chartCard: {
        borderRadius: 20,
        padding: 20,
    },
    barContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160,
    },
    barCol: { alignItems: 'center' },
    barAmount: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
    barBg: {
        width: 24,
        height: 110,
        borderRadius: 12,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: { width: '100%', borderRadius: 12 },
    barDay: { fontSize: 12, fontWeight: '700', marginTop: 8 },
});
