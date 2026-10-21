import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Ionicons,
    Feather,
    MaterialCommunityIcons,
    FontAwesome5,
} from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';

const { width } = Dimensions.get('window');

// Local High-Definition Assets
const Assets = {
    heroBanner: require('../../../assets/delivery/hero_banner.jpg'),
    blinkit: require('../../../assets/delivery/blinkit.jpg'),
    zepto: require('../../../assets/delivery/zepto.jpg'),
    amazon: require('../../../assets/delivery/amazon.jpg'),
    recentParcel: require('../../../assets/delivery/recent_parcel.jpg'),
    healthkart: require('../../../assets/delivery/healthkart.jpg'),
};

const MAIN_SERVICES = [
    {
        id: 'parcel',
        title: 'Send Parcel',
        sub: 'Documents,\ngifts & more',
        icon: 'cube',
        iconColor: '#3B82F6',
        bgGradient: ['#EFF6FF', '#DBEAFE'],
    },
    {
        id: 'pickup',
        title: 'Pick up Item',
        sub: 'From any store\nnear you',
        icon: 'basket',
        iconColor: '#10B981',
        bgGradient: ['#ECFDF5', '#D1FAE5'],
    },
    {
        id: 'buy',
        title: 'Buy for Me',
        sub: 'We shop &\ndeliver to you',
        icon: 'storefront',
        iconColor: '#F97316',
        bgGradient: ['#FFF7ED', '#FFEDD5'],
    },
    {
        id: 'medicine',
        title: 'Medicine Delivery',
        sub: 'From nearby\npharmacies',
        icon: 'medical',
        iconColor: '#8B5CF6',
        bgGradient: ['#F5F3FF', '#EDE9FE'],
    },
];

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'grid', color: '#3B82F6', type: 'ionicons' },
    { id: 'grocery', label: 'Grocery', icon: 'carrot', color: '#10B981', type: 'fa5' },
    { id: 'medicines', label: 'Medicines', icon: 'pills', color: '#EF4444', type: 'fa5' },
    { id: 'electronics', label: 'Electronics', icon: 'headset', color: '#374151', type: 'ionicons' },
    { id: 'documents', label: 'Documents', icon: 'document-text', color: '#6B7280', type: 'ionicons' },
    { id: 'gifts', label: 'Gifts', icon: 'gift', color: '#EC4899', type: 'ionicons' },
    { id: 'more', label: 'More', icon: 'ellipsis-horizontal', color: '#9CA3AF', type: 'ionicons' },
];

const POPULAR_STORES = [
    {
        id: 'blinkit',
        name: 'Blinkit',
        category: 'Grocery & Essentials',
        eta: '10–15 mins',
        image: Assets.blinkit,
        badgeColor: '#E6F9F0',
        badgeTextColor: '#059669',
        logoText: 'b',
        logoBg: '#FCD34D',
        logoTextColor: '#000',
    },
    {
        id: 'zepto',
        name: 'Zepto',
        category: 'Fruits & Vegetables',
        eta: '15–20 mins',
        image: Assets.zepto,
        badgeColor: '#FAF5FF',
        badgeTextColor: '#7C3AED',
        logoText: 'zepto',
        logoBg: '#EDE9FE',
        logoTextColor: '#7C3AED',
    },
    {
        id: 'amazon',
        name: 'Amazon',
        category: 'Electronics & More',
        eta: '20–25 mins',
        image: Assets.amazon,
        badgeColor: '#FFFBEB',
        badgeTextColor: '#D97706',
        logoText: 'amazon',
        logoBg: '#FEF3C7',
        logoTextColor: '#111',
    },
];

