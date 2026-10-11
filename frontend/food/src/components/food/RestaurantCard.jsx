import React, { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function RestaurantCard({ item, onPress, onFavorite }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => {
      const next = !prev;
      onFavorite && onFavorite(item, next);
      return next;
    });
  };

  const isDeliveryOffer = item.offerSecondary?.toLowerCase().includes('delivery');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(item)}
      activeOpacity={0.9}
    >
      {/* 1. Cover Photo Area */}
      <View style={styles.photoWrap}>
        <Image source={{ uri: item.image }} style={styles.photo} resizeMode="cover" />

        {/* Top Badges (Rank & Heart) */}
        <View style={styles.topRow}>
          {/* Rank Badge */}
          <View style={styles.rankPill}>
            {item.badgeIcon === 'flame' && <Ionicons name="flame" size={12} color="#F97316" />}
            {item.badgeIcon === 'trophy' && <Ionicons name="trophy" size={12} color="#FBBF24" />}
            {item.badgeIcon === 'heart' && <Ionicons name="heart" size={12} color="#F43F5E" />}
            {item.badgeIcon === 'trending-up' && <Ionicons name="trending-up" size={12} color="#34D399" />}
            <Text style={styles.rankText} numberOfLines={1}>
              {item.badge}
            </Text>
          </View>

          {/* Heart / Favorite Button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={handleToggleFavorite}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={17}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Time Pill */}
        <View style={styles.timePill}>
          <Ionicons name="time-outline" size={12} color="#0F172A" />
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>

      {/* 2. Body Details */}
      <View style={styles.body}>
        {/* Avatar + Name + Rating */}
        <View style={styles.headerRow}>
          {/* Restaurant Initials Avatar */}
          <View style={[styles.avatar, { backgroundColor: item.initialsBg || '#0F172A' }]}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>

          {/* Title & Stats */}
          <View style={styles.titleCol}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.rating}>{item.rating}</Text>
              <Text style={styles.reviews}>({item.reviews})</Text>
            </View>
          </View>
        </View>

        {/* Cuisines Subtitle */}
        <Text style={styles.cuisines} numberOfLines={1}>
          {item.cuisines}
        </Text>

        {/* 3. Offer Badges Row */}
        <View style={styles.offersRow}>
          {/* Primary Offer (Green Pill) */}
          <View style={styles.offerPrimary}>
            <Ionicons name="pricetag" size={10} color="#047857" />
            <Text style={styles.offerPrimaryText} numberOfLines={1}>
              {item.offerPrimary}
            </Text>
          </View>

          {/* Secondary Offer (Red delivery pill or light green coupon tag) */}
          <View
            style={[
              styles.offerSecondary,
              isDeliveryOffer ? styles.offerRedBg : styles.offerGreenBg,
            ]}
          >
            <Ionicons
              name={isDeliveryOffer ? 'bicycle-outline' : 'pricetag-outline'}
              size={11}
              color={isDeliveryOffer ? '#E11D48' : '#047857'}
            />
            <Text
              style={[
                styles.offerSecondaryText,
                isDeliveryOffer ? styles.offerRedText : styles.offerGreenText,
              ]}
              numberOfLines={1}
            >
              {item.offerSecondary}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(RestaurantCard);

const styles = StyleSheet.create({
  card: {
    width: 285,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 4,
  },
  photoWrap: {
    height: 155,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  topRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  heartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: 12,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  titleCol: {
    flex: 1,
  },
  name: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  rating: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviews: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cuisines: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  offersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  offerPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#E5F7ED',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerPrimaryText: {
    color: '#047857',
    fontSize: 10.5,
    fontWeight: '800',
  },
  offerSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerRedBg: {
    backgroundColor: '#FFF1F2',
  },
  offerRedText: {
    color: '#E11D48',
  },
  offerGreenBg: {
    backgroundColor: '#ECFDF5',
  },
  offerGreenText: {
    color: '#047857',
  },
  offerSecondaryText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
