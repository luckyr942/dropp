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
import BottomNavBar from '../components/bottomNavBar';

const PAYMENT_METHODS = [
    { id: 'dropp_pay', title: 'Dropp Pay Balance', sub: '₹450 Available', icon: 'wallet-outline', isDefault: true },
    { id: 'upi_gpay', title: 'Google Pay / PhonePe', sub: 'UPI Linked', icon: 'phone-portrait-outline', isDefault: false },
    { id: 'card_visa', title: 'Visa •••• 4821', sub: 'Expires 08/28', icon: 'card-outline', isDefault: false },
    { id: 'cash', title: 'Cash on Delivery / Ride', sub: 'Pay driver directly', icon: 'cash-outline', isDefault: false },
];

const TRANSACTIONS = [
    { id: 't1', title: 'Top-Up via UPI', date: 'Today, 1:20 PM', amount: '+₹500', positive: true, icon: 'add-circle-outline' },
    { id: 't2', title: 'Ride to Airport', date: 'Yesterday, 3:45 PM', amount: '-₹384', positive: false, icon: 'car-sport-outline' },
    { id: 't3', title: 'Dropp CashBack Reward', date: 'Oct 4, 10:00 AM', amount: '+₹50', positive: true, icon: 'gift-outline' },
    { id: 't4', title: 'Food Order - Dosa King', date: 'Oct 2, 7:15 PM', amount: '-₹230', positive: false, icon: 'fast-food-outline' },
];

export default function WalletScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Dropp Pay Wallet</Text>

                {/* Main Wallet Balance Hero Card */}
                <View style={[styles.balanceCard, { backgroundColor: '#166534' }]}>
                    <View style={styles.balanceHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="sparkles" size={16} color="#4ADE80" />
                            <Text style={styles.cardLabel}>DROPP PAY</Text>
                        </View>
                        <Text style={styles.cardBadge}>Active</Text>
                    </View>

                    <Text style={styles.balanceAmount}>₹450</Text>
                    <Text style={styles.balanceSub}>Auto-refill enabled • 5% CashBack Active</Text>

                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => alert('Add Money to Wallet')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add" size={18} color="#000" />
                            <Text style={styles.actionText}>Add Money</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                            onPress={() => alert('Transfer to Bank')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-redo-outline" size={16} color="#FFF" />
                            <Text style={[styles.actionText, { color: '#FFF' }]}>Transfer</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Saved Payment Methods */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Payment Methods</Text>
                <View style={styles.methodList}>
                    {PAYMENT_METHODS.map((method) => (
                        <View
                            key={method.id}
                            style={[styles.methodCard, { backgroundColor: theme.surface }]}
                        >
                            <View style={[styles.methodIconBox, { backgroundColor: theme.inputBg }]}>
                                <Ionicons name={method.icon} size={22} color={theme.primaryGreen} />
                            </View>

                            <View style={styles.methodMeta}>
                                <Text style={[styles.methodTitle, { color: theme.textPrimary }]}>{method.title}</Text>
                                <Text style={[styles.methodSub, { color: theme.textSecondary }]}>{method.sub}</Text>
                            </View>

                            {method.isDefault ? (
                                <View style={[styles.defaultBadge, { backgroundColor: theme.tierCardActiveBg }]}>
                                    <Text style={[styles.defaultText, { color: theme.primaryGreen }]}>Default</Text>
                                </View>
                            ) : (
                                <Ionicons name="chevron-forward" size={18} color={theme.placeholder} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Transaction History */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Recent Transactions</Text>
                <View style={styles.txList}>
                    {TRANSACTIONS.map((tx) => (
                        <View key={tx.id} style={[styles.txCard, { backgroundColor: theme.surface }]}>
                            <View style={[styles.txIconBox, { backgroundColor: theme.inputBg }]}>
                                <Ionicons
                                    name={tx.icon}
                                    size={20}
                                    color={tx.positive ? theme.primaryGreen : theme.textSecondary}
                                />
                            </View>
                            <View style={styles.txMeta}>
                                <Text style={[styles.txTitle, { color: theme.textPrimary }]}>{tx.title}</Text>
                                <Text style={[styles.txDate, { color: theme.textSecondary }]}>{tx.date}</Text>
                            </View>
                            <Text style={[
                                styles.txAmount,
                                { color: tx.positive ? theme.primaryGreen : theme.textPrimary }
                            ]}>
                                {tx.amount}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <BottomNavBar
                preset="main"
                activeTab="Wallet"
                onTabPress={(tab) => {
                    if (tab === 'Home') onNavigate?.('Home');
                    else if (tab === 'Activity') onNavigate?.('Activity');
                    else if (tab === 'Wallet') onNavigate?.('Wallet');
                    else if (tab === 'Profile') onNavigate?.('Profile');
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
    balanceCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        elevation: 6,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: { color: '#4ADE80', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    cardBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#FFF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: '700',
    },
    balanceAmount: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginVertical: 10 },
    balanceSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 18 },
    quickActions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4ADE80',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 6,
    },
    actionText: { color: '#000', fontWeight: '800', fontSize: 13 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    methodList: { gap: 10 },
    methodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
    },
    methodIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    methodMeta: { flex: 1 },
    methodTitle: { fontSize: 15, fontWeight: '700' },
    methodSub: { fontSize: 12, marginTop: 2 },
    defaultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    defaultText: { fontSize: 11, fontWeight: '700' },
    txList: { gap: 10 },
    txCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
    },
    txIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txMeta: { flex: 1 },
    txTitle: { fontSize: 14, fontWeight: '700' },
    txDate: { fontSize: 12, marginTop: 2 },
    txAmount: { fontSize: 15, fontWeight: '800' },
});
