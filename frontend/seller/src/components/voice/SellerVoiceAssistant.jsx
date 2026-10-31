// Seller voice assistant powered by Bolna AI.
// A floating mic opens a sheet; the seller talks ("Maggi ka stock 20 kar do") and Aura updates the
// store through backend tools. Every change Aura makes arrives over the store's live socket and is
// listed here, while the rest of the dashboard refreshes behind the sheet.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/sellerTheme.js';
import * as sellerApi from '../../api/sellerApi.js';
import { bolnaCallPageHtml } from './bolnaCallPage.js';
import BuiltinVoicePanel from './BuiltinVoicePanel.jsx';

const SESSION_REFRESH_MS = 90 * 1000; // Bolna sessions live ~2 minutes; refresh before they lapse

const EXAMPLES = [
    'Maggi ka stock 20 kar do',
    'Naya product add karo: Amul Taaza 500ml, 30 rupaye, 40 packet',
    'Kaun se items khatam ho rahe hain?',
    'Latest order accept kar do',
    'Aaj ki sale kitni hui?',
];

export function VoiceFab({ onPress, active }) {
    return (
        <TouchableOpacity
            style={[styles.fab, active && styles.fabActive]}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open Aura voice assistant"
        >
            <Ionicons name="mic" size={26} color="#FFFFFF" />
        </TouchableOpacity>
    );
}

export default function SellerVoiceAssistant({ visible, onClose, merchantId, storeName, sellerName, actions }) {
    const webRef = useRef(null);
    const refreshTimer = useRef(null);
    const inCallRef = useRef(false);
    const [phase, setPhase] = useState('loading'); // loading | ready | live | unavailable
    const [error, setError] = useState('');
    // 'bolna' = live full-duplex call via Bolna; 'builtin' = push-to-talk via our own STT → AI → TTS
    const [mode, setMode] = useState(null);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        sellerApi
            .fetchVoiceStatus()
            .then((s) => !cancelled && setMode(s?.mode === 'bolna' ? 'bolna' : 'builtin'))
            .catch(() => !cancelled && setMode('builtin'));
        return () => { cancelled = true; };
    }, [visible]);

    const mintSession = useCallback(async () => {
        try {
            const session = await sellerApi.startVoiceSession(merchantId, { sellerName });
            webRef.current?.injectJavaScript(`window.__setSession(${JSON.stringify(session)}); true;`);
            setError('');
            clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => {
                if (!inCallRef.current) mintSession();
            }, SESSION_REFRESH_MS);
        } catch (err) {
            setPhase('unavailable');
            setError(err.status === 503 ? 'The voice assistant is not set up on the server yet.' : err.message);
        }
    }, [merchantId, sellerName]);

    useEffect(() => {
        if (!visible) {
            clearTimeout(refreshTimer.current);
            inCallRef.current = false;
            setPhase('loading');
            setError('');
            setMode(null);
        }
        return () => clearTimeout(refreshTimer.current);
    }, [visible]);

    const onMessage = useCallback(
        (event) => {
            let msg;
            try {
                msg = JSON.parse(event.nativeEvent.data);
            } catch {
                return;
            }
            switch (msg.type) {
                case 'ready':
                    setPhase((p) => (p === 'unavailable' ? p : 'ready'));
                    mintSession();
                    break;
                case 'need-session':
                    mintSession();
                    break;
                case 'call-start':
                    inCallRef.current = true;
                    clearTimeout(refreshTimer.current);
                    setPhase('live');
                    setError('');
                    break;
                case 'call-end':
                    inCallRef.current = false;
                    setPhase('ready');
                    break;
                case 'error':
                    setError(msg.data?.message || 'Voice call failed');
                    break;
                default:
                    break;
            }
        },
        [mintSession]
    );

    const handleClose = () => {
        // Closing the sheet unloads the page, which hangs up any active call
        inCallRef.current = false;
        onClose?.();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <View style={styles.badge}>
                            <Ionicons name="sparkles" size={16} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Aura for {storeName}</Text>
                            <Text style={styles.subtitle}>
                                {phase === 'live' ? 'Listening — just speak' : 'Manage stock, products and orders by voice'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.close} accessibilityLabel="Close voice assistant">
                            <Ionicons name="close" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {mode === null && (
                        <View style={styles.unavailable}>
                            <ActivityIndicator color={Colors.primary} />
                        </View>
                    )}

                    {mode === 'builtin' && (
                        <View style={{ flex: 1 }}>
                            <BuiltinVoicePanel merchantId={merchantId} sellerName={sellerName} examples={EXAMPLES} />
                        </View>
                    )}

                    {mode === 'bolna' && (
                        <>
                    {phase === 'unavailable' ? (
                        <View style={styles.unavailable}>
                            <Ionicons name="mic-off-outline" size={40} color={Colors.textMuted} />
                            <Text style={styles.unavailableTitle}>Voice isn't available</Text>
                            <Text style={styles.unavailableText}>{error}</Text>
                            <TouchableOpacity style={styles.retry} onPress={() => { setPhase('ready'); mintSession(); }}>
                                <Text style={styles.retryText}>Try again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        visible && (
                            <View style={styles.callArea}>
                                <WebView
                                    ref={webRef}
                                    // https base URL gives the page a secure context, which the microphone requires
                                    source={{ html: bolnaCallPageHtml, baseUrl: 'https://seller-voice.dropp.app' }}
                                    originWhitelist={['*']}
                                    onMessage={onMessage}
                                    javaScriptEnabled
                                    allowsInlineMediaPlayback
                                    mediaPlaybackRequiresUserAction={false}
                                    mediaCapturePermissionGrantType="grant"
                                    scrollEnabled={false}
                                    style={styles.web}
                                    containerStyle={styles.web}
                                />
                            </View>
                        )
                    )}

                    {!!error && phase !== 'unavailable' && <Text style={styles.error}>{error}</Text>}

                    <ScrollView style={styles.lower} contentContainerStyle={{ paddingBottom: 28 }}>
                        {actions.length > 0 ? (
                            <>
                                <Text style={styles.section}>Done by Aura</Text>
                                {actions.map((a) => (
                                    <View key={a.at + a.message} style={styles.action}>
                                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                                        <Text style={styles.actionText}>{a.message}</Text>
                                    </View>
                                ))}
                            </>
                        ) : (
                            <>
                                <Text style={styles.section}>Try saying</Text>
                                {EXAMPLES.map((e) => (
                                    <View key={e} style={styles.example}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                                        <Text style={styles.exampleText}>"{e}"</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 18,
        bottom: 92,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 8,
    },
    fabActive: { backgroundColor: Colors.success },
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    sheet: {
        height: '82%',
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border, marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badge: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
    subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    close: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' },
    callArea: { height: 230, marginTop: 8 },
    web: { flex: 1, backgroundColor: 'transparent' },
    error: { color: Colors.danger, fontSize: 12, textAlign: 'center', marginTop: 4 },
    lower: { flex: 1, marginTop: 12 },
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
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 12,
        backgroundColor: Colors.successLight,
        borderRadius: 12,
        marginBottom: 8,
    },
    actionText: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
    unavailable: { height: 230, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
    unavailableTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
    unavailableText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
    retry: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.primaryLight },
    retryText: { color: Colors.primary, fontWeight: '700' },
});
