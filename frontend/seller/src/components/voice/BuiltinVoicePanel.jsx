// Push-to-talk voice for sellers using Dropp's own pipeline:
// record → /api/voice/seller/turn (Sarvam STT → Gemini with store tools → Sarvam TTS) → play reply.
// Recording stops by itself after ~1.4s of silence, like the customer Aura mic.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/sellerTheme.js';
import * as sellerApi from '../../api/sellerApi.js';

const SILENCE_DB = -38;
const SILENCE_MS = 1400;
const MAX_RECORD_MS = 20000;
const AUDIO_LOAD_TIMEOUT_MS = 8000; // if the reply audio stalls, keep the text and free the mic

export default function BuiltinVoicePanel({ merchantId, sellerName, examples }) {
    const [phase, setPhase] = useState('idle'); // idle | listening | thinking | speaking
    const [turns, setTurns] = useState([]); // [{ role: 'user' | 'assistant', text }]
    const [error, setError] = useState('');
    const recordingRef = useRef(null);
    const soundRef = useRef(null);
    const silenceTimer = useRef(null);
    const maxTimer = useRef(null);
    const heardVoice = useRef(false);
    const busyRef = useRef(false);
    const turnsRef = useRef([]);
    turnsRef.current = turns;
    const pulse = useRef(new Animated.Value(1)).current;
    const scrollRef = useRef(null);

    useEffect(() => {
        if (phase !== 'listening' && phase !== 'speaking') {
            pulse.setValue(1);
            return undefined;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [phase, pulse]);

    const stopSound = useCallback(async () => {
        const s = soundRef.current;
        soundRef.current = null;
        if (s) await s.unloadAsync().catch(() => {});
    }, []);

    const cleanupRecording = useCallback(async () => {
        clearTimeout(silenceTimer.current);
        clearTimeout(maxTimer.current);
        silenceTimer.current = null;
        const rec = recordingRef.current;
        recordingRef.current = null;
        if (rec) await rec.stopAndUnloadAsync().catch(() => {});
    }, []);

    // Stop everything when the sheet closes
    useEffect(() => () => { cleanupRecording(); stopSound(); }, [cleanupRecording, stopSound]);

    const playReply = useCallback(
        async (audioPath) => {
            const uri = sellerApi.voiceAudioUrl(audioPath);
            if (!uri) {
                setPhase('idle');
                return;
            }
            try {
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
                const { sound } = await Promise.race([
                    Audio.Sound.createAsync({ uri }, { shouldPlay: true }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('audio timeout')), AUDIO_LOAD_TIMEOUT_MS)),
                ]);
                soundRef.current = sound;
                setPhase('speaking');
                sound.setOnPlaybackStatusUpdate((st) => {
                    if (st.didJustFinish || (!st.isLoaded && st.error)) {
                        stopSound();
                        setPhase('idle');
                    }
                });
            } catch {
                setPhase('idle');
            }
        },
        [stopSound]
    );

    const send = useCallback(
        async ({ audioBase64, text }) => {
            if (busyRef.current) return;
            busyRef.current = true;
            setError('');
            setPhase('thinking');
            if (text) setTurns((t) => [...t, { role: 'user', text }]);
            try {
                const result = await sellerApi.voiceTurn(merchantId, {
                    audioBase64,
                    text,
                    sellerName,
                    history: turnsRef.current.slice(-8),
                });
                setTurns((t) => {
                    const next = audioBase64 && result.transcript ? [...t, { role: 'user', text: result.transcript }] : t;
                    return [...next, { role: 'assistant', text: result.reply }];
                });
                busyRef.current = false;
                playReply(result.audioUrl); // the mic is usable again while Aura speaks (tap stops her)
            } catch (err) {
                setError(err.message || 'Aura could not answer. Please try again.');
                setPhase('idle');
            } finally {
                busyRef.current = false;
            }
        },
        [merchantId, sellerName, playReply]
    );

    const finishRecording = useCallback(async () => {
        const rec = recordingRef.current;
        if (!rec) return;
        clearTimeout(silenceTimer.current);
        clearTimeout(maxTimer.current);
        recordingRef.current = null;
        try {
            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => {});
            const base64 = uri ? await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }) : null;
            if (!base64 || base64.length < 1500 || !heardVoice.current) {
                setPhase('idle');
                setError("I didn't hear anything. Tap the mic and speak.");
                return;
            }
            await send({ audioBase64: base64 });
        } catch {
            setPhase('idle');
            setError('Recording failed. Please try again.');
        }
    }, [send]);

    const startRecording = useCallback(async () => {
        setError('');
        await stopSound();
        await cleanupRecording();
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) {
            setError('Allow microphone access to talk to Aura.');
            return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        heardVoice.current = false;
        const { recording } = await Audio.Recording.createAsync(
            { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
            (status) => {
                if (!status.isRecording) return;
                const level = status.metering ?? -160;
                if (level > SILENCE_DB) {
                    heardVoice.current = true;
                    clearTimeout(silenceTimer.current);
                    silenceTimer.current = null;
                } else if (heardVoice.current && !silenceTimer.current) {
                    silenceTimer.current = setTimeout(finishRecording, SILENCE_MS);
                }
            },
            200
        );
        recordingRef.current = recording;
        maxTimer.current = setTimeout(finishRecording, MAX_RECORD_MS);
        setPhase('listening');
    }, [cleanupRecording, stopSound, finishRecording]);

    const onMicPress = async () => {
        if (phase === 'thinking') return;
        if (phase === 'listening') {
            heardVoice.current = true; // tapped to send: trust the user
            await finishRecording();
            return;
        }
        if (phase === 'speaking') {
            await stopSound();
            setPhase('idle');
            return;
        }
        try {
            await startRecording();
        } catch {
            await cleanupRecording();
            setPhase('idle');
            setError('Could not start the microphone.');
        }
    };

    const label =
        phase === 'listening' ? 'Listening… tap to send'
        : phase === 'thinking' ? 'Aura is working on it…'
        : phase === 'speaking' ? 'Aura is speaking — tap to stop'
        : 'Tap and speak';

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.orbArea}>
                <Animated.View style={{ transform: [{ scale: pulse }] }}>
                    <TouchableOpacity
                        style={[styles.orb, phase === 'listening' && styles.orbListening, phase === 'speaking' && styles.orbSpeaking]}
                        onPress={onMicPress}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                    >
                        {phase === 'thinking' ? (
                            <ActivityIndicator color="#FFFFFF" size="large" />
                        ) : (
                            <Ionicons name={phase === 'speaking' ? 'volume-high' : phase === 'listening' ? 'stop' : 'mic'} size={46} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </Animated.View>
                <Text style={styles.orbLabel}>{label}</Text>
                <Text style={styles.orbHint}>Hindi, Hinglish or English</Text>
                {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 28 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {turns.length === 0 ? (
                    <>
                        <Text style={styles.section}>Try saying (or tap one)</Text>
                        {examples.map((e) => (
                            <TouchableOpacity key={e} style={styles.example} onPress={() => send({ text: e })} disabled={phase === 'thinking'}>
                                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                                <Text style={styles.exampleText}>"{e}"</Text>
                            </TouchableOpacity>
                        ))}
                    </>
                ) : (
                    turns.map((t, i) => (
                        <View key={i} style={[styles.bubble, t.role === 'user' ? styles.userBubble : styles.auraBubble]}>
                            <Text style={[styles.bubbleText, t.role === 'user' && { color: '#FFFFFF' }]}>{t.text}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    orbArea: { alignItems: 'center', paddingVertical: 18 },
    orb: {
        width: 116,
        height: 116,
        borderRadius: 58,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    orbListening: { backgroundColor: Colors.danger, shadowColor: Colors.danger },
    orbSpeaking: { backgroundColor: Colors.success, shadowColor: Colors.success },
    orbLabel: { marginTop: 14, fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
    orbHint: { marginTop: 3, fontSize: 12, color: Colors.textSecondary },
    error: { marginTop: 8, color: Colors.danger, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
    section: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
    example: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 12,
        backgroundColor: Colors.primaryLight,
        borderRadius: 12,
        marginBottom: 8,
    },
    exampleText: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
    bubble: { maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, marginBottom: 8 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    auraBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceSubtle, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
});
