import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';

const SERVICES = [
    { id: 'ride', label: 'Ride', desc: 'Get there', icon: 'car-sport', activeIcon: 'car-sport', library: 'Ionicons' },
    { id: 'food', label: 'Food', desc: 'Order food', icon: 'silverware-fork-knife', activeIcon: 'silverware-fork-knife', library: 'MaterialCommunityIcons' },
    { id: 'delivery', label: 'Delivery', desc: 'Send anything', icon: 'cube-outline', activeIcon: 'cube', library: 'Ionicons' },
    { id: 'shop', label: 'Shop', desc: 'Explore stores', icon: 'bag-handle-outline', activeIcon: 'bag-handle', library: 'Ionicons' },
];

export default function ServiceCategoryGrid({ activeService, onSelectService }) {
    const { theme, isDark } = useTheme();

    return (
        <View style={styles.grid}>
            {SERVICES.map((srv) => {
                const isSelected = activeService === srv.id;
                const iconColor = isSelected ? theme.primaryGreen : theme.textPrimary;

                // Clean dynamic style helpers
                const cardBg = isSelected ? (isDark ? 'rgba(0, 230, 118, 0.08)' : '#F0FDF4') : theme.surface;
                const cardBorder = isSelected ? theme.primaryGreen : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)');
                const badgeBg = isSelected ? (isDark ? 'rgba(0, 230, 118, 0.15)' : 'rgba(0, 200, 83, 0.12)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)');

                return (
                    <TouchableOpacity
                        key={srv.id}
                        activeOpacity={0.7}
                        onPress={() => onSelectService?.(srv.id)}
                        style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    >
                        {/* Icon Badge */}
                        <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
                            {srv.library === 'Ionicons' && (
                                <Ionicons name={isSelected ? srv.activeIcon : srv.icon} size={20} color={iconColor} />
                            )}
                            {srv.library === 'Feather' && (
                                <Feather name={srv.icon} size={18} color={iconColor} />
                            )}
                            {srv.library === 'MaterialCommunityIcons' && (
                                <MaterialCommunityIcons name={srv.icon} size={20} color={iconColor} />
                            )}
                        </View>

                        <Text style={[styles.label, { color: isSelected ? theme.primaryGreen : theme.textPrimary, fontWeight: isSelected ? '700' : '600' }]}>
                            {srv.label}
                        </Text>

                        <Text numberOfLines={1} style={[styles.desc, { color: isSelected ? (isDark ? 'rgba(0, 230, 118, 0.8)' : theme.primaryGreen) : theme.placeholder }]}>
                            {srv.desc}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    card: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        minHeight: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        letterSpacing: -0.2,
    },
    desc: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'center',
    },
});
