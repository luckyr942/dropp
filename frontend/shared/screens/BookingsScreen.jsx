import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import BottomNavBar from '../components/bottomNavBar';

const BOOKINGS_DATA = [
    {
        id: 'b1',
        service: 'Ride (Comfort)',
        date: 'Today, 2:45 PM',
        pickup: 'Cyber City, Gurugram',
        destination: 'Terminal 3, IGI Airport',
        price: '$24.50',
        status: 'Completed',
        icon: 'car-sport-outline',
    },
    {
        id: 'b2',
        service: 'Package Delivery',
        date: 'Yesterday, 11:15 AM',
        pickup: 'Green Park Main',
        destination: 'Connaught Place',
        price: '$18.50',
        status: 'Completed',
        icon: 'cube-outline',
    },
    {
        id: 'b3',
        service: 'Food Order - Gourmet Burger',
        date: 'Oct 4, 8:30 PM',
        pickup: 'Burger King, Saket',
        destination: 'Home',
        price: '$32.10',
        status: 'Completed',
        icon: 'fast-food-outline',
    },
    {
        id: 'b4',
        service: 'Ride (Standard)',
        date: 'Oct 2, 6:00 PM',
        pickup: 'Select Citywalk Mall',
        destination: 'Hauz Khas Village',
        price: '$14.00',
        status: 'Cancelled',
        icon: 'car-sport-outline',
    },
];

export default function BookingsScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const [selectedTab, setSelectedTab] = useState('All');

    const renderItem = ({ item }) => {
        const isCancelled = item.status === 'Cancelled';

        return (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.serviceRow}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name={item.icon} size={20} color={theme.primaryGreen} />
                        </View>
                        <View>
                            <Text style={[styles.serviceTitle, { color: theme.textPrimary }]}>{item.service}</Text>
                            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{item.date}</Text>
                        </View>
                    </View>

                    <View style={styles.priceCol}>
                        <Text style={[styles.priceText, { color: theme.textPrimary }]}>{item.price}</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isCancelled ? '#FEF2F2' : theme.tierCardActiveBg }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isCancelled ? '#EF4444' : theme.primaryGreen }
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

                <TouchableOpacity
                    style={[styles.rebookBtn, { borderColor: theme.inputSeparator }]}
                    onPress={() => alert(`Rebooking ${item.service}`)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="refresh-outline" size={14} color={theme.primaryGreen} />
                    <Text style={[styles.rebookText, { color: theme.primaryGreen }]}>Rebook Service</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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

            {/* Bookings List */}
            <FlatList
                data={BOOKINGS_DATA}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            <BottomNavBar
                preset="activity"
                activeTab="Activity"
                onTabPress={(tab) => onNavigate && onNavigate(tab)}
                centerAction={{
                    icon: 'car-sports',
                    family: 'MaterialCommunityIcons',
                    size: 26,
                    colors: ['#00E57B', '#00AD57'],
                    onPress: () => onNavigate && onNavigate('Home'),
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
