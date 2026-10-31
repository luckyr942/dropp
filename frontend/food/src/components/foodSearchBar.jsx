import React from "react";
import { StyleSheet, TextInput, View, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function FoodSearchBar({
    value,
    onChangeText,
    placeholder = "Search cafés, snacks, drinks, desserts...",
    onFilterPress,
}) {
    return (
        <View style={styles.container}>
            {/* Expanded Search Pill */}
            <View style={styles.searchPill}>
                <Ionicons name="search-outline" size={19} color="#718096" />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#A0AEC0"
                    value={value}
                    onChangeText={onChangeText}
                    returnKeyType="search"
                    autoCorrect={false}
                />
            </View>

            {/* Clear button while typing */}
            {value ? (
                <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={() => onChangeText && onChangeText('')}
                    activeOpacity={0.8}
                    accessibilityLabel="Clear search"
                >
                    <Ionicons name="close" size={18} color="#111827" />
                </TouchableOpacity>
            ) : null}

            {/* Compact Filter Button (only when a handler is provided) */}
            {onFilterPress ? (
            <TouchableOpacity
                style={styles.filterBtn}
                onPress={onFilterPress}
                activeOpacity={0.8}
            >
                <Feather name="sliders" size={18} color="#111827" />
            </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12, // Reduced outer margin to maximize search bar width
        marginVertical: 4,
        gap: 8, // Tighter gap so the search bar gets more room
    },
    searchPill: {
        flex: 1, // Takes up all remaining space
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 14, // Compact inner padding to maximize text area
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EDF2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
        gap: 8,
    },
    input: {
        flex: 1, // Stretches text area horizontally inside the pill
        fontSize: 13.5,
        fontWeight: '400',
        color: '#111827',
        paddingVertical: 0,
    },
    filterBtn: {
        width: 44, // Slightly narrower filter box to give search input maximum width
        height: 48,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EDF2F7',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
});