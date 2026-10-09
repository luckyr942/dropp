import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';

export default function RideOfferModal({ onAccept, onDecline }) {
    const { theme } = useTheme();
    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        if (timeLeft <= 0) {
            onDecline();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    return (
        <Modal transparent animationType="slide" visible={true}>
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {/* Countdown Timer Bar */}
                    <View style={styles.timerHeader}>
                        <View style={[styles.timerBadge, { backgroundColor: theme.tierCardActiveBg }]}>
                            <Ionicons name="timer-outline" size={16} color={theme.primaryGreen} />
                            <Text style={[styles.timerText, { color: theme.primaryGreen }]}>{timeLeft}s to Accept</Text>
                        </View>
                        <Text style={[styles.serviceType, { color: theme.textSecondary }]}>PACKAGE DELIVERY</Text>
                    </View>

                    {/* Earnings Banner */}
                    <View style={styles.earningsRow}>
                        <View>
                            <Text style={[styles.earningsLabel, { color: theme.textSecondary }]}>Estimated Earnings</Text>
                            <Text style={[styles.earningsValue, { color: theme.primaryGreen }]}>$24.50</Text>
                        </View>

                        <View style={styles.metaBadge}>
                            <Text style={[styles.metaText, { color: theme.textPrimary }]}>4.2 km • 12 mins</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                    {/* Pickup & Destination */}
                    <View style={styles.routeBox}>
                        <View style={styles.locRow}>
                            <Ionicons name="ellipse" size={10} color={theme.primaryGreen} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.locTitle, { color: theme.textSecondary }]}>PICKUP (1.2 km away)</Text>
                                <Text style={[styles.locText, { color: theme.textPrimary }]}>Cyber Hub, Building 10, Gurugram</Text>
                            </View>
                        </View>

                        <View style={[styles.routeLine, { backgroundColor: theme.inputSeparator }]} />

                        <View style={styles.locRow}>
                            <Ionicons name="location" size={12} color="#EF4444" />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.locTitle, { color: theme.textSecondary }]}>DESTINATION (3.0 km)</Text>
                                <Text style={[styles.locText, { color: theme.textPrimary }]}>Green Park Main, New Delhi</Text>
                            </View>
                        </View>
                    </View>

                    {/* Recipient OTP Requirement Note */}
                    <View style={[styles.otpNote, { backgroundColor: theme.inputBg }]}>
                        <Ionicons name="shield-checkmark" size={16} color={theme.primaryGreen} />
                        <Text style={[styles.otpText, { color: theme.textPrimary }]}>
                            Requires 4-Digit Recipient OTP verification at drop-off.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.declineBtn, { backgroundColor: theme.inputBg }]}
                            onPress={onDecline}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.declineText, { color: theme.textPrimary }]}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: theme.primaryGreen }]}
                            onPress={onAccept}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.acceptText}>ACCEPT OFFER (${timeLeft}s)</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
        padding: 16,
    },
    card: {
        borderRadius: 24,
        padding: 20,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    timerText: { fontWeight: '900', fontSize: 13 },
    serviceType: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    earningsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    earningsLabel: { fontSize: 12, fontWeight: '500' },
    earningsValue: { fontSize: 32, fontWeight: '900' },
    metaBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    metaText: { fontSize: 13, fontWeight: '800' },
    divider: { height: 1, marginVertical: 14 },
    routeBox: { gap: 10 },
    locRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    locTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    locText: { fontSize: 14, fontWeight: '700', marginTop: 2 },
    routeLine: { width: 2, height: 16, marginLeft: 4 },
    otpNote: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
        marginVertical: 16,
    },
    otpText: { fontSize: 12, fontWeight: '600', flex: 1 },
    btnRow: { flexDirection: 'row', gap: 12 },
    declineBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineText: { fontWeight: '800', fontSize: 15 },
    acceptBtn: {
        flex: 2,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptText: { color: '#000', fontWeight: '900', fontSize: 15 },
});
