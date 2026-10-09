import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    Switch,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';

const MENU_SECTIONS = [
    {
        title: 'Account Settings',
        items: [
            { id: 'places', label: 'Saved Addresses', icon: 'location-outline', sub: 'Home, Work, Favorite places' },
            { id: 'payment', label: 'Payment & Dropp Pay', icon: 'wallet-outline', sub: 'Cards, UPI, Cash balance' },
            { id: 'security', label: 'Security & Privacy', icon: 'shield-checkmark-outline', sub: '2FA, Password & Passcode' },
        ],
    },
    {
        title: 'Preferences & Support',
        items: [
            { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', sub: 'Ride updates & promos' },
            { id: 'help', label: 'Help & 24/7 Support', icon: 'help-circle-outline', sub: 'FAQs, Live Chat, Report issue' },
            { id: 'terms', label: 'Terms & Privacy Policy', icon: 'document-text-outline', sub: 'Legal documentation' },
        ],
    },
];

export default function ProfileScreen({ onNavigate }) {
    const { theme, isDark, toggleTheme } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>My Profile</Text>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }}
                        style={styles.avatar}
                    />
                    <View style={styles.profileMeta}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.name, { color: theme.textPrimary }]}>Alex Rivera</Text>
                            <View style={[styles.goldBadge, { backgroundColor: theme.tierCardActiveBg }]}>
                                <Ionicons name="star" size={12} color={theme.starGold} />
                                <Text style={[styles.goldText, { color: theme.primaryGreen }]}>Gold Member</Text>
                            </View>
                        </View>
                        <Text style={[styles.phone, { color: theme.textSecondary }]}>+1 (555) 234-5678</Text>
                        <Text style={[styles.email, { color: theme.textSecondary }]}>alex.rivera@dropp.com</Text>
                    </View>
                </View>

                {/* Driver Mode Banner Switch */}
                <TouchableOpacity
                    style={[styles.driverBanner, { backgroundColor: '#166534' }]}
                    onPress={() => onNavigate && onNavigate('DriverHome')}
                    activeOpacity={0.8}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="speedometer-outline" size={26} color="#4ADE80" />
                        <View>
                            <Text style={styles.driverBannerTitle}>Switch to Driver App</Text>
                            <Text style={styles.driverBannerSub}>Earn on your schedule with Dropp</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#4ADE80" />
                </TouchableOpacity>

                {/* Dark Mode Theme Toggle */}
                <View style={[styles.toggleCard, { backgroundColor: theme.surface }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons
                            name={isDark ? 'moon' : 'sunny'}
                            size={22}
                            color={theme.primaryGreen}
                        />
                        <View>
                            <Text style={[styles.toggleTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
                            <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                                {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
                            </Text>
                        </View>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#334155', true: '#166534' }}
                        thumbColor={isDark ? theme.primaryGreen : '#94A3B8'}
                    />
                </View>

                {/* Menu Sections */}
                {MENU_SECTIONS.map((section, idx) => (
                    <View key={idx} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section.title}</Text>
                        <View style={[styles.menuList, { backgroundColor: theme.surface }]}>
                            {section.items.map((item, itemIdx) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        itemIdx < section.items.length - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: theme.inputSeparator,
                                        },
                                    ]}
                                    onPress={() => alert(`Opening ${item.label}`)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.menuIconBox, { backgroundColor: theme.inputBg }]}>
                                        <Ionicons name={item.icon} size={20} color={theme.primaryGreen} />
                                    </View>
                                    <View style={styles.menuMeta}>
                                        <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                                        <Text style={[styles.menuSub, { color: theme.textSecondary }]}>{item.sub}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={theme.placeholder} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Log Out CTA */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: theme.surface }]}
                    onPress={() => alert('Logged out successfully')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log Out Account</Text>
                </TouchableOpacity>
            </ScrollView>

            <BottomNavBar activeTab="Profile" onTabPress={(tab) => onNavigate && onNavigate(tab)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 110 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 14,
    },
    avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 14 },
    profileMeta: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 17, fontWeight: '800' },
    goldBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 4,
    },
    goldText: { fontSize: 11, fontWeight: '800' },
    phone: { fontSize: 13, marginTop: 4 },
    email: { fontSize: 12, marginTop: 1 },
    driverBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        marginBottom: 14,
    },
    driverBannerTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
    driverBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    toggleTitle: { fontSize: 15, fontWeight: '700' },
    toggleSub: { fontSize: 12, marginTop: 2 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
    menuList: { borderRadius: 20, overflow: 'hidden' },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    menuIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuMeta: { flex: 1 },
    menuLabel: { fontSize: 14, fontWeight: '700' },
    menuSub: { fontSize: 12, marginTop: 2 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 16,
        gap: 8,
        marginTop: 10,
    },
    logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 15 },
});
