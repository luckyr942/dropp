// frontend/rider/src/screens/RideCompletedScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Post-Ride Summary, Fare Receipt & Captain Rating Screen
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Alert,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const COMPLIMENTS = [
    { id: '1', label: '🚗 Smooth Drive' },
    { id: '2', label: '⭐ Polite Captain' },
    { id: '3', label: '🧼 Clean Vehicle' },
    { id: '4', label: '⏱️ On-Time Arrival' },
    { id: '5', label: '🛡️ Felt Very Safe' },
];

const TIP_OPTIONS = [0, 20, 50, 100];

export default function RideCompletedScreen({ onNavigate, onDone }) {
    const {
        driver,
        fare,
        distanceKm,
        durationMins,
        pickupLocation,
        destination,
        rideId,
        resetTripState,
    } = useRideStore();

    const [rating, setRating] = useState(5);
    const [selectedCompliments, setSelectedCompliments] = useState(['1', '2']);
    const [selectedTip, setSelectedTip] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const toggleCompliment = (id) => {
        setSelectedCompliments((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const handleSubmitRating = async () => {
        setSubmitting(true);
        try {
            if (rideId) {
                await fetch(`${API_BASE}/api/rides/${rideId}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating }),
                });
            }
        } catch (_) {
            // Silently complete
        } finally {
            setSubmitting(false);
            resetTripState();
            if (onDone) onDone();
            else if (onNavigate) onNavigate('Home');
        }
    };

    const driverName = driver?.name || 'Captain Vikram';
    const vehicle = driver?.vehicle || 'Swift Dzire • DL 1Z A 4421';
    const avatar =
        driver?.avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80';

    const baseFare = Number(fare || 165);
    const totalWithTip = baseFare + selectedTip;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Celebration Header ── */}
                <View style={styles.header}>
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={32} color="#FFFFFF" />
                    </View>
                    <Text style={styles.title}>You have Arrived!</Text>
                    <Text style={styles.subtitle}>
                        Hope you enjoyed your ride with {driverName}
                    </Text>
                </View>

                {/* ── Captain Card ── */}
                <View style={styles.driverCard}>
                    <Image source={{ uri: avatar }} style={styles.driverAvatar} />
                    <View style={styles.driverInfo}>
                        <Text style={styles.driverName}>{driverName}</Text>
                        <Text style={styles.driverVehicle}>{vehicle}</Text>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={13} color="#F59E0B" />
                            <Text style={styles.ratingBadgeText}>
                                {Number(driver?.rating || 4.89).toFixed(1)} Rating
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Star Rating Selector ── */}
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionTitle}>Rate your Experience</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setRating(star)}
                                activeOpacity={0.7}
                                style={styles.starTouch}
                            >
                                <Ionicons
                                    name={star <= rating ? 'star' : 'star-outline'}
                                    size={36}
                                    color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.ratingDescription}>
                        {rating === 5 && 'Excellent service!'}
                        {rating === 4 && 'Good ride.'}
                        {rating === 3 && 'Average experience.'}
                        {rating === 2 && 'Needs improvement.'}
                        {rating === 1 && 'Unsatisfactory.'}
                    </Text>
                </View>

                {/* ── Compliments Badges ── */}
                <View style={styles.complimentsSection}>
                    <Text style={styles.subSectionTitle}>What went well?</Text>
                    <View style={styles.complimentsWrap}>
                        {COMPLIMENTS.map((item) => {
                            const isSelected = selectedCompliments.includes(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.complimentPill,
                                        isSelected && styles.complimentPillActive,
                                    ]}
                                    onPress={() => toggleCompliment(item.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.complimentText,
                                            isSelected && styles.complimentTextActive,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Tip Captain ── */}
                <View style={styles.tipSection}>
                    <Text style={styles.subSectionTitle}>Add a Tip for Captain</Text>
                    <View style={styles.tipsRow}>
                        {TIP_OPTIONS.map((amt) => {
                            const isSelected = selectedTip === amt;
                            return (
                                <TouchableOpacity
                                    key={amt}
                                    style={[styles.tipPill, isSelected && styles.tipPillActive]}
                                    onPress={() => setSelectedTip(amt)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.tipText, isSelected && styles.tipTextActive]}>
                                        {amt === 0 ? 'No Tip' : `+₹${amt}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Detailed Receipt Breakdown ── */}
                <View style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                        <Ionicons name="receipt-outline" size={18} color="#0F172A" />
                        <Text style={styles.receiptTitle}>Trip Fare Receipt</Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptItem}>Distance & Duration</Text>
                        <Text style={styles.receiptVal}>
                            {Number(distanceKm || 6.2).toFixed(1)} km · {Math.round(durationMins || 18)} mins
                        </Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptItem}>Trip Base Fare</Text>
                        <Text style={styles.receiptVal}>₹{baseFare}</Text>
                    </View>

                    {selectedTip > 0 && (
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptItem}>Captain Tip</Text>
                            <Text style={styles.receiptVal}>+₹{selectedTip}</Text>
                        </View>
                    )}

                    <View style={styles.receiptDivider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Paid</Text>
                        <Text style={styles.totalAmount}>₹{totalWithTip}</Text>
                    </View>

                    <View style={styles.paymentBadgeRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#00C96B" />
                        <Text style={styles.paymentStatusText}>Paid via Dropp Pay / UPI</Text>
                    </View>
                </View>
            </ScrollView>

            {/* ── Fixed Submit Button ── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmitRating}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitBtnText}>
                        {submitting ? 'Submitting...' : 'Done & Return Home'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 90,
    },
    header: {
        alignItems: 'center',
        marginVertical: 12,
    },
    checkCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#00C96B',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#00C96B',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13.5,
        color: '#64748B',
        fontWeight: '600',
    },

    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 18,
        padding: 14,
        marginVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    driverAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#E2E8F0',
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    driverVehicle: {
        fontSize: 12.5,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    ratingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A',
    },

    ratingSection: {
        alignItems: 'center',
        marginVertical: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    starTouch: {
        padding: 4,
    },
    ratingDescription: {
        fontSize: 13,
        fontWeight: '700',
        color: '#00C96B',
    },

    complimentsSection: {
        marginVertical: 10,
    },
    subSectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 10,
    },
    complimentsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    complimentPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    complimentPillActive: {
        backgroundColor: '#F0FDF4',
        borderColor: '#00C96B',
    },
    complimentText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#475569',
    },
    complimentTextActive: {
        color: '#065F46',
    },

    tipSection: {
        marginVertical: 12,
    },
    tipsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    tipPill: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    tipPillActive: {
        backgroundColor: '#F0FDF4',
        borderColor: '#00C96B',
    },
    tipText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#334155',
    },
    tipTextActive: {
        color: '#00C96B',
    },

    receiptCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 18,
        padding: 16,
        marginVertical: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    receiptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    receiptTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    receiptItem: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    receiptVal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    receiptDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0F172A',
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: '900',
        color: '#00C96B',
    },
    paymentBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        backgroundColor: '#F0FDF4',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    paymentStatusText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#166534',
    },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    submitBtn: {
        height: 52,
        backgroundColor: '#00C96B',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#00C96B',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
