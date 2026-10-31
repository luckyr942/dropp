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

// Avatar background colours — cycles through for each restaurant
const AVATAR_COLORS = [
    '#0F172A', '#2D3B2D', '#7A1C1C', '#1E3A8A',
    '#166534', '#44337A', '#7B341E', '#1A365D',
];

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=700&auto=format&fit=crop&q=80';

const initialsOf = (name) =>
    (name || 'R')
        .replace(/[^A-Za-z0-9 ]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

export default function TrendingRestaurants({
    restaurants = [],
    loading = false,
    error = null,
    onRetry,
    onSelect,
    title = 'Trending Near You',
    subtitle = 'Popular cafes, restaurants and more around you',
    emptyText = 'No restaurants are open right now. Pull down to refresh.',
}) {
    const [favorites, setFavorites] = useState({});

    const toggleFavorite = (id) => {
        setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const header = (
        <View style={styles.sectionHeader}>
            <View style={styles.titleCol}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.section}>
                {header}
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

    if (error) {
        return (
            <View style={styles.section}>
                {header}
                <View style={styles.stateBox}>
                    <Ionicons name="cloud-offline-outline" size={30} color="#94A3B8" />
                    <Text style={styles.stateTitle}>Couldn't load restaurants</Text>
                    <Text style={styles.stateText}>{error}</Text>
                    {onRetry ? (
                        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
                            <Ionicons name="refresh" size={15} color="#FFFFFF" />
                            <Text style={styles.retryText}>Try again</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );
    }

    if (!restaurants || restaurants.length === 0) {
        return (
            <View style={styles.section}>
                {header}
                <View style={styles.stateBox}>
                    <Ionicons name="restaurant-outline" size={30} color="#94A3B8" />
                    <Text style={styles.stateText}>{emptyText}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.section}>
            {header}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                decelerationRate="fast"
            >
                {restaurants.map((r, idx) => {
                    const rId = r.id || r._id;
                    const isFav = !!favorites[rId];
                    const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const cuisineStr = Array.isArray(r.cuisine) ? r.cuisine.join(' • ') : r.cuisines || '';

                    return (
                        <TouchableOpacity
                            key={rId}
                            style={styles.card}
                            onPress={() => onSelect && onSelect(r)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.coverBox}>
                                <Image source={{ uri: r.image || FALLBACK_COVER }} style={styles.cover} resizeMode="cover" />
                                <View style={styles.topRow}>
                                    {r.rating ? (
                                        <View style={styles.rankPill}>
                                            <Ionicons name="star" size={11} color="#F59E0B" />
                                            <Text style={styles.rankText}>{r.rating}</Text>
                                        </View>
                                    ) : <View />}
                                    <TouchableOpacity
                                        style={styles.heartBtn}
                                        onPress={() => toggleFavorite(rId)}
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
                                {r.time ? (
                                    <View style={styles.etaBadge}>
                                        <Ionicons name="time-outline" size={12} color="#0F172A" />
                                        <Text style={styles.etaText}>{r.time}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                                        <Text style={styles.avatarText}>{initialsOf(r.name)}</Text>
                                    </View>
                                    <View style={styles.nameCol}>
                                        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                                        {r.address?.city ? (
                                            <Text style={styles.reviews} numberOfLines={1}>{r.address.city}</Text>
                                        ) : null}
                                    </View>
                                </View>

                                {cuisineStr ? <Text style={styles.cuisine} numberOfLines={1}>{cuisineStr}</Text> : null}

                                <View style={styles.tagRow}>
                                    {r.minOrder ? (
                                        <View style={styles.discountTag}>
                                            <Ionicons name="bag-outline" size={10} color="#047857" />
                                            <Text style={styles.discountText}>Min ₹{r.minOrder}</Text>
                                        </View>
                                    ) : null}
                                    {r.pricing?.costForTwo ? (
                                        <View style={[styles.promoTag, styles.promoGreenBg]}>
                                            <Ionicons name="people-outline" size={11} color="#047857" />
                                            <Text style={[styles.promoText, styles.promoGreenText]} numberOfLines={1}>
                                                ₹{r.pricing.costForTwo} for two
                                            </Text>
                                        </View>
                                    ) : null}
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

    stateBox: {
        marginHorizontal: 16,
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E8EEE9',
    },
    stateTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#0F172A',
    },
    stateText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12.5,
        color: '#64748B',
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#00A859',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 18,
        marginTop: 6,
    },
    retryText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12.5,
        color: '#FFFFFF',
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
