import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';

// There is no wallet backend yet: this screen only describes how payment works today.
const PAY_ON_DELIVERY = [
    { id: 'cash', title: 'Cash', sub: 'Pay your delivery partner or driver directly', icon: 'cash' },
    { id: 'upi', title: 'UPI on delivery', sub: 'Scan and pay with any UPI app when your order arrives', icon: 'qrcode-scan' },
];

export default function WalletScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Payments</Text>

                <View style={styles.heroCard}>
                    <View style={styles.heroHeader}>
                        <View style={styles.inlineRow}>
                            <Ionicons name="sparkles" size={16} color="#4ADE80" />
                            <Text style={styles.heroLabel}>DROPP PAY</Text>
                        </View>
                        <Text style={styles.soonBadge}>Coming soon</Text>
                    </View>
                    <Text style={styles.heroTitle}>One-tap payments are on the way</Text>
                    <Text style={styles.heroSub}>
                        A Dropp wallet for rides and food is in the works. Until then, every order is paid on delivery — no balance or card needed.
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>How you pay today</Text>
                <View style={styles.methodList}>
                    {PAY_ON_DELIVERY.map((m) => (
                        <View key={m.id} style={[styles.methodCard, { backgroundColor: theme.surface }]}>
                            <View style={[styles.methodIconBox, { backgroundColor: theme.inputBg }]}>
                                <MaterialCommunityIcons name={m.icon} size={22} color={theme.primaryGreen} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.methodTitle, { color: theme.textPrimary }]}>{m.title}</Text>
                                <Text style={[styles.methodSub, { color: theme.textSecondary }]}>{m.sub}</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={20} color={theme.primaryGreen} />
                        </View>
                    ))}
                </View>

                <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.inputSeparator }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={theme.primaryGreen} />
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Food orders show a delivery OTP. Only share it with your partner once you have your order.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.linkBtn, { backgroundColor: theme.surface }]}
                    onPress={() => onNavigate?.('Activity')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="receipt-outline" size={18} color={theme.primaryGreen} />
                    <Text style={[styles.linkText, { color: theme.textPrimary }]}>See your order history</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
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
    scrollContent: { padding: 20, paddingBottom: 110 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroCard: { backgroundColor: '#166534', borderRadius: 24, padding: 20, marginBottom: 24 },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroLabel: { color: '#4ADE80', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    soonBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: '700',
        overflow: 'hidden',
    },
    heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 14, letterSpacing: -0.3 },
    heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    methodList: { gap: 10 },
    methodCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 12 },
    methodIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontSize: 15, fontWeight: '700' },
    methodSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
    },
    infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
    },
    linkText: { flex: 1, fontSize: 14.5, fontWeight: '700' },
});
