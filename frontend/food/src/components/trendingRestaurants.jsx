import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Avatar background colours — cycles through for each restaurant
const AVATAR_COLORS = [
    '#0F172A', '#2D3B2D', '#7A1C1C', '#1E3A8A',
    '#166534', '#44337A', '#7B341E', '#1A365D',
];

const FALLBACK_RESTAURANTS = [
    {
        id: 'bawarchee-biryani',
        name: 'Bawarchee Biryani House',
        cuisine: ['Mughlai', 'Biryani', 'North Indian'],
        rating: '4.5',
        reviews: '1.2K',
        time: '30–40 min',
        deliveryTimeMins: 35,
        minOrder: 149,
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'the-brew-room',
        name: 'The Brew Room',
        cuisine: ['GenZ Drinks', 'Coffee', 'Desserts'],
        rating: '4.8',
        reviews: '950',
        time: '20–30 min',
        deliveryTimeMins: 25,
        minOrder: 99,
        image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'maa-ka-dhaba',
        name: 'Maa ka Dhaba',
        cuisine: ['Thali', 'North Indian', 'Homestyle'],
        rating: '4.6',
        reviews: '2.4K',
        time: '25–35 min',
        deliveryTimeMins: 30,
        minOrder: 120,
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'pizza-palace',
        name: 'Pizza Palace',
        cuisine: ['Pizza', 'Italian', 'Fast Food'],
        rating: '4.4',
        reviews: '810',
        time: '25–35 min',
        deliveryTimeMins: 30,
        minOrder: 199,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'dosa-king',
        name: 'Dosa King',
        cuisine: ['South Indian', 'Tiffin', 'Breakfast'],
        rating: '4.7',
        reviews: '1.8K',
        time: '20–30 min',
        deliveryTimeMins: 25,
        minOrder: 99,
        image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'dragon-wok',
        name: 'Dragon Wok Express',
        cuisine: ['Chinese', 'Momos', 'Asian'],
        rating: '4.3',
        reviews: '640',
        time: '30–40 min',
        deliveryTimeMins: 35,
        minOrder: 149,
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'truffles-bengaluru',
        name: 'Truffles — Bengaluru Burgers',
        cuisine: ['Burgers', 'Sandwiches', 'Milkshakes'],
        rating: '4.7',
        reviews: '3.1K',
        time: '25–35 min',
        deliveryTimeMins: 28,
        minOrder: 149,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'ctr-bengaluru',
        name: 'CTR — Central Tiffin Room',
        cuisine: ['South Indian', 'Breakfast', 'Filter Coffee'],
        rating: '4.8',
        reviews: '5.2K',
        time: '20–30 min',
        deliveryTimeMins: 22,
        minOrder: 79,
        image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'empire-bengaluru',
        name: 'Empire Restaurant',
        cuisine: ['Biryani', 'Kebabs', 'Rolls', 'Mughlai'],
        rating: '4.5',
        reviews: '4.8K',
        time: '28–38 min',
        deliveryTimeMins: 30,
        minOrder: 149,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'toit-bengaluru',
        name: 'Toit Taproom',
        cuisine: ['Brewery', 'Burgers', 'Bar Food', 'Craft Drinks'],
        rating: '4.6',
        reviews: '2.9K',
        time: '30–45 min',
        deliveryTimeMins: 35,
        minOrder: 299,
        image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=700&auto=format&fit=crop&q=85',
    },
];


