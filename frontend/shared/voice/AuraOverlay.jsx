/**
 * AuraOverlay.jsx — Full-screen Aura voice modal
 *
 * Sections:
 *   1. TextInput + send button
 *   2. Quick-chip suggestions
 *   3. Live captions list
 *   4. Restaurant results list    (from SHOW_RESTAURANTS)
 *   5. Draft order card           (from SHOW_DRAFT)  + Confirm / Cancel
 *   6. Placed order card          (from ORDER_PLACED) + Track Order
 *   7. Animated status bar        (thinking / speaking)
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuraContext } from './AuraContext.js';


const CHIPS = [
    'Cyber Hub se Rajiv Chowk cab',
    'Biryani dikhao',
    'Airport kitna lagega?',
    'Pizza order karo',
];

export default function AuraOverlay(){
    const {
        isOpen, closeAura,
        isThinking, isSpeaking,
        messages, restaurants, draftOrder, placedOrder,
        rideEstimate, bookedRide, confirmRide, cancelRideAction, trackRide,
        sendVoiceTurn, confirmOrder, cancelDraft, trackOrder,
    } = useAuraContext();

    const [inputText, setInputText] = useState('');
    const scrollRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse the orb while thinking or speaking
    useEffect(() => {
        if (isThinking || isSpeaking) {
        Animated.loop(
            Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
            ]),
        ).start();
        } else {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        }
    }, [isThinking, isSpeaking, pulseAnim]);
    
    const handleSend = () => {
        const text = inputText.trim();
        if(!text) return;
        setInputText('');
        sendVoiceTurn(text);
    };

    const statusLabel = isThinking
    ? 'Soch raha hoon…'
    : isSpeaking
    ? 'Bol raha hoon…'
    : 'Kya chahiye aapko?';


    return (
        <Modal 
            visible = {isOpen}
            animationType='slide'
            transparent
            onRequestClose={closeAura}
        >
            <View style={s.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.sheet}
        >
          {/* ── Header ────────────────────────────────────────── */}
          <View style={s.header}>
            <Animated.View style={[s.orb, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </Animated.View>
            <View style={s.headerText}>
              <Text style={s.headerTitle}>Aura</Text>
              <Text style={s.headerSub}>{statusLabel}</Text>
            </View>
            <TouchableOpacity onPress={closeAura} style={s.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {/* ── Scroll area ───────────────────────────────────── */}
          <ScrollView
            ref={scrollRef}
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Quick chips — only show when no conversation yet */}
            {messages.length === 0 && (
              <View style={s.chipsRow}>
                {CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={s.chip}
                    onPress={() => sendVoiceTurn(chip)}
                  >
                    <Text style={s.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* 2. Captions */}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  s.bubble,
                  msg.role === 'user' ? s.bubbleUser : s.bubbleAura,
                ]}
              >
                <Text
                  style={[
                    s.bubbleText,
                    msg.role === 'user' ? s.bubbleTextUser : s.bubbleTextAura,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
            {/* 3. Thinking indicator */}
            {isThinking && (
              <View style={[s.bubble, s.bubbleAura]}>
                <ActivityIndicator size="small" color="#00C96B" />
              </View>
            )}
            {/* 4. Restaurant results */}
            {restaurants.length > 0 && !draftOrder && !placedOrder && (
              <View style={s.card}>
                <Text style={s.cardTitle}>🍽 Restaurants found</Text>
                {restaurants.map((r) => (
                  <View key={r._id ?? r.id} style={s.restRow}>
                    <Text style={s.restName}>{r.name}</Text>
                    <Text style={s.restMeta}>
                      {Array.isArray(r.cuisine)
                        ? r.cuisine.join(' • ')
                        : r.cuisine}
                      {'  ·  '}
                      ⭐ {r.rating}
                    </Text>
                  </View>
                ))}
                <Text style={s.hintText}>
                  Say: "Biryani Bhai se 2 veg biryani chahiye"
                </Text>
              </View>
            )}
            {/* 5. Draft order card */}
            {draftOrder && !placedOrder && (
              <View style={s.card}>
                <Text style={s.cardTitle}>🛒 Draft Order</Text>
                <Text style={s.restName}>{draftOrder.restaurantName}</Text>
                {(draftOrder.items ?? []).map((item, i) => (
                  <View key={i} style={s.itemRow}>
                    <Text style={s.itemName}>
                      {item.quantity}× {item.name}
                    </Text>
                    <Text style={s.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}
                <View style={s.divider} />
                <View style={s.itemRow}>
                  <Text style={[s.itemName, { fontWeight: '700' }]}>Total</Text>
                  <Text style={[s.itemPrice, { color: '#00C96B', fontWeight: '700' }]}>
                    ₹{draftOrder.totalAmount}
                  </Text>
                </View>
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.cancelBtn]}
                    onPress={cancelDraft}
                    disabled={isThinking}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.confirmBtn, isThinking && s.btnDisabled]}
                    onPress={confirmOrder}
                    disabled={isThinking}
                  >
                    <Text style={s.confirmBtnText}>
                      {isThinking ? 'Placing…' : 'Confirm Order'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* 6. Placed order card */}
            {placedOrder && (
              <View style={[s.card, s.placedCard]}>
                <Text style={s.placedEmoji}>🎉</Text>
                <Text style={s.placedTitle}>Order Placed!</Text>
                <Text style={s.placedId}>
                  Order ID: {placedOrder.orderId ?? placedOrder._id}
                </Text>
                <Text style={s.placedMeta}>
                  Total: ₹{placedOrder.totalAmount}
                </Text>
                <TouchableOpacity style={s.trackBtn} onPress={trackOrder}>
                  <Text style={s.trackBtnText}>Track Order →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 7. Ride Estimate Card */}
            {rideEstimate && (
              <View style={[s.card, s.rideCard]}>
                <View style={s.rideHeader}>
                  <Ionicons name="navigate-circle" size={26} color="#00E5FF" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.rideRouteText} numberOfLines={1}>
                      {rideEstimate.pickup?.address || 'Pickup'} ➔ {rideEstimate.drop?.address || 'Drop'}
                    </Text>
                    <Text style={s.rideSubText}>
                      {rideEstimate.distanceKm} km • ~{rideEstimate.durationMins} mins road trip
                    </Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tierScroll}>
                  {rideEstimate.fares?.map((tier) => (
                    <View key={tier.type} style={s.tierBox}>
                      <Ionicons name={tier.icon || 'car'} size={24} color="#00C96B" />
                      <Text style={s.tierName}>{tier.name}</Text>
                      <Text style={s.tierFare}>₹{tier.fare}</Text>
                      <Text style={s.tierEta}>{tier.etaMins}m away</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={s.actionRow}>
                  <TouchableOpacity style={[s.actionBtn, s.cancelBtn]} onPress={cancelRideAction}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.confirmBtn]} onPress={confirmRide}>
                    <Text style={s.confirmBtnText}>Confirm Cab</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 8. Booked Ride Card */}
            {bookedRide && (
              <View style={[s.card, s.bookedCard]}>
                <View style={s.bookedHeader}>
                  <View style={s.driverAvatar}>
                    <Ionicons name="person" size={24} color="#00C96B" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.driverName}>{bookedRide.driver?.name || 'Driver Assigned'}</Text>
                    <Text style={s.driverVehicle}>{bookedRide.driver?.vehicle || 'Dropp Cab'}</Text>
                    <Text style={s.driverRating}>★ {bookedRide.driver?.rating || '4.9'}</Text>
                  </View>
                  <View style={s.otpBadge}>
                    <Text style={s.otpLabel}>OTP</Text>
                    <Text style={s.otpVal}>{bookedRide.otp}</Text>
                  </View>
                </View>

                <TouchableOpacity style={s.trackBtn} onPress={trackRide}>
                  <Text style={s.trackBtnText}>Track Ride on Map →</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          {/* ── Text input ────────────────────────────────────── */}
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Type your order…"
              placeholderTextColor="#64748B"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isThinking}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!inputText.trim() || isThinking) && s.btnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isThinking}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  orb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C96B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C96B',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  closeBtn: { padding: 4 },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  // Bubbles
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#00C96B' },
  bubbleAura: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  bubbleTextAura: {
    color: '#CBD5E1',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  // Cards
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 4,
  },
  restRow: { gap: 2 },
  restName: {
    color: '#F1F5F9',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  restMeta: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  hintText: {
    color: '#475569',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: {
    color: '#CBD5E1',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    flex: 1,
  },
  itemPrice: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  // Draft actions
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: {
    color: '#EF4444',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  confirmBtn: { backgroundColor: '#00C96B' },
  confirmBtnText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  // Placed order
  placedCard: {
    alignItems: 'center',
    gap: 6,
    borderColor: '#00C96B',
  },
  placedEmoji: { fontSize: 40 },
  placedTitle: {
    color: '#00C96B',
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  placedId: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  placedMeta: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  trackBtn: {
    marginTop: 8,
    backgroundColor: '#00C96B',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  trackBtnText: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  // Input bar
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00C96B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },

  // ── Ride Estimate & Booking Cards ─────────────────────────
  rideCard: {
    borderColor: '#00E5FF33',
    backgroundColor: '#0F172A',
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideRouteText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  rideSubText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
  tierScroll: {
    marginVertical: 10,
  },
  tierBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 105,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tierName: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 6,
    textAlign: 'center',
  },
  tierFare: {
    color: '#00C96B',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginTop: 2,
  },
  tierEta: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
  bookedCard: {
    borderColor: '#00C96B44',
    backgroundColor: '#062E1E',
  },
  bookedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C96B22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00C96B55',
  },
  driverName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  driverVehicle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 2,
  },
  driverRating: {
    color: '#FBBF24',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 2,
  },
  otpBadge: {
    backgroundColor: '#00C96B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  otpLabel: {
    color: '#000',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
  otpVal: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
});