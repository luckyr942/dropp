import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import FoodTopHeader from '../components/foodHeader';
import FoodSearchBar from '../components/foodSearchBar';
import ServiceTabs from '../components/serviceTabs';
import HeroBanner from '../components/GenZHeroBanner';
import CategoriesRow from '../components/CategoriesRow';
import TrendingRestaurants from '../components/trendingRestaurants';
import AddressSheet from '../components/AddressSheet';
import BottomNavBar from '../../../shared/components/bottomNavBar';
import { getRestaurants } from '../api/foodApi';
import { loadDeliveryAddress, getDeviceAreaLabel } from '../utils/deliveryAddress';

// Category chip → cuisine tags in the catalog
const CATEGORY_CUISINES = {
    cafe: ['café', 'cafe', 'filter coffee', 'coffee', 'breakfast', 'tiffin'],
    bubble: ['cold drinks', 'craft drinks', 'milkshakes', 'drinks', 'tea', 'bubble tea'],
    snacks: ['snacks', 'fast food', 'burgers', 'sandwiches', 'momos', 'rolls'],
    desserts: ['desserts', 'dessert', 'ice cream', 'bakery', 'sweets'],
};

const CATEGORY_LABELS = { cafe: 'Cafés', bubble: 'Drinks', snacks: 'Snacks', desserts: 'Desserts' };
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80';

const matchesCategory = (r, category) => {
    const wanted = CATEGORY_CUISINES[category];
    if (!wanted) return true;
    return (r.cuisine || []).some((c) => wanted.includes(String(c).toLowerCase()));
};

const matchesQuery = (r, q) => {
    if (!q) return true;
    const hay = [r.name, ...(r.cuisine || []), r.address?.city].filter(Boolean).join(' ').toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
};

