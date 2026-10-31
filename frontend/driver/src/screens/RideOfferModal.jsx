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

export default function RideOfferModal({ offer, onAccept, onDecline }) {
    const { theme } = useTheme();
    const [timeLeft, setTimeLeft] = useState(30);

    const formatLocation = (loc, fallback) => {
        if (!loc) return fallback;
        if (typeof loc === 'string') return loc;
        return loc.label || loc.address || loc.name || fallback;
    };

    const serviceType = offer?.serviceType || 'RIDE';
    const fare = offer?.fare || '₹—';
    const distance = offer?.distance || '—';
    const pickup = formatLocation(offer?.pickup, 'Pickup location');
    const destination = formatLocation(offer?.destination, 'Drop location');
    const customerName = offer?.customerName;

    const isFood = serviceType.includes('FOOD');
    const isParcel = serviceType.includes('PARCEL') || serviceType.includes('DELIVERY');
    const isShop = serviceType.includes('SHOP');

    const badgeColor = isFood ? '#FF7A00' : isParcel ? '#3B82F6' : isShop ? '#A855F7' : theme.primaryGreen;
    const badgeBg = isFood ? 'rgba(255, 122, 0, 0.15)' : isParcel ? 'rgba(59, 130, 246, 0.15)' : isShop ? 'rgba(168, 85, 247, 0.15)' : theme.tierCardActiveBg;
    const serviceIcon = isFood ? 'fast-food' : isParcel ? 'cube' : isShop ? 'cart' : 'car';
    const pickupTitle = isFood ? 'RESTAURANT PICKUP' : isParcel ? 'SENDER PICKUP' : isShop ? 'STORE PICKUP' : 'PASSENGER PICKUP';
    const destTitle = isFood ? 'CUSTOMER DROP-OFF' : isParcel ? 'RECIPIENT DROP-OFF' : isShop ? 'CUSTOMER DROP-OFF' : 'DESTINATION';

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
                        <View style={[styles.timerBadge, { backgroundColor: badgeBg }]}>
                            <Ionicons name="timer-outline" size={16} color={badgeColor} />
                            <Text style={[styles.timerText, { color: badgeColor }]}>{timeLeft}s to Accept</Text>
                        </View>
                        <View style={[styles.pillarPill, { backgroundColor: badgeBg }]}>
                            <Ionicons name={serviceIcon} size={14} color={badgeColor} style={{ marginRight: 5 }} />
                            <Text style={[styles.serviceType, { color: badgeColor }]}>
                                {serviceType.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Earnings Banner */}
                    <View style={styles.earningsRow}>
                        <View>
                            <Text style={[styles.earningsLabel, { color: theme.textSecondary }]}>Guaranteed Earnings</Text>
                            <Text style={[styles.earningsValue, { color: theme.primaryGreen }]}>{fare}</Text>
                        </View>

                        <View style={styles.metaBadge}>
                            <Text style={[styles.metaText, { color: theme.textPrimary }]}>{distance}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />

                    {/* Pickup & Destination */}
                    <View style={styles.routeBox}>
                        <View style={styles.locRow}>
                            <Ionicons name="ellipse" size={10} color={badgeColor} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.locTitle, { color: theme.textSecondary }]}>{pickupTitle}</Text>
                                <Text style={[styles.locText, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {pickup}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.routeLine, { backgroundColor: theme.inputSeparator }]} />

                        <View style={styles.locRow}>
                            <Ionicons name="location" size={12} color="#EF4444" />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.locTitle, { color: theme.textSecondary }]}>{destTitle}</Text>
                                <Text style={[styles.locText, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {destination}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Customer & OTP Requirement Note */}
                    <View style={[styles.otpNote, { backgroundColor: theme.inputBg }]}>
                        <Ionicons name="shield-checkmark" size={16} color={theme.primaryGreen} />
                        <Text style={[styles.otpText, { color: theme.textPrimary }]}>
                            {customerName ? `${customerName} • ` : ''}Ask the customer for their 4-digit OTP to start.
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
                            onPress={() => onAccept(offer)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.acceptText}>ACCEPT OFFER ({timeLeft}s)</Text>
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
    pillarPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    serviceType: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
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
