import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    FlatList,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import { FOOD_CATEGORIES, PROMO_BANNERS, foodApi } from '../api/foodApi';
import BottomNavBar from '../../../shared/components/bottomNavBar';

export default function FoodMarketScreen({ onNavigate, onSelectRestaurant }) {
    const { theme, isDark } = useTheme();
    const [restaurants, setRestaurants] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        foodApi.getRestaurants().then((data) => setRestaurants(data));
    }, []);

    const filteredRestaurants = restaurants.filter((r) => {
        const matchesCategory =
            selectedCategory === 'all' ||
            r.cuisine.toLowerCase().includes(selectedCategory);
        const matchesSearch =
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header: Location & Search */}
            <View style={styles.header}>
                <View style={styles.locationPill}>
                    <Ionicons name="location" size={16} color={theme.primaryGreen} />
                    <Text style={[styles.locTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        Green Park Main, New Delhi
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
                </View>

                {/* Search Bar */}
                <View style={[styles.searchBox, { backgroundColor: theme.surface }]}>
                    <Ionicons name="search-outline" size={18} color={theme.placeholder} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search for burgers, pizza, sushi..."
                        placeholderTextColor={theme.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.placeholder} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Promo Banners Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bannerRow}>
                    {PROMO_BANNERS.map((promo) => (
                        <TouchableOpacity
                            key={promo.id}
                            style={[styles.bannerCard, { backgroundColor: promo.color }]}
                            activeOpacity={0.85}
                            onPress={() => alert(`Applied Code ${promo.code}!`)}
                        >
                            <View style={{ flex: 1 }}>
                                <View style={styles.promoChip}>
                                    <Text style={styles.promoChipText}>SPECIAL OFFER</Text>
                                </View>
                                <Text style={styles.promoTitle}>{promo.title}</Text>
                                <Text style={styles.promoSub}>{promo.subtitle}</Text>
                            </View>
                            <Ionicons name="sparkles" size={36} color={promo.accentColor} style={{ opacity: 0.8 }} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Food Categories Slider */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>What's on your mind?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                    {FOOD_CATEGORIES.map((cat) => {
                        const active = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.catCard,
                                    {
                                        backgroundColor: active ? theme.primaryGreen : theme.surface,
                                    },
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.catIconBox, { backgroundColor: active ? '#000' : theme.inputBg }]}>
                                    <Ionicons
                                        name={cat.icon}
                                        size={20}
                                        color={active ? theme.primaryGreen : theme.textPrimary}
                                    />
                                </View>
                                <Text style={[styles.catLabel, { color: active ? '#000' : theme.textPrimary }]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Nearby Restaurants Section */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>
                    Top Nearby Kitchens
                </Text>

                <View style={styles.restList}>
                    {filteredRestaurants.map((rest) => (
                        <TouchableOpacity
                            key={rest.id}
                            style={[styles.restCard, { backgroundColor: theme.surface }]}
                            onPress={() => onSelectRestaurant && onSelectRestaurant(rest)}
                            activeOpacity={0.88}
                        >
                            {/* Restaurant Cover Image & Discount Badge */}
                            <View style={styles.coverWrapper}>
                                <Image source={{ uri: rest.image }} style={styles.coverImg} />
                                {rest.discount && (
                                    <View style={[styles.discountBadge, { backgroundColor: theme.primaryGreen }]}>
                                        <Text style={styles.discountText}>🔥 {rest.discount}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Restaurant Information */}
                            <View style={styles.restMeta}>
                                <View style={styles.restTitleRow}>
                                    <Text style={[styles.restName, { color: theme.textPrimary }]}>{rest.name}</Text>
                                    <View style={[styles.ratingBadge, { backgroundColor: theme.tierCardActiveBg }]}>
                                        <Ionicons name="star" size={12} color={theme.starGold} />
                                        <Text style={[styles.ratingText, { color: theme.primaryGreen }]}>{rest.rating}</Text>
                                    </View>
                                </View>

                                <Text style={[styles.cuisineText, { color: theme.textSecondary }]}>{rest.cuisine}</Text>

                                <View style={styles.footerRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="time-outline" size={14} color={theme.primaryGreen} />
                                        <Text style={[styles.footerText, { color: theme.textPrimary }]}>{rest.deliveryTime}</Text>
                                    </View>
                                    <Text style={[styles.dotSeparator, { color: theme.textSecondary }]}>•</Text>
                                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>{rest.distance}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <BottomNavBar activeTab="Food" onTabPress={(tab) => onNavigate && onNavigate(tab)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
    locationPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    locTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 16,
        paddingHorizontal: 14,
        gap: 10,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
    bannerRow: { gap: 12, marginVertical: 12 },
    bannerCard: {
        width: 260,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promoChip: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    promoChipText: { color: '#FFF', fontWeight: '900', fontSize: 10 },
    promoTitle: { color: '#FFF', fontWeight: '900', fontSize: 16 },
    promoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    categoryRow: { gap: 10, marginBottom: 12 },
    catCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 8,
    },
    catIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catLabel: { fontWeight: '800', fontSize: 13 },
    restList: { gap: 16 },
    restCard: { borderRadius: 24, overflow: 'hidden', elevation: 4 },
    coverWrapper: { height: 160, position: 'relative' },
    coverImg: { width: '100%', height: '100%' },
    discountBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    discountText: { color: '#000', fontWeight: '900', fontSize: 11 },
    restMeta: { padding: 16 },
    restTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    restName: { fontSize: 18, fontWeight: '900' },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    ratingText: { fontWeight: '900', fontSize: 12 },
    cuisineText: { fontSize: 12, marginTop: 4 },
    footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
    footerText: { fontSize: 12, fontWeight: '700' },
    dotSeparator: { fontSize: 12 },
});
