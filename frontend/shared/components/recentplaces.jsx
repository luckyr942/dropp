import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../theme/themeContext";

const RECENT_PLACES = [
    { id: '1', title: 'Home', address: '123 Green Park, New Delhi', icon: 'home' },
    { id: '2', title: 'Work', address: 'Cyber Hub, Gurugram', icon: 'briefcase' },
];

export default function RecentPlaces({ onSelectPlaces }) {
    const { theme } = useTheme();


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Recent places</Text>
                <TouchableOpacity>
                    <Text style={[styles.seeAll, { color: theme.primaryGreen }]}>See all</Text>
                </TouchableOpacity>
            </View>
            {/* Places List */}
            <View style={styles.list}>
                {RECENT_PLACES.map((place) => (
                    <TouchableOpacity
                        key={place.id}
                        style={[styles.row, { backgroundColor: theme.surface }]}
                        onPress={() => onSelectPlace && onSelectPlace(place)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: theme.inputBg }]}>
                            <Ionicons name={place.icon} size={18} color={theme.textPrimary} />
                        </View>
                        <View style={styles.info}>
                            <Text style={[styles.placeTitle, { color: theme.textPrimary }]}>{place.title}</Text>
                            <Text style={[styles.placeAddress, { color: theme.textSecondary }]}>{place.address}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.placeholder} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>



    )
}
const styles = StyleSheet.create({
    container: { marginBottom: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800' },
    seeAll: { fontSize: 13, fontWeight: '700' },
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 14 },
    iconCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    info: { flex: 1 },
    placeTitle: { fontSize: 15, fontWeight: '700' },
    placeAddress: { fontSize: 12, marginTop: 2 },
});