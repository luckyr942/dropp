import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuraContext } from './AuraContext';

const { width } = Dimensions.get('window');
// Compact orb size so conversation transcripts and cards have vertical room
const ORB_SIZE = width * 0.44;

export default function AuraOverlay() {
  const insets = useSafeAreaInsets();
  const {
    isOpen,
    closeAura,
    isThinking,
    isSpeaking,
    sendVoiceTurn,
    messages,
    restaurants,
    draftOrder,
    placedOrder,
    rideEstimate,
    bookedRide,
    confirmRide,
    cancelRideAction,
    trackRide,
    confirmOrder,
    cancelDraft,
    trackOrder,
  } = useAuraContext();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef(null);

  // ── Animation Drivers
  const orbPulse = useRef(new Animated.Value(1)).current;
  const orbRotate = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(10)).current;
  const wave2 = useRef(new Animated.Value(24)).current;
  const wave3 = useRef(new Animated.Value(38)).current;
  const wave4 = useRef(new Animated.Value(20)).current;
  const wave5 = useRef(new Animated.Value(12)).current;

  // Auto-scroll transcript when new message arrives
  useEffect(() => {
    if (messages?.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, rideEstimate, bookedRide, draftOrder]);

  // Orb Breathing & Rotation
  useEffect(() => {
    const breathingWave = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, {
          toValue: 1.06,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbPulse, {
          toValue: 0.96,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotation = Animated.loop(
      Animated.timing(orbRotate, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    breathingWave.start();
    rotation.start();

    return () => {
      breathingWave.stop();
      rotation.stop();
    };
  }, []);

  // Animated Sound Bars when active
  useEffect(() => {
    const active = isListening || isThinking || isSpeaking;
    if (!active) {
      wave1.setValue(10);
      wave2.setValue(24);
      wave3.setValue(38);
      wave4.setValue(20);
      wave5.setValue(12);
      return;
    }

    const animateBar = (val, minH, maxH, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: maxH,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: minH,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const a1 = animateBar(wave1, 8, 28, 450);
    const a2 = animateBar(wave2, 14, 46, 350);
    const a3 = animateBar(wave3, 20, 56, 500);
    const a4 = animateBar(wave4, 12, 40, 380);
    const a5 = animateBar(wave5, 8, 24, 420);
    a1.start(); a2.start(); a3.start(); a4.start(); a5.start();
    return () => {
      a1.stop(); a2.stop(); a3.stop(); a4.stop(); a5.stop();
    };
  }, [isListening, isThinking, isSpeaking]);

  const spin = orbRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendVoiceTurn(text);
  };

  const handlePromptPress = (prompt) => {
    if (!prompt) return;
    setIsListening(false);
    sendVoiceTurn(prompt);
  };

  const recordingRef = useRef(null);

  const handleMicPress = async () => {
    // ── CASE A: Stop recording & transcribe voice
    if (isListening) {
      setIsListening(false);
      if (!recordingRef.current) return;

      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        if (!uri) return;

        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // If audio is too short or empty, don't waste tokens
        if (!base64Audio || base64Audio.length < 500) {
          return;
        }

        const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
        const res = await fetch(`${BACKEND_URL}/api/aura/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Audio }),
        });

        const json = await res.json().catch(() => null);
        const transcript = json?.transcript?.trim();

        if (transcript) {
          sendVoiceTurn(transcript);
        }
      } catch (err) {
        console.warn('[Aura] Mic transcription error:', err.message);
      }
    }
    // ── CASE B: Start recording user voice
    else {
      try {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) {
          alert('Microphone permission is required');
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsListening(true);
      } catch (err) {
        console.warn('[Aura] Failed to start recording:', err.message);
        setIsListening(false);
      }
    }
  };


  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={closeAura}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#E5F8EE" translucent={false} />
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Soft Ambient Ethereal Glow Background */}
        <LinearGradient
          colors={['#E5F8EE', '#F3FBF7', '#EDF7FC', '#FFFFFF']}
          locations={[0, 0.25, 0.65, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* ── 1. Top Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleBtn} onPress={closeAura} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitleText}>Dropp </Text>
            <Text style={styles.brandAuraText}>Aura</Text>
          </View>
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8} onPress={closeAura}>
            <Ionicons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {/* ── 2. Compact Luminous AI Orb ────────────────────────── */}
          <View style={styles.orbContainer}>
            <View style={[styles.glowRing, styles.glowRingOuter]} />
            <View style={[styles.glowRing, styles.glowRingMid]} />
            <Animated.View
              style={[
                styles.orbSphere,
                { transform: [{ scale: orbPulse }, { rotate: spin }] },
              ]}
            >
              <LinearGradient
                colors={['#55EFC4', '#38D9A9', '#0984E3', '#00CEC9']}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.05)', 'transparent']}
                start={{ x: 0.3, y: 0.0 }}
                end={{ x: 0.7, y: 0.7 }}
                style={styles.orbSpecular}
              />
            </Animated.View>

            {/* Central Sound Wave Bars */}
            <View style={styles.waveformCenter}>
              {[wave1, wave2, wave3, wave4, wave5].map((waveAnim, idx) => (
                <Animated.View key={idx} style={[styles.soundBar, { height: waveAnim }]} />
              ))}
            </View>
          </View>

          {/* Status Label */}
          <Text style={styles.statusSub}>
            {isThinking
              ? 'Thinking & finding best options...'
              : isSpeaking
                ? 'Speaking...'
                : isListening
                  ? 'Listening to you...'
                  : 'What would you like to do?'}
          </Text>

          {/* ── 3. Live Transcripts & Action Cards ScrollArea ─────── */}
          <ScrollView
            ref={scrollRef}
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick Chips shown when conversation has not started */}
            {messages.length === 0 && (
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.actionChip}
                  onPress={() => handlePromptPress('Cab to Cyber City')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="car-outline" size={15} color="#00A859" />
                  <Text style={styles.chipText}>Cab to Cyber City</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionChip}
                  onPress={() => handlePromptPress('Biryani dikhao')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="restaurant-outline" size={15} color="#FF7A00" />
                  <Text style={styles.chipText}>Order Biryani</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionChip}
                  onPress={() => handlePromptPress('Airport kitna lagega?')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="airplane-outline" size={15} color="#0087FF" />
                  <Text style={styles.chipText}>Airport fare</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Live Message Bubbles */}
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.auraBubble,
                ]}
              >
                <Text style={msg.role === 'user' ? styles.userRole : styles.auraRole}>
                  {msg.role === 'user' ? 'You' : '✦ Aura'}
                </Text>
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.userBubbleText : styles.auraBubbleText,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <View style={[styles.bubble, styles.auraBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#00A859" />
                <Text style={styles.auraBubbleText}>Finding options...</Text>
              </View>
            )}

            {/* ── Action Card: Ride Estimate ─────────────────────── */}
            {rideEstimate && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="car-sport" size={20} color="#00A859" />
                  <Text style={styles.cardTitle}>Ride Options</Text>
                </View>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {rideEstimate.pickup?.address || rideEstimate.origin || 'Pickup'} → {rideEstimate.drop?.address || rideEstimate.destination || 'Destination'}
                </Text>
                {rideEstimate.distanceKm ? (
                  <Text style={{ fontSize: 12, color: '#00A859', fontWeight: '700', marginTop: 3 }}>
                    📍 {rideEstimate.distanceKm} km • ~{rideEstimate.durationMins} mins road journey
                  </Text>
                ) : null}
                <View style={styles.tierRow}>
                  {(rideEstimate.fares || rideEstimate.tiers || []).map((t, idx) => (
                    <View key={idx} style={styles.tierBox}>
                      <Text style={styles.tierName}>{t.name}</Text>
                      <Text style={styles.tierPrice}>₹{t.fare}</Text>
                      <Text style={styles.tierEta}>{t.etaMins || t.eta || 3} min</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelRideAction} activeOpacity={0.85}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmRide} activeOpacity={0.85}>
                    <Text style={styles.confirmBtnText}>Confirm Cab</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Action Card: Booked Ride ───────────────────────── */}
            {bookedRide && (
              <View style={[styles.card, { borderColor: '#00A859' }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-circle" size={22} color="#00A859" />
                  <Text style={[styles.cardTitle, { color: '#00A859' }]}>Cab Confirmed!</Text>
                </View>
                <Text style={styles.cardSub}>
                  Driver: {bookedRide.driverName || 'Rajesh Kumar'} • {bookedRide.vehicleModel || 'Swift Dzire'}
                </Text>
                <View style={styles.otpBadge}>
                  <Text style={styles.otpText}>START OTP: {bookedRide.otp || '4821'}</Text>
                </View>
                <TouchableOpacity style={styles.confirmBtn} onPress={trackRide} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>Track Ride on Map</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Action Card: Restaurants List ────────────────── */}
            {restaurants && restaurants.length > 0 && !draftOrder && !placedOrder && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="restaurant" size={20} color="#FF7A00" />
                  <Text style={styles.cardTitle}>Restaurants Found</Text>
                </View>
                {restaurants.map((r, idx) => (
                  <TouchableOpacity
                    key={r.id || r._id || idx}
                    style={styles.restCardRow}
                    activeOpacity={0.8}
                    onPress={() => sendVoiceTurn(`${r.name} se biryani aur coffee order kar do`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.restNameText}>{r.name}</Text>
                      <Text style={styles.restCuisineText}>{r.cuisine || 'Biryani, Coffee'} • ⭐ {r.rating || '4.6'}</Text>
                    </View>
                    <View style={styles.orderSmallBtn}>
                      <Text style={styles.orderSmallBtnText}>Order</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Action Card: Food Draft ───────────────────────── */}
            {draftOrder && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="receipt-outline" size={20} color="#FF7A00" />
                  <Text style={styles.cardTitle}>{draftOrder.restaurantName || 'Order Draft'}</Text>
                </View>
                {draftOrder.items?.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name} x {item.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.itemRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalPrice}>₹{draftOrder.total || draftOrder.totalAmount || 370}</Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelDraft} activeOpacity={0.85}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#FF7A00' }]} onPress={confirmOrder} activeOpacity={0.85}>
                    <Text style={styles.confirmBtnText}>Confirm Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Action Card: Placed Food Order ────────────────── */}
            {placedOrder && (
              <View style={[styles.card, { borderColor: '#00A859' }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-done-circle" size={22} color="#00A859" />
                  <Text style={[styles.cardTitle, { color: '#00A859' }]}>Order Placed!</Text>
                </View>
                <Text style={styles.cardSub}>Order #{placedOrder._id?.slice(-6) || '7891'} • ETA 25 mins</Text>
                <TouchableOpacity style={styles.confirmBtn} onPress={trackOrder} activeOpacity={0.85}>
                  <Text style={styles.confirmBtnText}>Track Food Delivery</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ── 4. Bottom Controls: Text Box + Send + Mic ─────────── */}
          <View style={styles.bottomBar}>
            <View style={[styles.inputContainer, isListening && styles.inputContainerListening]}>
              <TextInput
                style={styles.textInput}
                placeholder={
                  isListening
                    ? '🎙️ Listening... (Speak now)'
                    : isThinking
                    ? '⏳ Processing speech...'
                    : 'Ask Aura or type destination...'
                }
                placeholderTextColor={isListening ? '#00A859' : '#94A3B8'}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendText}
                returnKeyType="send"
              />
              {inputText.trim().length > 0 && (
                <TouchableOpacity style={styles.sendIconBtn} onPress={handleSendText}>
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Circular Mic Button */}
            <TouchableOpacity
              style={[styles.micBtnSmall, isListening && styles.micBtnActive]}
              onPress={handleMicPress}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isListening ? ['#FF4D4D', '#E11D48'] : ['#00E575', '#00A859']}
                style={styles.micGradientSmall}
              >
                <Ionicons name={isListening ? 'stop' : 'mic'} size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3FAF6',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  // 1. Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: '#0F172A',
  },
  brandAuraText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: '#00A859',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // 2. Orb
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ORB_SIZE + 24,
    marginTop: 4,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  glowRingOuter: {
    width: ORB_SIZE * 1.32,
    height: ORB_SIZE * 1.32,
    borderColor: 'rgba(0, 201, 107, 0.12)',
  },
  glowRingMid: {
    width: ORB_SIZE * 1.14,
    height: ORB_SIZE * 1.14,
    borderColor: 'rgba(56, 217, 169, 0.25)',
  },
  orbSphere: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    shadowColor: '#00C96B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  orbSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderRadius: 999,
  },
  waveformCenter: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 40,
  },
  soundBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  statusSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  // 3. Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7F2EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#0F172A',
  },
  // 4. Transcripts
  transcriptScroll: {
    flex: 1,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  transcriptContent: {
    gap: 10,
    paddingBottom: 10,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#00A859',
    borderBottomRightRadius: 4,
  },
  auraBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  userRole: {
    fontSize: 10,
    color: '#D1FAE5',
    fontWeight: '700',
    marginBottom: 2,
  },
  auraRole: {
    fontSize: 10,
    color: '#00A859',
    fontWeight: '700',
    marginBottom: 2,
  },
  userBubbleText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  auraBubbleText: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  // 5. Action Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  tierBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tierName: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  tierPrice: { fontSize: 16, color: '#00A859', fontWeight: '800', marginTop: 2 },
  tierEta: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#00A859',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  otpBadge: {
    backgroundColor: '#E6F9F0',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 10,
  },
  otpText: {
    color: '#00A859',
    fontWeight: '800',
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: { fontSize: 13, color: '#0F172A', fontWeight: '500' },
  itemPrice: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  totalPrice: { fontSize: 16, fontWeight: '800', color: '#00A859' },
  // 6. Bottom Bar (Input + Mic)
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputContainerListening: {
    borderColor: '#00A859',
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  restCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  restNameText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  restCuisineText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderSmallBtn: {
    backgroundColor: '#00A859',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderSmallBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  sendIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  micBtnActive: {
    shadowColor: '#EF4444',
  },
  micGradientSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
