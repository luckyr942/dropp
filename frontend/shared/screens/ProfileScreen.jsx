import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Switch,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';
import { API_BASE } from '../utils/apiConfig';
import { getCustomerId, clearCustomerId } from '../utils/authStorage';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import AddressSheet from '../../food/src/components/AddressSheet';
import { loadDeliveryAddress, clearDeliveryAddress, formatAddress } from '../../food/src/utils/deliveryAddress';

// Customer session written by a sign-in flow ({ accessToken, refreshToken, user })
const CUSTOMER_SESSION_KEY = 'dropp_customer_session';

const initialsOf = (name) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

export default function ProfileScreen({ onNavigate }) {
    const { theme, isDark, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null); // from /api/auth/me
    const [customerId, setCustomerIdState] = useState(null);
    const [orderCount, setOrderCount] = useState(null);
    const [address, setAddress] = useState(null);
    const [showAddressSheet, setShowAddressSheet] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setCustomerIdState(await getCustomerId());
            setAddress(await loadDeliveryAddress());

            let token = null;
            try {
                const raw = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);
                token = raw ? JSON.parse(raw)?.accessToken : null;
            } catch (_) {
                token = null;
            }
            if (token) {
                const res = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => null);
                const json = res ? await res.json().catch(() => null) : null;
                setUser(res?.ok && json?.data ? json.data : null);
            } else {
                setUser(null);
            }

            const orders = await authenticatedFetch('/api/orders?limit=100').catch(() => null);
            setOrderCount(Array.isArray(orders?.data) ? orders.data.length : null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const logout = () => {
        Alert.alert(
            'Log out?',
            'This removes your Dropp identity, saved address and order history link from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearCustomerId();
                            await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
                            await clearDeliveryAddress();
                        } catch (_) {
                            // ignore storage errors; a new identity is created on next use
                        }
                        onNavigate?.('Home');
                    },
                },
            ]
        );
    };

    const displayName = user?.name || 'Guest';
    const initials = user?.name ? initialsOf(user.name) : null;

    const menu = [
        {
            id: 'orders',
            label: 'Your orders',
            icon: 'receipt-outline',
            sub: orderCount == null ? 'Track and review your food orders' : `${orderCount} order${orderCount === 1 ? '' : 's'} so far`,
            onPress: () => onNavigate?.('Activity'),
        },
        {
            id: 'address',
            label: 'Delivery address',
            icon: 'location-outline',
            sub: address ? formatAddress(address) : 'Add the address we deliver to',
            onPress: () => setShowAddressSheet(true),
        },
        {
            id: 'payment',
            label: 'Payments',
            icon: 'wallet-outline',
            sub: 'Pay on delivery • Dropp Pay coming soon',
            onPress: () => onNavigate?.('Wallet'),
        },
    ];

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>My Profile</Text>

                <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
                    <View style={[styles.avatar, { backgroundColor: user ? '#00C96B' : theme.inputBg }]}>
                        {initials ? (
                            <Text style={styles.avatarText}>{initials}</Text>
                        ) : (
                            <Ionicons name="person" size={28} color={theme.textSecondary} />
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.primaryGreen} style={{ alignSelf: 'flex-start' }} />
                        ) : (
                            <>
                                <Text style={[styles.name, { color: theme.textPrimary }]}>{displayName}</Text>
                                {user?.email ? (
                                    <Text style={[styles.meta, { color: theme.textSecondary }]}>{user.email}</Text>
                                ) : null}
                                {user?.phone ? (
                                    <Text style={[styles.meta, { color: theme.textSecondary }]}>{user.phone}</Text>
                                ) : null}
                                {!user ? (
                                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                                        Ordering as a guest on this device
                                    </Text>
                                ) : null}
                                {customerId ? (
                                    <Text style={[styles.idText, { color: theme.textSecondary }]} numberOfLines={1}>
                                        ID: {customerId}
                                    </Text>
                                ) : null}
                            </>
                        )}
                    </View>
                </View>

                <View style={[styles.menuList, { backgroundColor: theme.surface }]}>
                    {menu.map((item, idx) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                idx < menu.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.inputSeparator },
                            ]}
                            onPress={item.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: theme.inputBg }]}>
                                <Ionicons name={item.icon} size={20} color={theme.primaryGreen} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                                <Text style={[styles.menuSub, { color: theme.textSecondary }]} numberOfLines={1}>
                                    {item.sub}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.toggleCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.inlineRow}>
                        <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={theme.primaryGreen} />
                        <View>
                            <Text style={[styles.menuLabel, { color: theme.textPrimary }]}>Dark Mode</Text>
                            <Text style={[styles.menuSub, { color: theme.textSecondary }]}>
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

                <TouchableOpacity
                    style={[styles.driverBanner, { backgroundColor: '#166534' }]}
                    onPress={() => onNavigate?.('DriverHome')}
                    activeOpacity={0.8}
                >
                    <View style={styles.inlineRow}>
                        <Ionicons name="speedometer-outline" size={26} color="#4ADE80" />
                        <View>
                            <Text style={styles.driverBannerTitle}>Switch to Driver App</Text>
                            <Text style={styles.driverBannerSub}>Earn on your schedule with Dropp</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#4ADE80" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: theme.surface }]}
                    onPress={logout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Log out</Text>
                </TouchableOpacity>
            </ScrollView>

            <BottomNavBar
                preset="main"
                activeTab="Profile"
                onTabPress={(tab) => {
                    if (tab === 'Home') onNavigate?.('Home');
                    else if (tab === 'Activity') onNavigate?.('Activity');
                    else if (tab === 'Wallet') onNavigate?.('Wallet');
                    else if (tab === 'Profile') onNavigate?.('Profile');
                }}
            />

            <AddressSheet
                visible={showAddressSheet}
                initialAddress={address}
                onClose={() => setShowAddressSheet(false)}
                onSaved={(saved) => {
                    setAddress(saved);
                    setShowAddressSheet(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 110 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
        gap: 14,
    },
    avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
    name: { fontSize: 18, fontWeight: '800' },
    meta: { fontSize: 13, marginTop: 3 },
    idText: { fontSize: 11, marginTop: 6, opacity: 0.8 },
    menuList: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    menuIconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { fontSize: 14.5, fontWeight: '700' },
    menuSub: { fontSize: 12, marginTop: 2 },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    driverBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    driverBannerTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
    driverBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 16,
        gap: 8,
    },
    logoutText: { color: '#EF4444', fontWeight: '800', fontSize: 15 },
});
