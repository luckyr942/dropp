import React from 'react';
import { StyleSheet, View, Text, Animated, Image } from 'react-native';
import { DROPP_THEME } from '../../theme/droppMotion';

const DroppLogoAsset = require('../../../assets/logo.png');

export default function BrandReveal({ logoAnim, reducedMotion = false }) {
    // Opacity: 0 -> 1
    // Scale: 0.88 -> 1.0
    // TranslateY: 10 -> 0
    const opacity = reducedMotion
        ? 1
        : logoAnim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0.8, 1],
        });

    const scale = reducedMotion
        ? 1
        : logoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
        });

    const translateY = reducedMotion
        ? 0
        : logoAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [12, 0],
        });

    const glowOpacity = reducedMotion
        ? 0.4
        : logoAnim.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [0, 0.6, 0.35],
        });

    return (
        <View style={styles.centerContainer} pointerEvents="none">
            {/* Ambient Mint Glow Backlight */}
            <Animated.View
                style={[
                    styles.glowBackdrop,
                    {
                        opacity: glowOpacity,
                        transform: [{ scale }],
                    },
                ]}
            />

            {/* Dropp Logo & Tagline Wrap */}
            <Animated.View
                style={[
                    styles.logoContent,
                    {
                        opacity,
                        transform: [{ scale }, { translateY }],
                    },
                ]}
            >
                {/* Official Crisp Dropp Logo Mark */}
                <Image
                    source={DroppLogoAsset}
                    style={styles.logoImage}
                    resizeMode="contain"
                />

                {/* Tagline */}
                <Text style={styles.tagline}>
                    Movement connects everything
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
    },
    glowBackdrop: {
        position: 'absolute',
        width: 240,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#42F5A1',
        shadowColor: '#42F5A1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
    },
    logoContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 195,
        height: 68,
        tintColor: '#F8FAFC',
    },
    tagline: {
        fontSize: 12.5,
        fontWeight: '600',
        color: DROPP_THEME.mutedText,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginTop: 6,
    },
});
