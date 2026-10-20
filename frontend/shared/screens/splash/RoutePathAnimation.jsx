import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function RoutePathAnimation({ width, height, onComplete, reducedMotion = false }) {
    // Path length is approximately 650px across typical screens
    const PATH_LENGTH = 750;

    // Stroke Dash offset animation: starts at PATH_LENGTH (invisible), travels to 0 (fully drawn)
    const strokeAnim = useRef(new Animated.Value(reducedMotion ? 0 : PATH_LENGTH)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    // The primary arterial route flowing gracefully from bottom-left through center to the brand mark
    const startX = -10;
    const startY = height * 0.72;
    const cp1X = width * 0.28;
    const cp1Y = height * 0.68;
    const cp2X = width * 0.35;
    const cp2Y = height * 0.44;
    const endX = width * 0.5;
    const endY = height * 0.42;

    const routeD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

    useEffect(() => {
        if (reducedMotion) {
            strokeAnim.setValue(0);
            if (onComplete) onComplete();
            return;
        }

        Animated.parallel([
            Animated.timing(strokeAnim, {
                toValue: 0,
                duration: 650,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 650,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onComplete) onComplete();
        });
    }, [reducedMotion]);

    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <Defs>
                    <SvgGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#42F5A1" stopOpacity="0.1" />
                        <Stop offset="65%" stopColor="#42F5A1" stopOpacity="0.8" />
                        <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="1" />
                    </SvgGradient>
                    <SvgGradient id="routeGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#42F5A1" stopOpacity="0" />
                        <Stop offset="80%" stopColor="#42F5A1" stopOpacity="0.4" />
                        <Stop offset="100%" stopColor="#42F5A1" stopOpacity="0.9" />
                    </SvgGradient>
                </Defs>

                {/* Outer Glow Path */}
                <AnimatedPath
                    d={routeD}
                    stroke="url(#routeGlow)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={PATH_LENGTH}
                    strokeDashoffset={strokeAnim}
                />

                {/* Sharp Core Mint Path */}
                <AnimatedPath
                    d={routeD}
                    stroke="url(#routeGradient)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={PATH_LENGTH}
                    strokeDashoffset={strokeAnim}
                />
            </Svg>

            {/* Glowing Destination Particle at Route Endpoint */}
            <Animated.View
                style={[
                    styles.destinationPulse,
                    {
                        left: endX - 8,
                        top: endY - 8,
                        opacity: pulseAnim,
                        transform: [
                            {
                                scale: pulseAnim.interpolate({
                                    inputRange: [0, 0.7, 1],
                                    outputRange: [0.3, 1.4, 1.1],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <View style={styles.coreDot} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    destinationPulse: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(66, 245, 161, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coreDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F8FAFC',
        shadowColor: '#42F5A1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
    },
});
