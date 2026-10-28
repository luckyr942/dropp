// frontend/shared/voice/components/AuraTimeLineCards.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Safe number parser to prevent any 'NaN' on screen
function safeNum(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatInr(val, fallback = 0) {
  const n = safeNum(val, fallback);
  return '₹' + n.toLocaleString('en-IN');
}

function cleanAddress(addr, fallback = 'Location') {
  if (!addr) return fallback;
  if (typeof addr !== 'string') {
    if (typeof addr.address === 'string') return cleanAddress(addr.address, fallback);
    return fallback;
  }
  return addr.replace(/,\s*\d{6}\b/g, '').replace(/,\s*India\b/gi, '').split(',')[0].trim() || fallback;
}

export default function AuraTimeLineCards({
  rideEstimate,
  bookedRide,
  selectedTier = 'cab_economy',
  onSelectTier,
  onConfirmRide,
  onCancelRide,
  onTrackRide,
  draftOrder,
  placedOrder,
  onConfirmOrder,
  onCancelOrder,
  onTrackOrder,
  restaurants = [],
  onSelectRestaurant,
  onEditRide,
  onEditFood,
}) {
  const hasRideEstimate = Boolean(rideEstimate);
  const hasBookedRide = Boolean(bookedRide);
  const hasDraftOrder = Boolean(draftOrder);
  const hasPlacedOrder = Boolean(placedOrder);
  const hasRestaurants = Boolean(restaurants && restaurants.length > 0 && !draftOrder && !placedOrder);

  if (!hasRideEstimate && !hasBookedRide && !hasDraftOrder && !hasPlacedOrder && !hasRestaurants) {
    return null;
  }

  // ── 1. RIDE ESTIMATE DATA ──
  const fares = (rideEstimate?.fares?.length ? rideEstimate.fares : rideEstimate?.tiers?.length ? rideEstimate.tiers : null) || [
    { type: 'bike', name: 'Dropp Bike', fare: safeNum(rideEstimate?.fare, 49), etaMins: 3, icon: 'bicycle' },
    { type: 'auto', name: 'Dropp Auto', fare: Math.round(safeNum(rideEstimate?.fare, 49) * 1.3), etaMins: 4, icon: 'car-outline' },
    { type: 'cab_economy', name: 'Dropp Go', fare: Math.round(safeNum(rideEstimate?.fare, 49) * 1.8), etaMins: 5, icon: 'car-sport' },
    { type: 'cab_premium', name: 'Dropp Premier', fare: Math.round(safeNum(rideEstimate?.fare, 49) * 2.4), etaMins: 6, icon: 'car-sport' },
  ];

  const currentTier = fares.find((f) => f.type === selectedTier) || fares[0];
  const pickupText = cleanAddress(rideEstimate?.pickup?.address || rideEstimate?.pickup || rideEstimate?.origin, 'Your Location');
  const dropText = cleanAddress(rideEstimate?.drop?.address || rideEstimate?.drop || rideEstimate?.destination, 'Destination');
  const distanceKm = safeNum(rideEstimate?.distanceKm, 12);
  const durationMins = safeNum(rideEstimate?.durationMins, 24);

  // ── 2. FOOD DRAFT DATA ──
  const foodItems = draftOrder?.items || [];
  const draftRestName = draftOrder?.restaurantName || draftOrder?.restaurant?.name || draftOrder?.notes?.replace(/^From\s+/i, '') || 'Order Draft';
  const foodTotal = safeNum(draftOrder?.totalAmount || draftOrder?.total, 240);

  return (
    <View style={styles.container}>
      {/* ─────────────────────────────────────────────────────────────
          CARD 1: RIDE OPTIONS (Interactive Tiers Selector)
      ───────────────────────────────────────────────────────────── */}
      {hasRideEstimate && (
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBoxGreen}>
              <Ionicons name="car-sport" size={20} color="#00A859" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Ride Options</Text>
                {onEditRide && (
                  <TouchableOpacity onPress={onEditRide} style={styles.editPill} activeOpacity={0.7}>
                    <Text style={styles.editPillText}>Edit</Text>
                    <Ionicons name="chevron-forward" size={11} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.routeText} numberOfLines={1}>
                {pickupText} → {dropText}
              </Text>
            </View>
          </View>

          {/* Distance & Duration Badge */}
          <View style={styles.routeMetaPill}>
            <Ionicons name="location" size={13} color="#00A859" />
            <Text style={styles.routeMetaText}>
              {distanceKm} km • ~{durationMins} mins road journey
            </Text>
          </View>

          {/* Horizontal Vehicle Tiers Selector */}
          <Text style={styles.sectionLabel}>Select Vehicle Type:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tierScrollContent}
            style={styles.tierScrollView}
          >
            {fares.map((tier, idx) => {
              const isSelected = selectedTier === tier.type;
              const iconName =
                tier.icon === 'bicycle' || tier.type === 'bike'
                  ? 'bicycle'
                  : tier.type === 'auto'
                  ? 'car-outline'
                  : 'car-sport';

              return (
                <TouchableOpacity
                  key={tier.type || idx}
                  style={[styles.tierBox, isSelected && styles.tierBoxSelected]}
                  onPress={() => onSelectTier?.(tier.type)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tierTopRow}>
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={isSelected ? '#00A859' : '#64748B'}
                    />
                    {isSelected ? (
                      <View style={styles.activeRadioSelected}>
                        <View style={styles.activeRadioInner} />
                      </View>
                    ) : (
                      <View style={styles.activeRadioUnselected} />
                    )}
                  </View>

                  <Text
                    style={[styles.tierName, isSelected && styles.tierNameSelected]}
                    numberOfLines={1}
                  >
                    {tier.name}
                  </Text>

                  <Text
                    style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}
                    numberOfLines={1}
                  >
                    {formatInr(tier.fare)}
                  </Text>

                  <Text style={[styles.tierEta, isSelected && styles.tierEtaSelected]}>
                    {tier.etaMins || 4} min away
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancelRide}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmRideBtn}
              onPress={() => onConfirmRide?.(selectedTier)}
              activeOpacity={0.88}
            >
              <Text style={styles.confirmRideBtnText}>
                Book {currentTier?.name} • {formatInr(currentTier?.fare)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CARD 2: BOOKED RIDE ACTIVE (Confirmed + OTP)
      ───────────────────────────────────────────────────────────── */}
      {hasBookedRide && (
        <View style={[styles.card, { borderColor: '#00A859', borderWidth: 1.5 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBoxGreen}>
              <Ionicons name="checkmark-circle" size={22} color="#00A859" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: '#00A859' }]}>
                {bookedRide.rideType === 'bike' ? 'Dropp Bike Confirmed!' : bookedRide.rideType === 'auto' ? 'Dropp Auto Confirmed!' : 'Cab Confirmed!'}
              </Text>
              <Text style={styles.routeText}>
                Driver is on the way to your location
              </Text>
            </View>
          </View>

          <View style={styles.driverInfoCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={20} color="#00A859" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>
                {bookedRide.driver?.name || bookedRide.driverName || 'Vikram Singh'}
              </Text>
              <Text style={styles.driverVehicle}>
                {bookedRide.driver?.vehicleModel || bookedRide.vehicleModel || 'Swift Dzire'} • {bookedRide.driver?.vehicleNumber || bookedRide.vehicleNumber || 'DL 1Z A 4421'}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#EAB308" />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
          </View>

          {/* Large Prominent START OTP Pill */}
          <View style={styles.otpBanner}>
            <View>
              <Text style={styles.otpLabel}>SHARE OTP WITH DRIVER</Text>
              <Text style={styles.otpNumber}>{bookedRide.otp || '4821'}</Text>
            </View>
            <View style={styles.otpShield}>
              <Ionicons name="shield-checkmark" size={24} color="#00A859" />
            </View>
          </View>

          {/* Track Button */}
          <TouchableOpacity
            style={styles.trackRideBtn}
            onPress={onTrackRide}
            activeOpacity={0.88}
          >
            <Ionicons name="map-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.trackRideBtnText}>Track Ride Live on Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CARD 3: ORDER DRAFT (Itemized Food List + No NaN)
      ───────────────────────────────────────────────────────────── */}
      {hasDraftOrder && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBoxOrange}>
              <Ionicons name="receipt-outline" size={20} color="#FF7A00" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{draftRestName}</Text>
                {onEditFood && (
                  <TouchableOpacity onPress={onEditFood} style={styles.editPill} activeOpacity={0.7}>
                    <Text style={styles.editPillText}>Edit</Text>
                    <Ionicons name="chevron-forward" size={11} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.routeText}>Food Order Draft</Text>
            </View>
          </View>

          {/* Delivery ETA Pill */}
          <View style={[styles.routeMetaPill, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
            <Ionicons name="time" size={13} color="#FF7A00" />
            <Text style={[styles.routeMetaText, { color: '#C2410C' }]}>
              ⚡ 20–30 mins delivery to your location
            </Text>
          </View>

          {/* Itemized List */}
          <View style={styles.itemsListContainer}>
            {foodItems.length > 0 ? (
              foodItems.map((item, idx) => {
                const qty = safeNum(item.quantity, 1);
                const unit = safeNum(item.unitPrice || item.price, item.totalPrice ? Math.round(Number(item.totalPrice) / qty) : 120);
                const itemTotal = safeNum(item.totalPrice, unit * qty);

                return (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <View style={styles.vegDotBox}>
                        <View style={styles.vegDot} />
                      </View>
                      <Text style={styles.itemName}>
                        {item.name} <Text style={styles.itemQty}>x {qty}</Text>
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>{formatInr(itemTotal)}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Food Items (Selected)</Text>
                <Text style={styles.itemPrice}>{formatInr(foodTotal)}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalPriceText}>{formatInr(foodTotal)}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancelOrder}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmFoodBtn}
              onPress={onConfirmOrder}
              activeOpacity={0.88}
            >
              <Text style={styles.confirmFoodBtnText}>Confirm Order</Text>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CARD 4: PLACED FOOD ORDER ACTIVE
      ───────────────────────────────────────────────────────────── */}
      {hasPlacedOrder && (
        <View style={[styles.card, { borderColor: '#FF7A00', borderWidth: 1.5 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBoxOrange}>
              <Ionicons name="checkmark-done-circle" size={22} color="#FF7A00" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: '#EA580C' }]}>Order Placed!</Text>
              <Text style={styles.routeText}>
                Order #{placedOrder._id?.slice(-6) || '8491'} • Kitchen is preparing
              </Text>
            </View>
          </View>

          <View style={[styles.routeMetaPill, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5', marginTop: 10 }]}>
            <Ionicons name="bicycle" size={14} color="#EA580C" />
            <Text style={[styles.routeMetaText, { color: '#C2410C' }]}>
              Estimated delivery: ~25 mins
            </Text>
          </View>

          <TouchableOpacity
            style={styles.trackFoodBtn}
            onPress={onTrackOrder}
            activeOpacity={0.88}
          >
            <Ionicons name="fast-food-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.trackFoodBtnText}>Track Food Delivery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CARD 5: RECOMMENDED RESTAURANTS & COFFEE CAFES
      ───────────────────────────────────────────────────────────── */}
      {hasRestaurants && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardIconBoxOrange, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cafe" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardTitle}>Recommended Cafes & Places</Text>
              <Text style={styles.routeText}>Tap to order coffee, chai, or snacks</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            {restaurants.slice(0, 4).map((r, idx) => (
              <TouchableOpacity
                key={r.id || r._id || idx}
                style={styles.restaurantRow}
                activeOpacity={0.75}
                onPress={() => onSelectRestaurant?.(r)}
              >
                <View style={styles.restAvatarBox}>
                  <Ionicons name="restaurant" size={18} color="#FF7A00" />
                </View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.restNameText} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.restCuisineText} numberOfLines={1}>
                    {r.cuisine || 'Coffee, Chai, Fast Food'}
                  </Text>
                  <View style={styles.restMetaRow}>
                    <Text style={styles.restRatingText}>⭐ {r.rating || '4.7'}</Text>
                    <Text style={styles.restDot}>•</Text>
                    <Text style={styles.restEtaText}>{r.deliveryTimeMins || 20} mins</Text>
                  </View>
                </View>

                <View style={styles.orderPillBtn}>
                  <Text style={styles.orderPillBtnText}>+ Order</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 14,
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBoxGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8FDF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBoxOrange: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  routeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  routeMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  routeMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierScrollView: {
    marginVertical: 4,
  },
  tierScrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
  },
  tierBox: {
    minWidth: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tierBoxSelected: {
    backgroundColor: '#E8FDF0',
    borderColor: '#00A859',
    borderWidth: 2,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  tierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  activeRadioUnselected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  activeRadioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRadioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A859',
  },
  tierName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tierNameSelected: {
    color: '#00A859',
    fontWeight: '700',
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  tierPriceSelected: {
    color: '#007B3E',
  },
  tierEta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  tierEtaSelected: {
    color: '#00A859',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmRideBtn: {
    flex: 2.2,
    backgroundColor: '#00A859',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmRideBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmFoodBtn: {
    flex: 2.2,
    backgroundColor: '#FF7A00',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmFoodBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  driverInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8FDF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  driverVehicle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854D0E',
  },
  otpBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8FDF0',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  otpLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  otpNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00A859',
    letterSpacing: 3,
    marginTop: 2,
  },
  otpShield: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00A859',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  trackRideBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  itemsListContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vegDotBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  itemName: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  itemQty: {
    color: '#64748B',
    fontWeight: '700',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00A859',
  },
  trackFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A00',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  trackFoodBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  restAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  restCuisineText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  restMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  restRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#854D0E',
  },
  restDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  restEtaText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderPillBtn: {
    backgroundColor: '#E8FDF0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  orderPillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A859',
  },
});
