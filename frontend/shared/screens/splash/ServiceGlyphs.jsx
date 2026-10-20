import React from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DROPP_THEME, SERVICE_ITEMS } from '../../theme/droppMotion';

export default function ServiceGlyphs({ serviceAnim, reducedMotion = false }) {
    return (
        <View style={styles.container} pointerEvents="none">
            {SERVICE_ITEMS.map((item, index) => {
                // Staggered reveal for each glyph: [0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1.0]
                const step = 0.22;
                const start = index * step;
                const end = Math.min(1, start + 0.35);

                const opacity = reducedMotion
                    ? 1
                    : serviceAnim.interpolate({
                        inputRange: [0, start, end, 1],
                        outputRange: [0, 0, 1, 1],
                    });

                const translateY = reducedMotion
                    ? 0
                    : serviceAnim.interpolate({
                        inputRange: [0, start, end, 1],
                        outputRange: [14, 14, 0, 0],
                    });

                const scale = reducedMotion
                    ? 1
                    : serviceAnim.interpolate({
                        inputRange: [0, start, end, 1],
                        outputRange: [0.85, 0.85, 1, 1],
                    });

                return (
                    <Animated.View
                        key={item.id}
                        style={[
                            styles.glyphCard,
                            {
                                opacity,
                                transform: [{ translateY }, { scale }],
                            },
                        ]}
                    >
                        <View style={[styles.iconCircle, { borderColor: `${item.color}30` }]}>
                            <Ionicons name={item.icon} size={18} color={item.color} />
                        </View>
                        <Text style={styles.glyphLabel}>{item.label}</Text>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 75,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    glyphCard: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(11, 33, 26, 0.7)',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#42F5A1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    glyphLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: DROPP_THEME.cleanWhite,
        marginTop: 6,
        letterSpacing: 0.3,
    },
});
