/**
 * AuraContext.js — Global Aura state + backend bridge
 *
 * State it owns:
 *   isOpen        → modal open/closed
 *   isThinking    → waiting for backend response
 *   isSpeaking    → Voice / TTS currently playing
 *   messages      → [{id, role:'aura'|'user', text}] live captions
 *   restaurants   → list from SHOW_RESTAURANTS screen action
 *   draftOrder    → current draft from SHOW_DRAFT screen action
 *   placedOrder   → confirmed order from ORDER_PLACED screen action
 *
 * Functions exposed:
 *   openAura()         → opens modal
 *   closeAura()        → closes modal, stops voice
 *   sendVoiceTurn(txt) → POST to /api/aura/voice-turn, plays Ishita voice
 *   confirmOrder()     → sends "haan" through sendVoiceTurn
 *   cancelDraft()      → sends "nahi" through sendVoiceTurn
 *   trackOrder()       → closes modal, navigates to tracking screen
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Linking, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getApiBase, getWsBase } from '../utils/apiConfig';
import { useRideStore } from '../store/rideStore';

const AuraContext = createContext(null);

const getBackendUrl = () => getApiBase();

const REQUEST_TIMEOUT_MS = 45_000;
const TRACKING_SCREEN = 'FoodTracking';

function isHindiOrHinglish(text) {
  if (!text) return false;
  if (/[\u0900-\u097F]/.test(text)) return true;
  const hindiMarkers = /\b(kya|hai|hain|hoon|chahiye|karo|bhai|dhoondh|mila|mile|rupaye|dekho|dikhao|batao|kiska|aapka|aur|kuch|theek|haan|nahi|karna|le|lo|matlab|kaunsa)\b/i;
  return hindiMarkers.test(text);
}

function cleanForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*_#`~]/g, '')
    // Round decimal distances to whole numbers (459.55 km -> 460 kilometers, never "point paanch paanch")
    .replace(/(\d+)\.(\d+)\s*km\b/gi, (m, d, dec) => `${Math.round(Number(`${d}.${dec}`))} kilometers`)
    .replace(/(\d+)\s*km\b/gi, '$1 kilometers')
    .replace(/(\d+)\s*m\b/gi, '$1 meters')
    // Duration: 18 min -> 18 minutes
    .replace(/(\d+)\s*mins?\b/gi, '$1 minutes')
    // Format fare: ₹4395 -> 4,395 rupees
    .replace(/₹\s*(\d+)/g, (m, num) => `${Number(num).toLocaleString('en-IN')} rupees`)
    .replace(/\b(\d+)\s*(?:rupaye|rs|inr|rupees)\b/gi, (m, num) => `${Number(num).toLocaleString('en-IN')} rupees`)
    // OTP: space out digits so OTP is read clearly as distinct digits
    .replace(/\bOTP\s*(?:hai|is|:)?\s*(\d{4,6})\b/gi, (m, otp) => `OTP is ${otp.split('').join(' ')}`)
    // Clean emojis & extra spaces
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const makeSessionId = () =>
  `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

export function AuraProvider({ children, onNavigate }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isThinking,  setIsThinking]  = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [rideEstimate, setRideEstimate] = useState(null);
  const [bookedRide,   setBookedRide]   = useState(null);
  const [rideComparison, setRideComparison] = useState(null);
  const [draftOrder,  setDraftOrder]  = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [voiceCredits, setVoiceCredits] = useState(70);

  const sessionIdRef    = useRef(makeSessionId());
  const busyRef         = useRef(false);
  const msgIdRef        = useRef(0);
  const hindiVoiceRef   = useRef(null);
  const englishVoiceRef = useRef(null);
  const soundRef        = useRef(null);

  // Configure audio session for clear speaker playback
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Detect fallback device voices
  useEffect(() => {
    async function detectVoices() {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (!voices || voices.length === 0) return;

        const hi = voices.find(
          (v) =>
            v.language?.toLowerCase().startsWith('hi') ||
            v.identifier?.toLowerCase().includes('hi-in') ||
            v.identifier?.toLowerCase().includes('hindi')
        );

        const enIn = voices.find(
          (v) =>
            v.language?.toLowerCase().includes('en-in') ||
            v.language?.toLowerCase().includes('en_in')
        );
        const enDefault = voices.find((v) => v.language?.toLowerCase().startsWith('en'));

        hindiVoiceRef.current   = hi || null;
        englishVoiceRef.current = enIn || enDefault || null;
      } catch (err) {
        console.log('[AuraContext] Voice detection skipped:', err.message);
      }
    }
    detectVoices();
  }, []);

  const addMessage = useCallback((role, text) => {
    msgIdRef.current += 1;
    setMessages((prev) => [...prev, { id: msgIdRef.current, role, text }]);
  }, []);

  // Stop any currently playing audio
  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  // Primary playback: Stream Ishita audio from backend, or fallback to device speech
  const playAudio = useCallback(async (text, audioUrl) => {
    await stopAudio();

    if (audioUrl) {
      try {
        setIsSpeaking(true);
        const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${getBackendUrl()}${audioUrl}`;
        
        let playUri = fullUrl;
        if (Platform.OS !== 'web') {
          // Download to local cache on iOS / Android to bypass AVPlayer HTTP streaming limits
          const localUri = `${FileSystem.cacheDirectory}aura_${Date.now()}.wav`;
          const downloadRes = await FileSystem.downloadAsync(fullUrl, localUri).catch(() => null);
          if (downloadRes?.uri) {
            playUri = downloadRes.uri;
          }
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: playUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsSpeaking(false);
          }
        });
        return;
      } catch (err) {
        console.warn('[AuraContext] Audio URL playback failed, falling back to device TTS:', err.message);
      }
    }

    // Fallback device speech if no audio buffer was returned
    const spokenText = cleanForSpeech(text);
    if (!spokenText) {
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const hasDevanagari = /[\u0900-\u097F]/.test(spokenText);
    const selectedVoice = hasDevanagari
      ? (hindiVoiceRef.current || englishVoiceRef.current)
      : (englishVoiceRef.current || hindiVoiceRef.current);
    const targetLang = hasDevanagari
      ? (selectedVoice?.language || 'hi-IN')
      : (selectedVoice?.language || 'en-IN');

    Speech.speak(spokenText, {
      language: targetLang,
      voice: selectedVoice?.identifier,
      rate: hasDevanagari ? 0.90 : 0.94,
      pitch: 1.0,
      onDone:    () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError:   () => setIsSpeaking(false),
    });
  }, [stopAudio]);

  // Live WebSocket connection to receive real-time status updates from restaurant dashboard
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const wsUrl = getWsBase();
    const custId = sessionIdRef.current || 'cust_live_001';

    function connectWs() {
      try {
        ws = new WebSocket(`${wsUrl}?customerId=${custId}`);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ORDER_STATUS_UPDATE' && msg.data) {
              const { status, message, orderId } = msg.data;
              if (message) {
                addMessage('aura', message);
                playAudio(message);
              }
              setPlacedOrder((prev) => (prev ? { ...prev, status } : { _id: orderId, status }));
            }
            // Keep the booked-ride card live: driver accepted, arrived, trip started / completed
            const RIDE_EVENTS = ['ride.driver_confirmed', 'ride.driver_arrived', 'ride.trip_started', 'ride.completed', 'ride.cancelled'];
            if (RIDE_EVENTS.includes(msg.type) && msg.data?.rideId) {
              const d = msg.data;
              setBookedRide((prev) => {
                if (!prev || String(prev._id) !== String(d.rideId)) return prev;
                if (msg.type === 'ride.driver_confirmed' && d.driver?.name && !prev.driver?.name) {
                  const line = `${d.driver.name} aa rahe hain. OTP driver ko batayein.`;
                  addMessage('aura', line);
                  playAudio(line);
                }
                return { ...prev, status: d.status || prev.status, driver: d.driver || prev.driver };
              });
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (_) {}
    }

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [addMessage, playAudio]);

  const openAura = useCallback(() => {
    setIsOpen(true);
    // Sync latest credit balance from backend
    fetch(`${getBackendUrl()}/api/aura/credits`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.credits === 'number') {
          setVoiceCredits(data.credits);
        }
      })
      .catch(() => {});
  }, []);
  const closeAura = useCallback(async () => {
    await stopAudio();
    setIsThinking(false);
    setIsOpen(false);
  }, [stopAudio]);

  const sendVoiceTurn = useCallback(async (userText, mode = 'voice', extraData = {}) => {
    const text = userText?.trim();
    if (!text || busyRef.current) return;

    busyRef.current = true;
    addMessage('user', text);
    setPlacedOrder(null);
    setBookedRide(null);
    setRestaurants(null);
    setRideEstimate(null);
    setRideComparison(null);
    setDraftOrder(null);
    setIsThinking(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${getBackendUrl()}/api/aura/voice-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          text,
          mode,
          ...extraData,
        }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);

      if (!json?.success || !json.data) {
        const fallbackMsg = res.status === 429
          ? 'Thoda ruk kar dobara bolein.'
          : 'Samajh nahi aaya, dobara bolein.';
        addMessage('aura', fallbackMsg);
        playAudio(fallbackMsg, null);
        return;
      }

      const { reply, screenAction, audioUrl, creditsLeft } = json.data;
      if (typeof creditsLeft === 'number') {
        setVoiceCredits(creditsLeft);
      }
      addMessage('aura', reply);
      // Play audio response so demo video has natural voice on both voice and 1-tap pills
      playAudio(reply, audioUrl);

      const lowerText = (text || '').toLowerCase();
      const isRideIntent = /\b(cab|ride|auto|taxi|bike|gaadi|car|cyber|airport)\b/i.test(lowerText);
      const isFoodIntent = /\b(food|khana|biryani|briyani|pizza|burger|coffee|chai|eat|order|dish)\b/i.test(lowerText);

      // If user switched intent to ride, clear out any prior food cards
      if (isRideIntent && !screenAction) {
        setRestaurants(null);
        setDraftOrder(null);
      }
      // If user switched intent to food, clear out any prior ride cards
      if (isFoodIntent && !screenAction) {
        setRideEstimate(null);
        setBookedRide(null);
      }

      switch (screenAction?.type) {
        case 'MULTI_ACTION':
          setRestaurants(null);
          if (screenAction.data?.rideEstimate) {
            setRideEstimate(screenAction.data.rideEstimate);
          }
          if (screenAction.data?.draftOrder) {
            setDraftOrder(screenAction.data.draftOrder);
          }
          if (screenAction.data?.restaurants && !screenAction.data?.draftOrder) {
            setRestaurants(screenAction.data.restaurants);
          }
          break;
        case 'MULTI_CONFIRMED':
          setDraftOrder(null);
          setRideEstimate(null);
          setRestaurants(null);
          if (screenAction.data?.ride) {
            setBookedRide(screenAction.data.ride);
          }
          if (screenAction.data?.order) {
            setPlacedOrder(screenAction.data.order);
          }
          break;
        case 'SHOW_RESTAURANTS':
          setRestaurants(screenAction.data ?? []);
          setRideEstimate(null);
          setBookedRide(null);
          setDraftOrder(null);
          break;
        case 'SHOW_DRAFT':
          setDraftOrder(screenAction.data);
          setRestaurants(null);
          setRideEstimate(null);
          setBookedRide(null);
          break;
        case 'DRAFT_CANCELLED':
          setDraftOrder(null);
          break;
        case 'ORDER_PLACED':
          setDraftOrder(null);
          setRestaurants(null);
          setRideEstimate(null);
          setBookedRide(null);
          setPlacedOrder(screenAction.data);
          break;
        case 'RIDE_COMPARISON': {
          // Aura compared Dropp with Uber / Ola / Rapido. It may already have booked Dropp,
          // or (when the user said "book") hand off to a cheaper app with the trip pre-filled.
          const comparison = screenAction.data;
          setRestaurants(null);
          setDraftOrder(null);
          setRideEstimate(null);
          setRideComparison(comparison);
          setBookedRide(comparison?.bookedRide || null);
          if (comparison?.handoff?.autoOpen && comparison.handoff.url) {
            Linking.openURL(comparison.handoff.url).catch(() => {});
          }
          break;
        }
        case 'SHOW_RIDE_ESTIMATE':
          setRestaurants(null);
          setDraftOrder(null);
          setBookedRide(null);
          setRideEstimate(screenAction.data);
          break;
        case 'RIDE_BOOKED':
          setRestaurants(null);
          setDraftOrder(null);
          setRideEstimate(null);
          setBookedRide(screenAction.data);
          break;
        case 'CLEAR_FOOD':
          setRestaurants(null);
          setDraftOrder(null);
          break;
        case 'CLEAR_ALL':
          setRestaurants(null);
          setDraftOrder(null);
          setRideEstimate(null);
          setBookedRide(null);
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[Aura] Backend offline or slow, using intelligent demo response:', err.message);

      const lower = text.toLowerCase();
      let reply = 'Theek hai, main check kar raha hoon.';
      let action = null;

      // 1. Cab / Ride request
      if (lower.includes('cab') || lower.includes('ride') || lower.includes('cyber') || lower.includes('airport') || lower.includes('car')) {
        reply = 'Cyber City ke liye cab dhoondh li hai. ₹180 lagega, book kar doon?';
        action = {
          type: 'SHOW_RIDE_ESTIMATE',
          data: {
            origin: 'Current Location',
            destination: 'Cyber City, Gurugram',
            distance: '6.4 km',
            duration: '18 min',
            tiers: [
              { name: 'Dropp Mini', fare: 180, eta: 3 },
              { name: 'Dropp Sedan', fare: 240, eta: 5 },
              { name: 'Dropp Auto', fare: 110, eta: 2 },
            ],
          },
        };
      }
      // 2. Confirmation
      else if (lower.includes('haan') || lower.includes('yes') || lower.includes('confirm') || lower.includes('book') || lower.includes('kar do')) {
        reply = 'Cab confirm ho gayi hai! Driver 3 min mein pahunch rahe hain.';
        action = {
          type: 'RIDE_BOOKED',
          data: {
            driverName: 'Rajesh Kumar',
            vehicleModel: 'Maruti Dzire • DL 1Z 4821',
            otp: '4821',
          },
        };
      }
      // 3. Food / Biryani request
      else if (lower.includes('food') || lower.includes('biryani') || lower.includes('pizza') || lower.includes('khana') || lower.includes('order')) {
        reply = 'Aapke aas-paas ke top restaurants ye rahe.';
        action = {
          type: 'SHOW_RESTAURANTS',
          data: [
            { id: '1', name: 'Biryani Blues', cuisine: 'Biryani, Mughlai', rating: 4.5 },
            { id: '2', name: 'Behrouz Biryani', cuisine: 'Royal Biryani', rating: 4.6 },
          ],
        };
      } else {
        reply = `Aapne kaha: "${text}". Kya main iske liye ride ya food book karoon?`;
      }

      addMessage('aura', reply);
      playAudio(reply, null);

      if (action?.type === 'SHOW_RIDE_ESTIMATE') setRideEstimate(action.data);
      if (action?.type === 'RIDE_BOOKED') { setRideEstimate(null); setBookedRide(action.data); }
      if (action?.type === 'SHOW_RESTAURANTS') setRestaurants(action.data);
    } finally {
      clearTimeout(timer);
      busyRef.current = false;
      setIsThinking(false);
    }
  }, [addMessage, playAudio]);

  const confirmOrder = useCallback(() => sendVoiceTurn('haan'), [sendVoiceTurn]);
  const cancelDraft  = useCallback(() => sendVoiceTurn('nahi'), [sendVoiceTurn]);
  const trackOrder   = useCallback(() => {
    const currentOrder = placedOrder;
    closeAura();
    setPlacedOrder(null);
    onNavigate?.(TRACKING_SCREEN, currentOrder);
  }, [closeAura, onNavigate, placedOrder]);

  const confirmRide = useCallback((rideType) => {
    const chosenType = rideType || 'cab_economy';
    const typeLabel = chosenType === 'bike' ? 'Bike' : chosenType === 'auto' ? 'Auto' : chosenType === 'cab_premium' ? 'Premier' : 'Cab';
    sendVoiceTurn(`haan ${typeLabel} book kar do`, 'voice', { rideType: chosenType });
  }, [sendVoiceTurn]);
  const openProvider = useCallback((url) => {
    if (url) Linking.openURL(url).catch(() => {});
  }, []);
  const cancelRideAction = useCallback(() => {
    setRideEstimate(null);
    setRideComparison(null);
    setBookedRide(null);
    sendVoiceTurn('nahi');
  }, [sendVoiceTurn]);
  const trackRide = useCallback(() => {
    // Hand the real ride to the tracking screen so it never falls back to placeholder data
    const ride = bookedRide;
    if (ride) {
      const store = useRideStore.getState();
      store.setRideId?.(ride._id);
      store.setServiceType?.(ride.serviceType || 'RIDE');
      store.setPickupLocation?.(ride.pickupLocation);
      store.setDestination?.(ride.dropLocation);
      store.setRoute?.(ride.routeGeometry, ride.distanceKm, ride.estimatedMins, [{ id: ride.rideType, fare: ride.fare }]);
      store.selectVehicle?.(ride.rideType, ride.fare);
      if (ride.otp) store.setDeliveryOtp?.(ride.otp);
      if (ride.driver?.name) store.setDriver?.(ride.driver);
      if (ride.customerId) store.setCustomerId?.(ride.customerId);
    }
    closeAura();
    setBookedRide(null);
    onNavigate?.(ride?.driver?.name ? 'TripTracking' : 'FindingDriver');
  }, [bookedRide, closeAura, onNavigate]);

  return (
    <AuraContext.Provider
      value={{
        isOpen,    openAura,  closeAura,
        isThinking, isSpeaking,
        voiceCredits, setVoiceCredits,
        messages,  restaurants, draftOrder, placedOrder,
        rideEstimate, bookedRide, confirmRide, cancelRideAction, trackRide,
        rideComparison, openProvider,
        sendVoiceTurn, confirmOrder, cancelDraft, trackOrder,
        playAudio,
      }}
    >
      {children}
    </AuraContext.Provider>
  );
}

export function useAuraContext() {
  const ctx = useContext(AuraContext);
  if (!ctx) throw new Error('useAuraContext must be inside <AuraProvider>');
  return ctx;
}