export default function TrendingRestaurants({
    restaurants,
    loading = false,
    onSelect,
}) {
    const [favorites, setFavorites] = useState({});

    const toggleFavorite = (id) => {
        setFavorites((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    if (loading) {
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <View style={styles.titleCol}>
                        <Text style={styles.sectionTitle}>Trending Near You</Text>
                        <Text style={styles.sectionSubtitle}>Popular cafes, restaurants and more around you</Text>
                    </View>
                </View>
                <View style={styles.loadingRow}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.skeletonCard}>
                            <View style={styles.skeletonImg} />
                            <View style={styles.skeletonLine} />
                            <View style={[styles.skeletonLine, { width: '60%' }]} />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    const displayedRestaurants = (restaurants && restaurants.length > 0)
        ? restaurants
        : FALLBACK_RESTAURANTS;

    return (
        <View style={styles.section}>
            {/* 1. Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.titleCol}>
                    <Text style={styles.sectionTitle}>Trending Near You</Text>
                    <Text style={styles.sectionSubtitle}>
                        Popular cafes, restaurants and more around you
                    </Text>
                </View>
                <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn}>
                    <Text style={styles.seeAll}>See all</Text>
                    <Ionicons name="chevron-forward" size={15} color="#00C26F" />
                </TouchableOpacity>
            </View>

            {/* 2. Horizontal Cards */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                decelerationRate="fast"
            >
                {displayedRestaurants.map((r, idx) => {
                    const rId = r.id || r._id;
                    const isFav = !!favorites[rId];
                    const initials = (r.name || 'R')
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0] || '')
                        .join('')
                        .toUpperCase();
                    const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const cuisineStr = Array.isArray(r.cuisine)
                        ? r.cuisine.join(' • ')
                        : r.cuisines || r.cuisine || '';
                    const coverImg = r.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85';

                    return (
                        <TouchableOpacity
                            key={r.id || r._id}
                            style={styles.card}
                            onPress={() => onSelect && onSelect(r)}
                            activeOpacity={0.9}
                        >
                            {/* Cover Image */}
                            <View style={styles.coverBox}>
                                <Image
                                    source={{ uri: coverImg }}
                                    style={styles.cover}
                                    resizeMode="cover"
                                />

                                {/* Top: Rating pill + Heart */}
                                <View style={styles.topRow}>
                                    <View style={styles.rankPill}>
                                        <Ionicons name="star" size={11} color="#F59E0B" />
                                        <Text style={styles.rankText}>{r.rating}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.heartBtn}
                                        onPress={() => toggleFavorite(r.id || r._id)}
                                        activeOpacity={0.8}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons
                                            name={isFav ? 'heart' : 'heart-outline'}
                                            size={16}
                                            color={isFav ? '#EF4444' : '#FFFFFF'}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Bottom: ETA */}
                                <View style={styles.etaBadge}>
                                    <Ionicons name="time-outline" size={12} color="#0F172A" />
                                    <Text style={styles.etaText}>
                                        {r.time || r.eta || `${r.deliveryTimeMins} min`}
                                    </Text>
                                </View>
                            </View>

                            {/* Card Body */}
                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                                        <Text style={styles.avatarText}>{initials}</Text>
                                    </View>
                                    <View style={styles.nameCol}>
                                        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={12} color="#F59E0B" />
                                            <Text style={styles.rating}>{r.rating}</Text>
                                            <Text style={styles.reviews}>
                                                {r.reviews ? `(${r.reviews})` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <Text style={styles.cuisine} numberOfLines={1}>{cuisineStr}</Text>

                                {/* Min Order tag */}
                                <View style={styles.tagRow}>
                                    <View style={styles.discountTag}>
                                        <Ionicons name="bag-outline" size={10} color="#047857" />
                                        <Text style={styles.discountText}>
                                            Min ₹{r.minOrder || r.pricing?.minOrder || 99}
                                        </Text>
                                    </View>
                                    <View style={styles.promoTag}>
                                        <Ionicons name="bicycle-outline" size={11} color="#047857" />
                                        <Text style={[styles.promoText, styles.promoGreenText]}
                                            numberOfLines={1}>
                                            Free above ₹299
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: 4,
        marginBottom: 6,
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },

    titleCol: {
        flex: 1,
        gap: 2,
    },

    sectionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
        letterSpacing: -0.4,
    },

    sectionSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },

    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 4,
        paddingHorizontal: 2,
    },

    seeAll: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#00A968',
    },

    row: {
        paddingHorizontal: 16,
        gap: 12,
        paddingBottom: 6,
    },

    card: {
        width: 224,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E8EEE9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 2,
    },

    coverBox: {
        height: 116,
        position: 'relative',
        backgroundColor: '#E2E8F0',
    },

    cover: {
        width: '100%',
        height: '100%',
    },

    topRow: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 5,
    },

    rankPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3.5,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        maxWidth: 155,
    },

    rankText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#FFFFFF',
        fontSize: 9.5,
        flexShrink: 1,
    },

    heartBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    etaBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3.5,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4.5,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },

    etaText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#0F172A',
        fontSize: 9.5,
    },

    info: {
        padding: 10,
        gap: 6,
    },

    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        color: '#FFFFFF',
        fontSize: 10.5,
    },

    nameCol: {
        flex: 1,
        minWidth: 0,
    },

    name: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#0F172A',
        letterSpacing: -0.2,
    },

    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 1,
    },

    rating: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10.5,
        color: '#0F172A',
    },

    reviews: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 9.5,
        color: '#64748B',
    },

    cuisine: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 10,
        color: '#64748B',
    },

    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
    },

    discountTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E5F7ED',
        paddingHorizontal: 7,
        paddingVertical: 5,
        borderRadius: 7,
    },

    discountText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#047857',
        fontSize: 9.5,
    },

    promoTag: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderRadius: 7,
    },

    promoRedBg: {
        backgroundColor: '#FFF1F2',
    },

    promoRedText: {
        color: '#E11D48',
    },

    promoGreenBg: {
        backgroundColor: '#ECFDF5',
    },

    promoGreenText: {
        color: '#047857',
    },

    promoText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        flex: 1,
        flexShrink: 1,
        fontSize: 8.5,
    },

    loadingRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 14,
    },
    skeletonCard: {
        width: 170,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    skeletonImg: {
        width: '100%',
        height: 100,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        backgroundColor: '#E2E8F0',
        width: '85%',
    },
});
