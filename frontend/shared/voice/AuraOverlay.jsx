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
    voiceCredits,
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
  const [selectedTier, setSelectedTier] = useState('cab_economy');
  const scrollRef = useRef(null);

  // Synchronize selected tier when a new ride estimate is received
  useEffect(() => {
    if (rideEstimate) {
      const fares = rideEstimate.fares || rideEstimate.tiers || [];
      const hasEconomy = fares.some((f) => f.type === 'cab_economy');
      const defaultTier = rideEstimate.selectedRideType || (hasEconomy ? 'cab_economy' : fares[0]?.type || 'cab_economy');
      setSelectedTier(defaultTier);
    }
  }, [rideEstimate]);

  const availableFares = rideEstimate?.fares || rideEstimate?.tiers || [];
  const selectedTierObj = availableFares.find((t) => t.type === selectedTier) || availableFares[0];

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
    sendVoiceTurn(text, 'text');
  };

  const handlePromptPress = (prompt) => {
    if (!prompt) return;
    setIsListening(false);
    sendVoiceTurn(prompt, 'text');
  };

  const recordingRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const isTranscribingRef = useRef(false);

  // Stop recording, read audio base64, send to transcribe API safely (no double-trigger)
  const stopAndTranscribe = async () => {
    if (isTranscribingRef.current) return;
    isTranscribingRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
    if (!recordingRef.current) {
      isTranscribingRef.current = false;
      return;
    }

    try {
      const rec = recordingRef.current;
      recordingRef.current = null;
      await rec.stopAndUnloadAsync().catch(() => {});
      const uri = rec.getURI();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => {});

      if (!uri) return;

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      }).catch(() => null);

      // If audio is too short or empty, don't waste STT credits
      if (!base64Audio || base64Audio.length < 1500) {
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
        sendVoiceTurn(transcript, 'voice');
      }
    } catch (err) {
      console.warn('[Aura] Mic transcription error:', err.message);
    } finally {
      isTranscribingRef.current = false;
    }
  };

  const handleMicPress = async () => {
    // If already recording, stop manually right away
    if (isListening) {
      await stopAndTranscribe();
    }
    // Otherwise start listening with automatic silence detection
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

        hasSpokenRef.current = false;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const { recording } = await Audio.Recording.createAsync(
          {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          },
          (status) => {
            if (!status.isRecording) return;
            const metering = status.metering ?? -160;

            // User began speaking: sound detected above -38 dB ambient threshold
            if (metering > -38) {
              hasSpokenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            }
            // User had spoken and now paused for >= 1.4 seconds: auto-stop
            else if (hasSpokenRef.current && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                stopAndTranscribe();
              }, 1400);
            }
          },
          200
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
            {typeof voiceCredits === 'number' && (
              <View style={styles.creditPill}>
                <Ionicons name="sparkles" size={11} color="#00A859" />
                <Text style={styles.creditPillText}>{voiceCredits} Credits</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8} onPress={closeAura}>
            <Ionicons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Check if conversation has begun or cards are active */}
        {(() => {
          const hasContent =
            (messages && messages.length > 0) ||
            Boolean(rideEstimate) ||
            Boolean(draftOrder) ||
            Boolean(bookedRide) ||
            (restaurants && restaurants.length > 0);

          return (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardContainer}
            >
              {/* ── 2. Luminous AI Orb (Hero size initially, sleek mini-badge when content active) ── */}
              {hasContent ? (
                <View style={styles.miniOrbRow}>
                  <Animated.View
                    style={[
                      styles.miniOrbSphere,
                      { transform: [{ scale: orbPulse }, { rotate: spin }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['#55EFC4', '#38D9A9', '#0984E3', '#00CEC9']}
                      start={{ x: 0.1, y: 0.1 }}
                      end={{ x: 0.9, y: 0.9 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                  <Text style={styles.miniStatusText}>
                    {isThinking
                      ? 'Thinking & finding best options...'
                      : isSpeaking
                        ? 'Aura speaking...'
                        : isListening
                          ? 'Listening to you...'
                          : 'Dropp Aura ready'}
                  </Text>
                </View>
              ) : (
                <>
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
                </>
              )}

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
                {/* Horizontal Scroll for Ride Tiers: Tap to choose vehicle */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tierScrollContent}
                  style={styles.tierScrollView}
                >
                  {availableFares.map((t, idx) => {
                    const isSelected = selectedTier === t.type;
                    return (
                      <TouchableOpacity
                        key={t.type || idx}
                        style={[styles.tierBox, isSelected && styles.tierBoxSelected]}
                        onPress={() => setSelectedTier(t.type)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.tierHeaderRow}>
                          <Ionicons
                            name={t.icon === 'bicycle' ? 'bicycle' : t.type === 'auto' ? 'car-outline' : 'car-sport'}
                            size={18}
                            color={isSelected ? '#00A859' : '#64748B'}
                            style={{ marginBottom: 3 }}
                          />
                          {isSelected && <View style={styles.tierSelectedDot} />}
                        </View>
                        <Text style={[styles.tierName, isSelected && styles.tierNameSelected]} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Text
                          style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.7}
                        >
                          ₹{Number(t.fare).toLocaleString('en-IN')}
                        </Text>
                        <Text style={[styles.tierEta, isSelected && styles.tierEtaSelected]}>
                          {t.etaMins || t.eta || 3} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelRideAction} activeOpacity={0.85}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => confirmRide(selectedTier)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmBtnText}>
                      {selectedTierObj ? `Book ${selectedTierObj.name} • ₹${selectedTierObj.fare}` : 'Confirm Ride'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Action Card: Booked Ride ───────────────────────── */}
            {bookedRide && (
              <View style={[styles.card, { borderColor: '#00A859' }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-circle" size={22} color="#00A859" />
                  <Text style={[styles.cardTitle, { color: '#00A859' }]}>
                    {bookedRide.rideType === 'bike' ? 'Bike Confirmed!' : bookedRide.rideType === 'auto' ? 'Auto Confirmed!' : 'Cab Confirmed!'}
                  </Text>
                </View>
                <Text style={styles.cardSub}>
                  Driver: {bookedRide.driver?.name || bookedRide.driverName || 'Rajesh Kumar'} • {bookedRide.driver?.vehicle || bookedRide.vehicleModel || 'Swift Dzire'}
                </Text>
                {bookedRide.fare ? (
                  <Text style={{ fontSize: 13, color: '#00A859', fontWeight: '700', marginTop: 2 }}>
                    Fare: ₹{bookedRide.fare}
                  </Text>
                ) : null}
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
                    onPress={() => sendVoiceTurn(`${r.name} se biryani aur coffee order kar do`, 'text')}
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
          );
        })()}
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
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  creditPillText: {
    fontSize: 11,
    fontWeight: '700',
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
  // Mini Orb Row when content/conversation is active
  miniOrbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E7F2EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  miniOrbSphere: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
  },
  miniStatusText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#00A859',
  },
  tierScrollView: {
    marginVertical: 10,
  },
  tierScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  tierBox: {
    minWidth: 92,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tierBoxSelected: {
    backgroundColor: '#E8F8F0',
    borderColor: '#00A859',
    borderWidth: 2,
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  tierSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A859',
    marginBottom: 3,
  },
  tierName: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  tierNameSelected: { color: '#00A859', fontWeight: '700' },
  tierPrice: {
    fontSize: 15,
    color: '#00A859',
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  tierPriceSelected: {
    color: '#007B3E',
    fontWeight: '800',
  },
  tierEta: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  tierEtaSelected: { color: '#00A859', fontWeight: '600' },
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
