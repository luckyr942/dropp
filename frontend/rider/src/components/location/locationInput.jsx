import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/themeContext';
import SwapLocationsButton from './swapLocationButton';

export default function LocationInputCard({
    pickupLocation = '',
    destination = '',
    setPickupLocation,
    setDestination,
    onFocusPickup,
    onFocusDrop,
    onSwap,
}) {
    // Consume dynamic theme from ThemeContext
    const { theme } = useTheme();

    // Normalize typography and card background tokens between lightTheme & darkTheme
    const textMain = theme.textPrimary || theme.textPrimaryHeading || '#0C1727';
    const textSub = theme.textSecondary || theme.textSecondarySubtitles || '#64748B';
    const cardBg = theme.surface || theme.inputBg || '#FFFFFF';
    const separatorColor = theme.inputSeparator || '#E2E8F0';
    const placeholderColor = theme.placeholder || '#94A3B8';
    const greenAccent = theme.primaryGreen || '#22C55E';


    return (
        <View style={styles.container}>
            {/* Dynamic Theme Card Surface */}
            <View
                style={[
                    styles.inputsCard,
                    {
                        backgroundColor: cardBg,
                        shadowColor: theme.shadowColor || '#000000',
                        shadowOpacity: theme.shadowOpacity || 0.05,
                    },
                ]}
            >
                {/* Pickup Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.greenDot, { backgroundColor: greenAccent }]} />
                    <View style={styles.inputFlex}>
                        <Text style={[styles.inputLabel, { color: textSub }]}>Pick-up location</Text>
                        <TextInput
                            style={[styles.textInput, { color: textMain }]}
                            value={pickupLocation}
                            onChangeText={setPickupLocation}
                            onFocus={onFocusPickup}
                            placeholder="Search pick-up location"
                            placeholderTextColor={placeholderColor}
                        />
                    </View>
                    {pickupLocation.length > 0 && (
                        <TouchableOpacity onPress={() => setPickupLocation('')}>
                            <Ionicons name="close-circle" size={18} color={placeholderColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dynamic Theme Divider */}
                <View style={[styles.cardDivider, { backgroundColor: separatorColor }]} />

                {/* Drop Row */}
                <View style={styles.inputRow}>
                    <View style={styles.pinkDot} />
                    <View style={styles.inputFlex}>
                        <Text style={[styles.inputLabel, { color: textSub }]}>Drop location</Text>
                        <TextInput
                            style={[styles.textInput, { color: textMain }]}
                            value={destination}
                            onChangeText={setDestination}
                            onFocus={onFocusDrop}
                            placeholder="Search drop location"
                            placeholderTextColor={placeholderColor}
                        />
                    </View>
                    {destination.length > 0 && (
                        <TouchableOpacity onPress={() => setDestination('')}>
                            <Ionicons name="close-circle" size={18} color={placeholderColor} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Floating Swap Button */}
            <SwapLocationsButton onPress={onSwap} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    inputsCard: {
        flex: 1,
        borderRadius: 20,
        padding: 14,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
    },
    greenDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    pinkDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F43F5E',
        marginRight: 12,
    },
    inputFlex: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    textInput: {
        fontSize: 14,
        fontWeight: '600',
        height: 24,
        padding: 0,
    },
    cardDivider: {
        height: 1,
        marginVertical: 4,
        marginLeft: 22,
    },
});
