import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';
import { authenticatedFetch } from '../utils/authenticatedFetch';

const ACTIVE_STATUSES = ['confirmed', 'accepted', 'preparing', 'driver_assigned', 'ready_for_pickup', 'out_for_delivery'];

const STATUS_LABEL = {
    confirmed: 'Placed',
    accepted: 'Accepted',
    preparing: 'Preparing',
    driver_assigned: 'Partner assigned',
    ready_for_pickup: 'Ready for pickup',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const TABS = ['All', 'Active', 'Past'];

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const toBooking = (o) => {
    const restName = o.restaurantId?.name || (o.notes || '').replace(/^From\s+/i, '') || 'Restaurant';
    const address = [o.deliveryAddress?.street, o.deliveryAddress?.city].filter(Boolean).join(', ');
    const itemCount = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    return {
        id: String(o._id),
        title: restName,
        date: formatDate(o.createdAt),
        items: (o.items || []).map((i) => `${i.quantity} × ${i.name}`).join(', '),
        itemCount,
        address,
        price: `₹${Math.round(o.totalAmount || 0)}`,
        status: o.status,
        isActive: ACTIVE_STATUSES.includes(o.status),
        raw: o,
    };
};

export default function BookingsScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState('All');
    const [bookings, setBookings] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadOrders = useCallback(async () => {
        try {
            const json = await authenticatedFetch('/api/orders?limit=50');
            const orders = Array.isArray(json?.data) ? json.data : [];
            setBookings(orders.map(toBooking));
            setStatus('ready');
            setError(null);
        } catch (err) {
            setError(err?.message || 'Could not load your orders.');
            setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const filtered = bookings.filter((b) => {
        if (selectedTab === 'Active') return b.isActive;
        if (selectedTab === 'Past') return !b.isActive;
        return true;
    });

    const openOrder = (item) => onNavigate?.('FoodTracking', item.raw);

    const renderItem = ({ item }) => {
        const isCancelled = item.status === 'cancelled';
        const badgeBg = isCancelled ? '#FEF2F2' : item.isActive ? '#FEF3C7' : theme.tierCardActiveBg;
        const badgeFg = isCancelled ? '#EF4444' : item.isActive ? '#B45309' : '#15803D';

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.inputSeparator }]}
                activeOpacity={0.85}
                onPress={() => openOrder(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.inputBg }]}>
                        <Ionicons name="fast-food-outline" size={20} color={theme.primaryGreen} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.serviceTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                            {item.date}{item.itemCount ? ` • ${item.itemCount} item${item.itemCount > 1 ? 's' : ''}` : ''}
                        </Text>
                    </View>
                    <View style={styles.priceCol}>
                        <Text style={[styles.priceText, { color: theme.textPrimary }]}>{item.price}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.statusText, { color: badgeFg }]}>
                                {STATUS_LABEL[item.status] || item.status}
                            </Text>
                        </View>
                    </View>
                </View>

                {item.items ? (
                    <Text style={[styles.itemsText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.items}
                    </Text>
                ) : null}

                {item.address ? (
                    <View style={styles.locRow}>
                        <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.locAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.address}
                        </Text>
                    </View>
                ) : null}

                <View style={[styles.actionBtn, item.isActive ? styles.actionBtnActive : { borderColor: theme.inputSeparator }]}>
                    <Ionicons
                        name={item.isActive ? 'navigate' : 'receipt-outline'}
                        size={14}
                        color={item.isActive ? '#00A859' : theme.textSecondary}
                    />
                    <Text style={[styles.actionText, { color: item.isActive ? '#00A859' : theme.textSecondary }]}>
                        {item.isActive ? 'Track order' : 'View details'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => {
        if (status === 'loading') {
            return (
                <View>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.inputSeparator }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconCircle, { backgroundColor: theme.inputBg }]} />
                                <View style={{ flex: 1, gap: 8 }}>
                                    <View style={[styles.skeleton, { width: '60%', backgroundColor: theme.inputBg }]} />
                                    <View style={[styles.skeleton, { width: '35%', backgroundColor: theme.inputBg }]} />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            );
        }
        if (status === 'error') {
            return (
                <View style={styles.emptyBox}>
                    <Ionicons name="cloud-offline-outline" size={40} color={theme.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Couldn't load your orders</Text>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => { setStatus('loading'); loadOrders(); }}>
                        <Text style={styles.primaryBtnText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <View style={styles.emptyBox}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.tierCardActiveBg }]}>
                    <Ionicons name="receipt-outline" size={34} color={theme.primaryGreen} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    {selectedTab === 'Active' ? 'No active orders' : selectedTab === 'Past' ? 'No past orders yet' : 'No orders yet'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    Your food orders will appear here, with live tracking while they're on the way.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => onNavigate?.('Food')}>
                    <Text style={styles.primaryBtnText}>Order food</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Your orders</Text>
            </View>

            <View style={styles.tabRow}>
                {TABS.map((tab) => {
                    const active = selectedTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabPill, { backgroundColor: active ? theme.primaryGreen : theme.surface }]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: active ? '#04130B' : theme.textPrimary }]}>{tab}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {status === 'error' && bookings.length > 0 ? (
                <Text style={styles.staleText}>Showing saved results — {error}</Text>
            ) : null}

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C96B']} tintColor="#00C96B" />}
            />

            <BottomNavBar
                preset="main"
                activeTab="Activity"
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
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    tabRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14 },
    tabPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    tabText: { fontWeight: '700', fontSize: 13 },
    staleText: { paddingHorizontal: 20, marginBottom: 8, fontSize: 12, color: '#B45309' },
    listContent: { paddingHorizontal: 20, paddingBottom: 110, flexGrow: 1 },
    card: { borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    serviceTitle: { fontSize: 15, fontWeight: '700' },
    dateText: { fontSize: 12, marginTop: 2 },
    priceCol: { alignItems: 'flex-end' },
    priceText: { fontSize: 16, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    itemsText: { fontSize: 13, marginTop: 12, lineHeight: 18 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    locAddress: { fontSize: 12.5, flex: 1 },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 9,
        gap: 6,
        marginTop: 12,
    },
    actionBtnActive: { backgroundColor: '#E5F8EE', borderColor: '#00C96B' },
    actionText: { fontWeight: '700', fontSize: 13 },
    skeleton: { height: 12, borderRadius: 6 },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 8 },
    emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyTitle: { fontSize: 18, fontWeight: '800' },
    emptyText: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
    primaryBtn: { marginTop: 12, backgroundColor: '#00A859', borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12 },
    primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
