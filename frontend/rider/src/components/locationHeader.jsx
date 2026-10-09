import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';

export default function LocationHeader({ onBack, onUseCurrent, isLocating }) {
    const { theme } = useTheme();

    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#0F172A';
    const textSub = theme.textSecondary || theme.textSecondarySubtitles || '#64748B';
    const accentGreen = theme.primaryGreen || '#22C55E';
    const pillBg = theme.surface || '#FFFFFF';

    return (
        <View style={styles.container}>
            {/* 1. TOP ACTION BAR: Back button on the left, "Use current" on the right */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={[styles.backCircle, { backgroundColor: pillBg }]}
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={22} color={textMain} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.useCurrentBadge,
                        { backgroundColor: pillBg, borderColor: theme.inputSeparator || '#E2E8F0' },
                    ]}
                    onPress={onUseCurrent}
                    disabled={isLocating}
                    activeOpacity={0.7}
                >
                    <Ionicons name="radio-button-on" size={14} color={accentGreen} />
                    <Text style={[styles.useCurrentText, { color: textMain }]}>
                        {isLocating ? 'Locating...' : 'Use current'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 2. HERO CONTENT ROW: Left Title + Right Route Graphic */}
            <View style={styles.heroRow}>
                {/* Left Headline */}
                <View style={styles.titleBox}>
                    <Text style={[styles.titlePrimary, { color: textMain }]}>
                        Set your <Text style={[styles.titleGreen, { color: accentGreen }]}>route</Text>
                    </Text>
                    <Text style={[styles.subtitle, { color: textSub }]}>
                        Choose your pick-up and drop location
                    </Text>
                </View>

                {/* Right Route Graphic with Pickup & Drop Pins */}
                <View style={styles.graphicBox}>
                    {/* Pickup Marker (Top Left) */}
                    <View style={styles.pickupPinRow}>
                        <View style={[styles.badgePill, { backgroundColor: accentGreen }]}>
                            <Text style={styles.badgeText}>Pickup</Text>
                        </View>
                        <View style={[styles.pinCircle, { backgroundColor: accentGreen }]}>
                            <Ionicons name="navigate" size={10} color="#FFFFFF" />
                        </View>
                    </View>

                    {/* Curved connecting line */}
                    <View style={[styles.curvedLine, { borderColor: accentGreen }]} />

                    {/* Drop Marker (Bottom Right) */}
                    <View style={styles.dropPinRow}>
                        <View style={[styles.pinCircle, { backgroundColor: '#F43F5E' }]}>
                            <View style={styles.dropCenterDot} />
                        </View>
                        <View style={[styles.badgePill, { backgroundColor: '#F43F5E' }]}>
                            <Text style={styles.badgeText}>Drop</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    backCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    useCurrentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    useCurrentText: {
        fontSize: 12,
        fontWeight: '700',
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleBox: {
        flex: 1,
        paddingRight: 10,
    },
    titlePrimary: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    titleGreen: {
        // inherits color from accentGreen
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    graphicBox: {
        width: 90,
        height: 64,
        position: 'relative',
        justifyContent: 'space-between',
    },
    pickupPinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
    },
    dropPinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-end',
    },
    badgePill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
    pinCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropCenterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
    curvedLine: {
        position: 'absolute',
        top: 14,
        left: 28,
        width: 32,
        height: 32,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderBottomLeftRadius: 16,
        opacity: 0.4,
    },
});