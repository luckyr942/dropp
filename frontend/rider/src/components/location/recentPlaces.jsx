import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../../theme/themeContext";

export function RecentPlacesItem({ location, onPress }) {

    const { theme } = useTheme();

    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#FFFFFF';
    const textSub = theme.textSecondary || theme.textSecondarySubtitles || '#64748B';
    const itemBg = theme.surface || theme.inputBg || '#0F172A';
    const iconBg = theme.iconCircleInactiveBg || theme.inputSeparator || '#1E293B';
    const iconColor = theme.iconCircleInactiveColor || '#94A3B8';


    return (
        <TouchableOpacity
            style={[styles.rowItem, { backgroundColor: itemBg }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <Ionicons name={location.icon || 'time-outline'} size={18} color={iconColor} />
            </View>
            <View style={styles.infoFlex}>
                <Text style={[styles.itemTitle, { color: textMain }]}>{location.title}</Text>
                <Text style={[styles.itemAddress, { color: textSub }]} numberOfLines={1}>
                    {location.address}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={textSub} />
        </TouchableOpacity>
    );
}

export default function RecentLocations({ locations = [], onSelectLocation, onSeeAll }) {
    const { theme } = useTheme();
    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#FFFFFF';
    const accentGreen = theme.primaryGreen || '#22C55E';
    return (
        <View style={styles.container}>
            {/* Header Row */}
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: textMain }]}>Recent locations</Text>
                <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
                    <Text style={[styles.seeAllText, { color: accentGreen }]}>See all</Text>
                </TouchableOpacity>
            </View>
            {/* List of Recent Locations */}
            <View style={styles.listFlex}>
                {locations.map((item) => (
                    <RecentPlacesItem
                        key={item.id}
                        location={item}
                        onPress={() => onSelectLocation && onSelectLocation(item)}
                    />
                ))}
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '700',
    },
    listFlex: {
        gap: 10,
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoFlex: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    itemAddress: {
        fontSize: 12,
        marginTop: 2,
    },
});
