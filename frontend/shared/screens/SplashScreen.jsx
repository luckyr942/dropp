import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Animated,
    Easing,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';

export default function SplashScreen({ onFinish }) {
    const { isDark } = useTheme();

    // Animation References
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const taglineY = useRef(new Animated.Value(15)).current;

    const pulseRingScale = useRef(new Animated.Value(0.5)).current;
    const pulseRingOpacity = useRef(new Animated.Value(0.8)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;

    const startAnimations = () => {
        logoScale.setValue(0.3);
        logoOpacity.setValue(0);
        taglineOpacity.setValue(0);
        taglineY.setValue(15);
        pulseRingScale.setValue(0.5);
        pulseRingOpacity.setValue(0.8);
        progressWidth.setValue(0);

        // 1. Logo Scale & Fade Spring
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // 2. Tagline Fade & Slide Up (delayed 300ms)
        Animated.parallel([
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 500,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.timing(taglineY, {
                toValue: 0,
                duration: 500,
                delay: 300,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
        ]).start();

        // 3. Continuous Outer Green Pulse Ring
        Animated.loop(
            Animated.parallel([
                Animated.timing(pulseRingScale, {
                    toValue: 2.2,
                    duration: 1600,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseRingOpacity, {
                    toValue: 0,
                    duration: 1600,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 4. Progress Loading Bar
        Animated.timing(progressWidth, {
            toValue: 1,
            duration: 3500,
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(() => {
            if (onFinish) onFinish();
        });
    };

    useEffect(() => {
        startAnimations();
    }, []);

    const progressInterpolate = progressWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />

            <TouchableOpacity
                style={styles.centerBox}
                activeOpacity={1}
                onPress={startAnimations}
            >
                {/* Glowing Pulse Ring Effect */}
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            transform: [{ scale: pulseRingScale }],
                            opacity: pulseRingOpacity,
                        },
                    ]}
                />

                {/* Animated Logo Icon */}
                <Animated.View
                    style={[
                        styles.iconCircle,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <Ionicons name="navigate" size={44} color="#000000" />
                </Animated.View>

                {/* Brand Name Header */}
                <Animated.View
                    style={[
                        styles.brandRow,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <Text style={styles.brandTitle}>Dropp</Text>
                    <View style={styles.greenDot} />
                </Animated.View>

                {/* Subtitle / Tagline */}
                <Animated.View
                    style={{
                        opacity: taglineOpacity,
                        transform: [{ translateY: taglineY }],
                    }}
                >
                    <Text style={styles.tagline}>
                        Rides • Delivery • Logistics
                    </Text>
                    <Text style={styles.taglineSub}>Move freely. Live smarter.</Text>
                </Animated.View>
            </TouchableOpacity>

            {/* Bottom Progress Bar */}
            <View style={styles.footer}>
                <View style={styles.progressBarBg}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            { width: progressInterpolate },
                        ]}
                    />
                </View>
                <Text style={styles.footerVersion}>Dropp v1.0.0</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F17',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
    },
    pulseRing: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(34, 197, 94, 0.25)',
        borderWidth: 2,
        borderColor: '#22C55E',
    },
    iconCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#22C55E',
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    brandTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    greenDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22C55E',
        marginLeft: 4,
    },
    tagline: {
        fontSize: 14,
        fontWeight: '700',
        color: '#22C55E',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    taglineSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 4,
    },
    footer: {
        width: '70%',
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 2,
    },
    footerVersion: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
    },
});
