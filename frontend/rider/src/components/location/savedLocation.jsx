import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../../theme/themeContext";

export function SavedPlaceCard({ place, onPress, isAddButton }) {

    const { theme } = useTheme();

    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#FFFFFF';
    const textSub = theme.textSecondary || theme.textSecondarySubtitles || '#64748B';
    const cardBg = theme.surface || theme.inputBg || '#0F172A';
    const iconBg = theme.iconCircleInactiveBg || theme.inputSeparator || '#1E293B';
    const accentGreen = theme.primaryGreen || '#22C55E';


    //render + icon button
    if (isAddButton) {
        return (
            <TouchableOpacity style={[
                styles.card,
                styles.addCardBorder,
                {
                    backgroundColor: cardBg,
                    borderColor: accentGreen,
                },
            ]}
                onPress={onPress}
                activeOpacity={0.7}

            >
                <View style={[
                    styles.iconCircle, {
                        backgroundColor: accentGreen + '20'
                    }
                ]}>
                    <Ionicons name="add" size={22} color={accentGreen} />
                </View>
                <Text style={[styles.title, { color: accentGreen }]}>Add Place</Text>
                <Text style={[styles.subtitle, { color: textSub }]}>Save location</Text>
            </TouchableOpacity>
        );
    }


    // Render standard Saved Place card
    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    backgroundColor: cardBg,
                    shadowColor: theme.shadowColor || '#000000',
                    shadowOpacity: theme.shadowOpacity || 0.05,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <Ionicons name={place.icon || 'location'} size={20} color={accentGreen} />
            </View>
            <Text style={[styles.title, { color: textMain }]}>{place.title}</Text>
            <Text style={[styles.subtitle, { color: textSub }]} numberOfLines={1}>
                {place.address}
            </Text>
        </TouchableOpacity>
    );
}
// 2. Default exported container component for the entire Saved Places section
export default function SavedPlaces({ places = [], onSelectPlace, onAddNewPlace }) {
    const { theme } = useTheme();
    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#FFFFFF';
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.headerRow}>
                <Text style={[styles.sectionTitle, { color: textMain }]}>Saved Places</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollGrid}>
                {/* Map saved places cards */}
                {places.map((place) => (
                    <View key={place.id} style={styles.cardWrapper}>
                        <SavedPlaceCard place={place} onPress={() => onSelectPlace && onSelectPlace(place)} />
                    </View>
                ))}
                {/* Add new place card */}
                <View style={styles.cardWrapper}>
                    <SavedPlaceCard isAddButton onPress={onAddNewPlace} />
                </View>
            </ScrollView>
        </View>
    );
}
const styles = StyleSheet.create({
    sectionContainer: {
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
    scrollGrid: {
        gap: 12,
        paddingRight: 10,
    },
    cardWrapper: {
        width: 120,
        height: 100,
    },
    card: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
    },
    addCardBorder: {
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 11,
        marginTop: 2,
    },
});




