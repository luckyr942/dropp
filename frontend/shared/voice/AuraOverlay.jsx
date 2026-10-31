// frontend/shared/voice/AuraOverlay.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuraContext } from './AuraContext';
import { getApiBase } from '../utils/apiConfig';

// Import the 6 modular components
import AuraHeader from './components/AuraHeader';
import AuraHero from './components/AuraHero';
import AuraChatThread from './components/AuraChatThread';
import AuraTimeLineCards from './components/AuraTimeLineCards';
import AuraBottomCard from './components/AuraBottomCard';
import AuraRideCompareCard from './components/AuraRideCompareCard';
import AuraBottomBar from './components/AuraBottomBar';

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
    rideComparison,
    openProvider,
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

  // Synchronize vehicle selection when new ride estimates arrive
  useEffect(() => {
    if (rideEstimate) {
      const fares = rideEstimate.fares || rideEstimate.tiers || [];
      const hasEconomy = fares.some((f) => f.type === 'cab_economy');
      const defaultTier =
        rideEstimate.selectedRideType ||
        (hasEconomy ? 'cab_economy' : fares[0]?.type || 'cab_economy');
      setSelectedTier(defaultTier);
    }
  }, [rideEstimate]);

  // Auto-scroll as new messages or cards arrive
  useEffect(() => {
    if (messages?.length > 0 || rideEstimate || rideComparison || draftOrder || bookedRide || placedOrder) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [messages, rideEstimate, rideComparison, draftOrder, bookedRide, placedOrder]);

  // Audio Recording References for Sarvam AI STT
  const recordingRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const isStartingRef = useRef(false);

  // Safe reset & cleanup of any active audio recording instance
  const cleanupRecording = async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recordingRef.current) {
      const rec = recordingRef.current;
      recordingRef.current = null;
      try {
        const status = await rec.getStatusAsync().catch(() => null);
        if (status?.canRecord || status?.isRecording) {
          await rec.stopAndUnloadAsync().catch(() => {});
        }
      } catch (_) {}
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(() => {});
  };

  // Ensure recording is stopped if modal is closed
  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
      setIsListening(false);
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen]);

  const stopAndTranscribe = async () => {
    if (isTranscribingRef.current) return;
    isTranscribingRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);

    const rec = recordingRef.current;
    recordingRef.current = null;

    if (!rec) {
      isTranscribingRef.current = false;
      return;
    }

    try {
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

      if (!base64Audio || base64Audio.length < 1500) {
        return;
      }

      const BACKEND_URL = getApiBase();
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
      await cleanupRecording();
    }
  };

  const handleMicPress = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      if (isListening || recordingRef.current) {
        await stopAndTranscribe();
      } else {
        // Clean up any lingering recording in the native bridge first
        await cleanupRecording();
        await new Promise((resolve) => setTimeout(resolve, 80));

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

            if (metering > -38) {
              hasSpokenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            } else if (hasSpokenRef.current && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                stopAndTranscribe();
              }, 1400);
            }
          },
          200
        );

        recordingRef.current = recording;
        setIsListening(true);
      }
    } catch (err) {
      console.log('[Aura] Mic start notice:', err.message);
      await cleanupRecording();
      setIsListening(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendVoiceTurn(text, 'text');
  };

  // Calculate live dynamic total based on selected vehicle tier + food draft
  const availableFares = rideEstimate?.fares || rideEstimate?.tiers || [];
  const selectedTierObj =
    availableFares.find((t) => t.type === selectedTier) ||
    availableFares[0] || { fare: 49 };
  const ridePrice = Number(selectedTierObj.fare || 49);
  const foodPrice = Number(draftOrder?.totalAmount || draftOrder?.total || 0);

  const hasBothPending = Boolean(rideEstimate && draftOrder);
  const draftCount = (rideEstimate ? 1 : 0) + (draftOrder ? 1 : 0);
  const calculatedTotal = (rideEstimate ? ridePrice : 0) + (draftOrder ? foodPrice : 0);

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

        {/* 1. Top Header */}
        <AuraHeader
          credits={voiceCredits}
          onBack={closeAura}
          onClose={closeAura}
          isThinking={isThinking}
          isListening={isListening}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 2. Hero Mascot with soft ethereal orb (shrinks once the chat starts) */}
            <AuraHero isThinking={isThinking} isListening={isListening} compact={messages.length > 0} />

            {/* 3. Live Chat Speech Bubbles */}
            <AuraChatThread messages={messages} isThinking={isThinking} />

            {/* 3B. Cheapest-ride comparison across Dropp, Uber, Ola, Rapido */}
            <AuraRideCompareCard
              comparison={rideComparison}
              onBookDropp={(rideType) => confirmRide(rideType)}
              onOpenProvider={openProvider}
            />

            {/* 4. Connected Interactive Timeline Cards (Ride, Food, Cafes, OTP) */}
            <AuraTimeLineCards
              rideEstimate={rideEstimate}
              bookedRide={bookedRide}
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              onConfirmRide={(tier) => confirmRide(tier || selectedTier)}
              onCancelRide={cancelRideAction}
              onTrackRide={trackRide}
              draftOrder={draftOrder}
              placedOrder={placedOrder}
              onConfirmOrder={confirmOrder}
              onCancelOrder={cancelDraft}
              onTrackOrder={trackOrder}
              restaurants={restaurants}
              onSelectRestaurant={(r) =>
                sendVoiceTurn(`${r.name} se coffee aur snacks order kar do`, 'text')
              }
              onEditRide={() => sendVoiceTurn('Mujhe ride change karni hai', 'text')}
              onEditFood={() => sendVoiceTurn('Food item change karna hai', 'text')}
            />

            {/* 5. Sticky "Confirm Both (Ride + Food)" Card */}
            {hasBothPending && (
              <AuraBottomCard
                count={draftCount}
                total={calculatedTotal}
                buttonText="Confirm Both (Ride + Food)"
                onReviewBoth={() =>
                  sendVoiceTurn('haan dono confirm kar do', 'voice', {
                    rideType: selectedTier,
                  })
                }
              />
            )}
          </ScrollView>

          {/* 6. Suggestions Carousel + Input + Live Green Mic */}
          <AuraBottomBar
            inputText={inputText}
            onChangeText={setInputText}
            onSubmit={handleSendText}
            isListening={isListening}
            onMicPress={handleMicPress}
            onSuggestionPress={(query) => sendVoiceTurn(query, 'text')}
          />
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
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
