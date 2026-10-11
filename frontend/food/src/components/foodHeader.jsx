import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FoodTopHeader({
    location = 'Gurugram, Sector 28',
    balance = '₹450',
    avatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    onLocationPress,
    onWalletPress,
    onProfilePress,
    onNotificationPress,
}) {
    return (
        <View style={styles.header}>
            {/* Row 1: Logo | Wallet Pill | Avatar */}
            <View style={styles.topRow}>
                <Text style={styles.logo}>dropp</Text>

                <View style={styles.topRight}>
                    {/* White wallet pill with border */}
                    <TouchableOpacity style={styles.walletPill} onPress={onWalletPress} activeOpacity={0.8}>
                        <Ionicons name="wallet-outline" size={16} color="#0F172A" />
                        <Text style={styles.walletText}>{balance}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.bellBtn} onPress={onNotificationPress} activeOpacity={0.7}>
                        <Ionicons name="notifications-outline" size={26} color="#1E293B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Row 2: Location pill | Bell icon */}
            <View style={styles.bottomRow}>
                <TouchableOpacity style={styles.locationPill} onPress={onLocationPress} activeOpacity={0.7}>
                    <Ionicons name="location-sharp" size={16} color="#00C26F" />
                    <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
                    <Ionicons name="chevron-down" size={13} color="#64748B" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 1,
        paddingBottom: 6,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    topRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    walletText: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    avatarBox: {
        position: 'relative',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E2E8F0',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 11,
        height: 11,
        borderRadius: 5.5,
        backgroundColor: '#00C26F',
        borderWidth: 2,
        borderColor: '#EEF9F1',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    bellBtn: {
        padding: 4,
    },
});
