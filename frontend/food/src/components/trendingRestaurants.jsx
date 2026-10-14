import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RESTAURANTS = [
    {
        id: 'daily-grind',
        name: 'The Daily Grind',
        initials: 'DG',
        initialsBg: '#0F172A',
        cuisine: 'Café • Coffee • Snacks',
        rating: '4.8',
        reviews: '2.1K',
        eta: '15–25 min',
        badge: '#1 in Cafés',
        badgeIcon: 'flame',
        badgeColor: '#F97316',
        offerPrimary: '15% OFF',
        offerSecondary: 'Free delivery above ₹149',
        isDeliveryOffer: true,
        image:
            'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'brew-bloom',
        name: 'Brew & Bloom',
        initials: 'B',
        initialsBg: '#2D3B2D',
        cuisine: 'Coffee • Desserts • Healthy',
        rating: '4.6',
        reviews: '1.3K',
        eta: '20–30 min',
        badge: 'Top Rated',
        badgeIcon: 'trophy',
        badgeColor: '#FBBF24',
        offerPrimary: 'Flat ₹50 OFF',
        offerSecondary: 'Use DROPP50',
        isDeliveryOffer: false,
        image:
            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'burger-district',
        name: 'Burger District',
        initials: 'BD',
        initialsBg: '#7A1C1C',
        cuisine: 'Burgers • Truffle Fries',
        rating: '4.7',
        reviews: '1.8K',
        eta: '20–30 min',
        badge: '#3 in Burgers',
        badgeIcon: 'trending-up',
        badgeColor: '#34D399',
        offerPrimary: '20% OFF',
        offerSecondary: 'Free sides above ₹299',
        isDeliveryOffer: true,
        image:
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85',
    },
    {
        id: 'roast-room',
        name: 'The Roast Room',
        initials: 'RR',
        initialsBg: '#3B2314',
        cuisine: 'Coffee • Bakery • Brunch',
        rating: '4.7',
        reviews: '890',
        eta: '20–30 min',
        badge: 'Local Favourite',
        badgeIcon: 'heart',
        badgeColor: '#F43F5E',
        offerPrimary: '10% OFF',
        offerSecondary: 'Use ROAST10',
        isDeliveryOffer: false,
        image:
            'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&auto=format&fit=crop&q=85',
    },
];

export default function TrendingRestaurants({ onSelect }) {
    const [favorites, setFavorites] = useState({});

    const toggleFavorite = (id) => {
        setFavorites((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    return (
        <View style={styles.section}>
            {/* 1. Header with Title, Subtitle, and See All */}
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

            {/* 2. Horizontal Cards Carousel */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                decelerationRate="fast"
            >
                {RESTAURANTS.map((r) => {
                    const isFav = !!favorites[r.id];

                    return (
                        <TouchableOpacity
                            key={r.id}
                            style={styles.card}
                            onPress={() => onSelect && onSelect(r)}
                            activeOpacity={0.9}
                        >
                            {/* Cover Image Area */}
                            <View style={styles.coverBox}>
                                <Image source={{ uri: r.image }} style={styles.cover} resizeMode="cover" />

                                {/* Top Badges (Rank & Heart) */}
                                <View style={styles.topRow}>
                                    {/* Rank Pill */}
                                    <View style={styles.rankPill}>
                                        <Ionicons name={r.badgeIcon} size={11} color={r.badgeColor} />
                                        <Text style={styles.rankText} numberOfLines={1}>
                                            {r.badge}
                                        </Text>
                                    </View>

                                    {/* Heart Button */}
                                    <TouchableOpacity
                                        style={styles.heartBtn}
                                        onPress={() => toggleFavorite(r.id)}
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

                                {/* Bottom Delivery Time Pill */}
                                <View style={styles.etaBadge}>
                                    <Ionicons name="time-outline" size={12} color="#0F172A" />
                                    <Text style={styles.etaText}>{r.eta}</Text>
                                </View>
                            </View>

                            {/* Card Body Details */}
                            <View style={styles.info}>
                                {/* Avatar + Restaurant Name & Rating */}
                                <View style={styles.nameRow}>
                                    <View style={[styles.avatar, { backgroundColor: r.initialsBg }]}>
                                        <Text style={styles.avatarText}>{r.initials}</Text>
                                    </View>

                                    <View style={styles.nameCol}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {r.name}
                                        </Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={12} color="#F59E0B" />
                                            <Text style={styles.rating}>{r.rating}</Text>
                                            <Text style={styles.reviews}>({r.reviews})</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Cuisines */}
                                <Text style={styles.cuisine} numberOfLines={1}>
                                    {r.cuisine}
                                </Text>

                                {/* Offer Tags Row */}
                                <View style={styles.tagRow}>
                                    {/* Primary Offer (Green Pill) */}
                                    <View style={styles.discountTag}>
                                        <Ionicons name="pricetag" size={10} color="#047857" />
                                        <Text style={styles.discountText}>{r.offerPrimary}</Text>
                                    </View>

                                    {/* Secondary Offer (Red Delivery or Green Code) */}
                                    <View
                                        style={[
                                            styles.promoTag,
                                            r.isDeliveryOffer ? styles.promoRedBg : styles.promoGreenBg,
                                        ]}
                                    >
                                        <Ionicons
                                            name={r.isDeliveryOffer ? 'bicycle-outline' : 'pricetag-outline'}
                                            size={11}
                                            color={r.isDeliveryOffer ? '#E11D48' : '#047857'}
                                        />
                                        <Text
                                            style={[
                                                styles.promoText,
                                                r.isDeliveryOffer ? styles.promoRedText : styles.promoGreenText,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {r.offerSecondary}
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
});