const RECENT_ORDERS = [
    {
        id: 'ord_1',
        title: 'Document Parcel',
        dest: 'To: LPU, Phagwara',
        time: 'Today, 2:30 PM',
        status: 'Out for Delivery',
        statusType: 'in_progress',
        image: Assets.recentParcel,
    },
    {
        id: 'ord_2',
        title: 'HealthKart Order',
        dest: 'From: Gurgaon Sector 14',
        time: 'Yesterday, 6:12 PM',
        status: 'Delivered',
        statusType: 'completed',
        image: Assets.healthkart,
    },
];

export default function PackageDetailsScreen({ onBack, onNavigate }) {
    const { pickupLocation } = useRideStore();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState('Send');

    const locationLabel = (typeof pickupLocation === 'object' && pickupLocation?.label)
        ? pickupLocation.label
        : 'Gurugram, Sector 28';

    const handleServicePress = (serviceId) => {
        if (onNavigate) {
            onNavigate('Location');
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <SafeAreaView edges={['top']} style={styles.topSafeArea}>
                {/* ── 1. HEADER ── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onBack || (() => onNavigate?.('Home'))}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>Delivery</Text>
                        <Text style={styles.headerSubtitle}>Send anything, anywhere</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.locationPill}
                        activeOpacity={0.8}
                        onPress={() => onNavigate?.('Location')}
                    >
                        <Ionicons name="location-sharp" size={15} color="#2563EB" />
                        <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
                        <Ionicons name="chevron-down" size={13} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── 2. HERO PROMO BANNER ── */}
                <View style={styles.heroCard}>
                    <Image
                        source={Assets.heroBanner}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(240, 247, 255, 0.95)', 'rgba(240, 247, 255, 0.85)', 'rgba(240, 247, 255, 0.1)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.heroOverlay}
                    />
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTag}>INSTANT DELIVERY</Text>
                        <Text style={styles.heroTitle}>
                            Send Anything,{'\n'}
                            <Text style={styles.heroTitleAccent}>Anywhere</Text>
                        </Text>
                        <Text style={styles.heroSub}>
                            Documents, parcels, groceries{'\n'}and more — delivered in minutes.
                        </Text>
                        <TouchableOpacity
                            style={styles.sendNowBtn}
                            activeOpacity={0.88}
                            onPress={() => onNavigate?.('Location')}
                        >
                            <Text style={styles.sendNowText}>Send Now</Text>
                            <Feather name="arrow-right" size={15} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    {/* Carousel indicator dots */}
                    <View style={styles.dotsRow}>
                        <View style={[styles.dot, styles.dotActive]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>
                </View>

                {/* ── 3. FOUR 3D SERVICE CARDS ── */}
                <View style={styles.servicesGrid}>
                    {MAIN_SERVICES.map((s) => (
                        <TouchableOpacity
                            key={s.id}
                            style={styles.serviceCard}
                            activeOpacity={0.85}
                            onPress={() => handleServicePress(s.id)}
                        >
                            <LinearGradient
                                colors={s.bgGradient}
                                style={styles.serviceIconCircle}
                            >
                                <Ionicons name={s.icon} size={28} color={s.iconColor} />
                            </LinearGradient>
                            <Text style={styles.serviceTitle}>{s.title}</Text>
                            <Text style={styles.serviceSub}>{s.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── 4. SEARCH BAR + FILTER BUTTON ── */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for stores, items or services..."
                            placeholderTextColor="#9CA3AF"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
                        <Ionicons name="options-outline" size={20} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/* ── 5. CATEGORY FILTER ICONS ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRow}
                >
                    {CATEGORIES.map((c) => {
                        const active = selectedCategory === c.id;
                        return (
                            <TouchableOpacity
                                key={c.id}
                                style={styles.categoryItem}
                                activeOpacity={0.75}
                                onPress={() => setSelectedCategory(c.id)}
                            >
                                <View style={[styles.categoryIconCircle, active && styles.categoryIconCircleActive]}>
                                    {c.type === 'fa5' ? (
                                        <FontAwesome5 name={c.icon} size={18} color={active ? '#2563EB' : c.color} />
                                    ) : (
                                        <Ionicons name={c.icon} size={20} color={active ? '#2563EB' : c.color} />
                                    )}
                                </View>
                                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                                    {c.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── 6. POPULAR STORES NEAR YOU ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Popular Stores Near You</Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storesScroll}
                >
                    {POPULAR_STORES.map((store) => (
                        <TouchableOpacity
                            key={store.id}
                            style={styles.storeCard}
                            activeOpacity={0.9}
                            onPress={() => onNavigate?.('Location')}
                        >
                            <Image
                                source={store.image}
                                style={styles.storeImage}
                                resizeMode="cover"
                            />

                            {/* ETA Badge */}
                            <View style={[styles.etaBadge, { backgroundColor: store.badgeColor }]}>
                                <Ionicons name="flash" size={11} color={store.badgeTextColor} />
                                <Text style={[styles.etaText, { color: store.badgeTextColor }]}>
                                    {store.eta}
                                </Text>
                            </View>

                            {/* Store Info Footer */}
                            <View style={styles.storeFooter}>
                                <View style={[styles.storeLogoBox, { backgroundColor: store.logoBg }]}>
                                    <Text style={[styles.storeLogoText, { color: store.logoTextColor }]}>
                                        {store.logoText}
                                    </Text>
                                </View>
                                <View style={styles.storeTextCol}>
                                    <Text style={styles.storeName}>{store.name}</Text>
                                    <Text style={styles.storeCat} numberOfLines={1}>{store.category}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── 7. RECENT ORDERS ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Orders</Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <View style={styles.recentOrdersList}>
                    {RECENT_ORDERS.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            style={styles.recentOrderCard}
                            activeOpacity={0.85}
                            onPress={() => onNavigate?.('TripTracking')}
                        >
                            <Image
                                source={order.image}
                                style={styles.recentOrderThumb}
                                resizeMode="cover"
                            />
                            <View style={styles.recentOrderMeta}>
                                <Text style={styles.recentOrderTitle}>{order.title}</Text>
                                <Text style={styles.recentOrderDest}>{order.dest}</Text>
                                <Text style={styles.recentOrderTime}>{order.time}</Text>
                            </View>

                            <View style={styles.recentOrderRight}>
                                {order.statusType === 'in_progress' ? (
                                    <View style={styles.statusPillBlue}>
                                        <MaterialCommunityIcons name="truck-delivery" size={14} color="#2563EB" />
                                        <Text style={styles.statusPillBlueText}>{order.status}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.statusPillGreen}>
                                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                        <Text style={styles.statusPillGreenText}>{order.status}</Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginTop: 6 }} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bottom spacer so content doesn't get covered by floating nav */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── 8. FLOATING BOTTOM NAVIGATION BAR ── */}
            <View style={styles.bottomNavContainer}>
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        style={styles.navItem}
                        activeOpacity={0.7}
                        onPress={() => onNavigate?.('Home')}
                    >
                        <Ionicons name="home-outline" size={22} color="#6B7280" />
                        <Text style={styles.navLabel}>Home</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        activeOpacity={0.7}
                        onPress={() => onNavigate?.('Bookings')}
                    >
                        <Ionicons name="reader-outline" size={22} color="#6B7280" />
                        <Text style={styles.navLabel}>Orders</Text>
                    </TouchableOpacity>

                    {/* Elevated Send Button */}
                    <View style={styles.navCenterItem}>
                        <TouchableOpacity
                            style={styles.elevatedSendBtn}
                            activeOpacity={0.9}
                            onPress={() => onNavigate?.('Location')}
                        >
                            <LinearGradient
                                colors={['#2563EB', '#1D4ED8']}
                                style={styles.elevatedSendGrad}
                            >
                                <Ionicons name="cube" size={24} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.navLabelSend}>Send</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.navItem}
                        activeOpacity={0.7}
                        onPress={() => alert('Dropp 24/7 Priority Support is active!')}
                    >
                        <Ionicons name="headset-outline" size={22} color="#6B7280" />
                        <Text style={styles.navLabel}>Support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.navItem}
                        activeOpacity={0.7}
                        onPress={() => onNavigate?.('Profile')}
                    >
                        <Ionicons name="person-outline" size={22} color="#6B7280" />
                        <Text style={styles.navLabel}>Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAFBFC' },
    topSafeArea: { backgroundColor: '#FFF' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    headerTitleWrap: { flex: 1 },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 1,
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        maxWidth: 170,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
        maxWidth: 110,
    },

    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 24 },

    // Hero Promo Card
    heroCard: {
        marginHorizontal: 16,
        marginTop: 14,
        height: 185,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#EBF4FF',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        width: '65%',
    },
    heroContent: {
        position: 'absolute',
        top: 16,
        left: 18,
        right: '38%',
    },
    heroTag: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6B7280',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
        lineHeight: 24,
        letterSpacing: -0.4,
    },
    heroTitleAccent: {
        color: '#2563EB',
    },
    heroSub: {
        fontSize: 11,
        color: '#4B5563',
        lineHeight: 15,
        marginTop: 6,
        fontWeight: '500',
    },
    sendNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: '#111827',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    sendNowText: {
        color: '#FFF',
        fontSize: 12.5,
        fontWeight: '800',
    },
    dotsRow: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    dotActive: {
        width: 18,
        backgroundColor: '#2563EB',
    },

    // 4 Services Grid
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        marginTop: 18,
        gap: 12,
    },
    serviceCard: {
        width: (width - 44) / 2,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    serviceIconCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    serviceTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 3,
    },
    serviceSub: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 14,
        fontWeight: '500',
    },

    // Search bar
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 18,
        gap: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: '#111827',
        fontWeight: '500',
    },
    filterBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    // Categories
    categoryRow: {
        paddingHorizontal: 16,
        marginTop: 18,
        gap: 16,
    },
    categoryItem: {
        alignItems: 'center',
        width: 60,
    },
    categoryIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    categoryIconCircleActive: {
        borderColor: '#BFDBFE',
        backgroundColor: '#EFF6FF',
    },
    categoryLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 6,
        textAlign: 'center',
    },
    categoryLabelActive: {
        color: '#2563EB',
        fontWeight: '800',
    },

    // Section Titles
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.3,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
    },

    // Stores Scroll
    storesScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    storeCard: {
        width: 195,
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    storeImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#F3F4F6',
    },
    etaBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    etaText: {
        fontSize: 10.5,
        fontWeight: '800',
    },
    storeFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        gap: 10,
    },
    storeLogoBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeLogoText: {
        fontSize: 12,
        fontWeight: '900',
    },
    storeTextCol: { flex: 1 },
    storeName: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#111827',
    },
    storeCat: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },

    // Recent Orders
    recentOrdersList: {
        paddingHorizontal: 16,
        gap: 10,
    },
    recentOrderCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
        gap: 12,
    },
    recentOrderThumb: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#F9FAFB',
    },
    recentOrderMeta: { flex: 1 },
    recentOrderTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111827',
    },
    recentOrderDest: {
        fontSize: 11.5,
        color: '#6B7280',
        marginTop: 2,
    },
    recentOrderTime: {
        fontSize: 10.5,
        color: '#9CA3AF',
        marginTop: 2,
    },
    recentOrderRight: {
        alignItems: 'flex-end',
    },
    statusPillBlue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusPillBlueText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#2563EB',
    },
    statusPillGreen: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusPillGreenText: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#10B981',
    },

    // Floating Bottom Nav
    bottomNavContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 8,
    },
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 3,
    },
    navCenterItem: {
        alignItems: 'center',
        marginTop: -22,
    },
    elevatedSendBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 8,
    },
    elevatedSendGrad: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navLabelSend: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2563EB',
        marginTop: 3,
    },
});
