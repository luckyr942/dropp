import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/themeContext';

export default function SwapLocationsButton({ onPress }) {
    const { theme } = useTheme();

    return (
        <TouchableOpacity style={[
            styles.swapButton,
            {
                backgroundColor: theme.swapBg || '#1E293B',
                borderColor: theme.swapBorder || '#334155',
            },
        ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons name="swap-vertical" size={20} color={theme.textPrimary || 'FFFFFF'} />

        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    swapButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
})
