import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    StatusBar,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';
import { API_BASE } from '../utils/apiConfig';

const DEMO_BOOKINGS = [
    {
        id: 'b1',
        service: 'Ride (Dropp Go)',
        date: 'Today, 2:45 PM',
        pickup: 'Cyber City, Gurugram',
        destination: 'Terminal 3, IGI Airport',
        price: '₹742',
        status: 'Completed',
        category: 'Rides',
        icon: 'car-sport-outline',
    },
    {
        id: 'b2',
        service: 'Package Delivery',
        date: 'Yesterday, 11:15 AM',
        pickup: 'Green Park Main',
        destination: 'Connaught Place',
        price: '₹140',
        status: 'Completed',
        category: 'Deliveries',
        icon: 'cube-outline',
    },
    {
        id: 'b3',
        service: 'Food Order — Dosa King',
        date: 'Oct 4, 8:30 PM',
        pickup: 'Dosa King, Sector 28',
        destination: 'Flat 402, Tower B',
        price: '₹419',
        status: 'Completed',
        category: 'Food',
        icon: 'fast-food-outline',
    },
];

export default function BookingsScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState('All');
    const [bookings, setBookings] = useState(DEMO_BOOKINGS);
    const [refreshing, setRefreshing] = useState(false);

    const loadLiveBookings = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/orders?limit=10`).catch(() => null);
            if (res && res.ok) {
                const json = await res.json().catch(() => null);
                const liveOrders = json?.data || [];
                if (Array.isArray(liveOrders) && liveOrders.length > 0) {
                    const formattedLive = liveOrders.map((o) => {
                        const itemsSummary = o.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'Food items';
                        const restName = o.restaurantId?.name || o.notes?.replace(/^From\s+/i, '') || 'Restaurant';
                        const statusLabel =
                            o.status === 'confirmed' ? 'Confirmed' :
                            o.status === 'accepted' ? 'Accepted' :
                            o.status === 'preparing' ? 'Preparing' :
                            o.status === 'out_for_delivery' ? 'Out for Delivery' :
                            o.status === 'delivered' ? 'Delivered' :
                            o.status === 'cancelled' ? 'Cancelled' : o.status;

                        return {
                            id: o._id || String(Math.random()),
                            service: `Food Order — ${restName}`,
                            date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent',
                            pickup: restName,
                            destination: o.deliveryAddress?.street || 'Your delivery location',
                            price: `₹${o.totalAmount || 200}`,
                            status: statusLabel,
                            category: 'Food',
                            icon: 'fast-food-outline',
                            rawOrder: o,
                        };
                    });

                    setBookings([...formattedLive, ...DEMO_BOOKINGS]);
                    return;
                }
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        loadLiveBookings();
    }, [loadLiveBookings]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLiveBookings();
        setRefreshing(false);
    };

    const filteredBookings = bookings.filter((b) => {
        if (selectedTab === 'All') return true;
        if (selectedTab === 'Rides') return b.category === 'Rides';
        if (selectedTab === 'Deliveries') return b.category === 'Deliveries';
        if (selectedTab === 'Food') return b.category === 'Food';
        return true;
    });

    const renderItem = ({ item }) => {
        const isCancelled = item.status === 'Cancelled' || item.status === 'cancelled';
        const isActive = ['Preparing', 'Accepted', 'Confirmed', 'Out for Delivery'].includes(item.status);

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface }]}
                activeOpacity={0.85}
                onPress={() => {
                    if (item.category === 'Food' && isActive) {
                        onNavigate?.('FoodTracking');
                    } else if (item.category === 'Rides' && isActive) {
                        onNavigate?.('TripTracking');
                    }
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.serviceRow}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name={item.icon} size={20} color={theme.primaryGreen} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={[styles.serviceTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                {item.service}
                            </Text>
                            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{item.date}</Text>
                        </View>
                    </View>

                    <View style={styles.priceCol}>
                        <Text style={[styles.priceText, { color: theme.textPrimary }]}>{item.price}</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isCancelled ? '#FEF2F2' : isActive ? '#FEF3C7' : theme.tierCardActiveBg }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isCancelled ? '#EF4444' : isActive ? '#D97706' : theme.primaryGreen }
                            ]}>
                                {item.status}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                <View style={styles.locSection}>
                    <View style={styles.locRow}>
                        <Ionicons name="ellipse" size={8} color={theme.primaryGreen} />
                        <Text style={[styles.locAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.pickup}
                        </Text>
                    </View>
                    <View style={styles.locRow}>
                        <Ionicons name="location" size={10} color="#EF4444" />
                        <Text style={[styles.locAddress, { color: theme.textSecondary }]} numberOfLines={1}>
                            {item.destination}
                        </Text>
                    </View>
                </View>

                {isActive ? (
                    <TouchableOpacity
                        style={[styles.rebookBtn, { backgroundColor: '#E5F8EE', borderColor: '#00C96B' }]}
                        onPress={() => onNavigate?.(item.category === 'Food' ? 'FoodTracking' : 'TripTracking')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="radio" size={14} color="#00C96B" />
                        <Text style={[styles.rebookText, { color: '#00A859' }]}>Track Live Progress</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.rebookBtn, { borderColor: theme.inputSeparator }]}
                        onPress={() => alert(`Rebooking ${item.service}`)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="refresh-outline" size={14} color={theme.primaryGreen} />
                        <Text style={[styles.rebookText, { color: theme.primaryGreen }]}>Rebook Service</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Activity & Bookings</Text>
            </View>

            {/* Filter Pills */}
            <View style={styles.tabRow}>
                {['All', 'Rides', 'Deliveries', 'Food'].map((tab) => {
                    const active = selectedTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tabPill,
                                {
                                    backgroundColor: active ? theme.primaryGreen : theme.surface,
                                },
                            ]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: active ? '#000000' : theme.textPrimary },
                                ]}
                            >
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Bookings List with Pull to Refresh */}
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C96B']} />
                }
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
    title: { fontSize: 28, fontWeight: '800' },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 14,
    },
    tabPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabText: { fontWeight: '700', fontSize: 13 },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceTitle: { fontSize: 15, fontWeight: '700' },
    dateText: { fontSize: 12, marginTop: 2 },
    priceCol: { alignItems: 'flex-end' },
    priceText: { fontSize: 16, fontWeight: '800' },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    statusText: { fontSize: 11, fontWeight: '700' },
    divider: { height: 1, marginVertical: 12 },
    locSection: { gap: 6, marginBottom: 12 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locAddress: { fontSize: 13, flex: 1 },
    rebookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        gap: 6,
    },
    rebookText: { fontWeight: '700', fontSize: 13 },
});