export default function FoodMarketScreen({ onNavigate, onSelectRestaurant }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activeNavTab, setActiveNavTab] = useState('Home');
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [locationLabel, setLocationLabel] = useState(null);
    const [savedAddress, setSavedAddress] = useState(null);
    const [showAddressSheet, setShowAddressSheet] = useState(false);

    const scrollRef = useRef(null);
    const listY = useRef(0);

    const loadRestaurants = useCallback(async () => {
        try {
            const data = await getRestaurants();
            setRestaurants(data || []);
            setLoadError(null);
        } catch (err) {
            setLoadError(err?.message || 'Please check your connection and try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadRestaurants();
    }, [loadRestaurants]);

    // Header location: saved delivery address, else the device's area, else a prompt
    useEffect(() => {
        let alive = true;
        (async () => {
            const saved = await loadDeliveryAddress();
            if (!alive) return;
            if (saved) {
                setSavedAddress(saved);
                setLocationLabel(`${saved.label} • ${saved.street}`);
                return;
            }
            const area = await getDeviceAreaLabel();
            if (alive && area) setLocationLabel(area);
        })();
        return () => { alive = false; };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadRestaurants();
    };

    const query = searchQuery.trim().toLowerCase();
    const isFiltering = !!query || !!selectedCategory;

    const filtered = useMemo(
        () => restaurants.filter((r) => matchesCategory(r, selectedCategory) && matchesQuery(r, query)),
        [restaurants, selectedCategory, query]
    );
    const trending = useMemo(
        () => [...restaurants].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 6),
        [restaurants]
    );

    const resultsTitle = isFiltering
        ? query
            ? `Results for “${searchQuery.trim()}”`
            : CATEGORY_LABELS[selectedCategory] || 'Results'
        : 'All restaurants';

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#EEF9F1" />

            <FoodTopHeader
                location={locationLabel}
                onLocationPress={() => setShowAddressSheet(true)}
                onWalletPress={() => onNavigate?.('Wallet')}
                onProfilePress={() => onNavigate?.('Profile')}
            />

            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00C26F']} tintColor="#00C26F" />
                }
            >
                <FoodSearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search restaurants or cuisines…"
                />

                {!isFiltering && (
                    <>
                        <ServiceTabs
                            activeTab="food"
                            hiddenTabs={['shop']}
                            onSelectTab={(tabId) => {
                                if (tabId === 'ride') onNavigate?.('RiderHome');
                                else if (tabId === 'delivery') onNavigate?.('PackageDetails');
                            }}
                        />
                        <HeroBanner
                            onOrderNow={() => scrollRef.current?.scrollTo({ y: listY.current, animated: true })}
                        />
                    </>
                )}

                <CategoriesRow
                    selected={selectedCategory}
                    onSelectCategory={(id) => setSelectedCategory((cur) => (id === 'more' || cur === id ? null : id))}
                />

                {!isFiltering && (
                    <TrendingRestaurants
                        restaurants={trending}
                        loading={loading}
                        error={loadError}
                        onRetry={() => { setLoading(true); loadRestaurants(); }}
                        onSelect={(r) => onSelectRestaurant?.(r)}
                    />
                )}

                {!loading && !loadError && (
                    <View style={styles.listSection} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle} numberOfLines={1}>{resultsTitle}</Text>
                            {isFiltering ? (
                                <TouchableOpacity
                                    onPress={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.clearText}>Clear</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.countText}>{restaurants.length} open</Text>
                            )}
                        </View>

                        {filtered.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="search-outline" size={28} color="#94A3B8" />
                                <Text style={styles.emptyTitle}>
                                    {restaurants.length === 0 ? 'No restaurants open right now' : 'Nothing matches that'}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {restaurants.length === 0
                                        ? 'Pull down to refresh in a little while.'
                                        : 'Try a different dish, cuisine or restaurant name.'}
                                </Text>
                            </View>
                        ) : (
                            filtered.map((r) => (
                                <RestaurantRow key={r.id} restaurant={r} onPress={() => onSelectRestaurant?.(r)} />
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            <BottomNavBar
                preset="main"
                activeTab={activeNavTab}
                onTabPress={(tab) => {
                    setActiveNavTab(tab);
                    if (tab === 'Home') onNavigate?.('Home');
                    else if (tab === 'Orders' || tab === 'Activity') onNavigate?.('Activity');
                    else if (tab === 'Wallet') onNavigate?.('Wallet');
                    else if (tab === 'Profile') onNavigate?.('Profile');
                }}
            />

            <AddressSheet
                visible={showAddressSheet}
                initialAddress={savedAddress}
                onClose={() => setShowAddressSheet(false)}
                onSaved={(saved) => {
                    setSavedAddress(saved);
                    setLocationLabel(`${saved.label} • ${saved.street}`);
                    setShowAddressSheet(false);
                }}
            />
        </SafeAreaView>
    );
}

function RestaurantRow({ restaurant: r, onPress }) {
    return (
        <TouchableOpacity style={styles.rowCard} onPress={onPress} activeOpacity={0.88}>
            <Image source={{ uri: r.image || FALLBACK_COVER }} style={styles.rowImage} resizeMode="cover" />
            <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>{r.name}</Text>
                {r.cuisines ? <Text style={styles.rowCuisine} numberOfLines={1}>{r.cuisines}</Text> : null}
                <View style={styles.rowMeta}>
                    {r.rating ? (
                        <View style={styles.metaItem}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.metaText}>{r.rating}</Text>
                        </View>
                    ) : null}
                    {r.time ? (
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={12} color="#64748B" />
                            <Text style={styles.metaText}>{r.time}</Text>
                        </View>
                    ) : null}
                    {r.address?.city ? (
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={12} color="#64748B" />
                            <Text style={styles.metaText} numberOfLines={1}>{r.address.city}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF9F1' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 120 },

    listSection: { paddingHorizontal: 16, marginTop: 14, gap: 10 },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    listTitle: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
        letterSpacing: -0.4,
    },
    clearText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#00A968' },
    countText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: '#64748B' },

    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E8EEE9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    rowImage: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#E2E8F0' },
    rowBody: { flex: 1, gap: 3 },
    rowName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#0F172A' },
    rowCuisine: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#64748B' },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 3 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
    metaText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: '#334155' },

    emptyBox: {
        alignItems: 'center',
        gap: 6,
        paddingVertical: 32,
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E8EEE9',
    },
    emptyTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#0F172A' },
    emptyText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: '#64748B', textAlign: 'center' },
});
