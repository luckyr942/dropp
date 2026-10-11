import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// ─── Individual Role Card ─────────────────────────────────────────
function RoleCard({ emoji, title, subtitle, gradientColors, borderColor, onPress, delay }) {
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { borderColor }]}
                >
                    {/* Emoji / Icon */}
                    <View style={styles.emojiContainer}>
                        <Text style={styles.emoji}>{emoji}</Text>
                    </View>

                    {/* Text */}
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardSubtitle}>{subtitle}</Text>
                    </View>

                    {/* Arrow */}
                    <Text style={[styles.arrow, { color: borderColor }]}>→</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function RoleSelectionScreen({ onSelectRole }) {
    const titleAnim = useRef(new Animated.Value(-30)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;

    // Animated dot opacities
    const dot1 = useRef(new Animated.Value(1)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Title slide-in
        Animated.parallel([
            Animated.spring(titleAnim, {
                toValue: 0,
                tension: 60,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        // Dot pulse loop
        const pulse = () => {
            Animated.sequence([
                Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
                Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
                Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
            ]).start(() => pulse());
        };
        pulse();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#080808" />

            {/* Ambient glow blobs */}
            <View style={styles.glowTopRight} />
            <View style={styles.glowBottomLeft} />

            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    {/* Animated dots */}
                    <View style={styles.dots}>
                        <Animated.View style={[styles.dot, styles.dotCyan, { opacity: dot1 }]} />
                        <Animated.View style={[styles.dot, styles.dotGreen, { opacity: dot2 }]} />
                        <Animated.View style={[styles.dot, styles.dotWhite, { opacity: dot3 }]} />
                    </View>

                    <Animated.View style={{ transform: [{ translateY: titleAnim }], opacity: titleOpacity }}>
                        <Text style={styles.brand}>Dropp.</Text>
                        <Text style={styles.title}>You are...</Text>
                        <Text style={styles.subtitle}>Pick your role to get started</Text>
                    </Animated.View>
                </View>

                {/* ── Role Cards ── */}
                <View style={styles.cards}>
                    <RoleCard
                        emoji="🛵"
                        title="A Customer"
                        subtitle="Rides · Food · Delivery · Shop"
                        gradientColors={['#00C96B', '#00A857', '#007840']}
                        borderColor="#00FF88"
                        delay={150}
                        onPress={() => onSelectRole('Customer')}
                    />

                    <RoleCard
                        emoji="🪖"
                        title="A Captain"
                        subtitle="Drive · Earn · Be Free"
                        gradientColors={['#141414', '#1C1C1C', '#111111']}
                        borderColor="#00FF88"
                        delay={280}
                        onPress={() => onSelectRole('Captain')}
                    />

                    <RoleCard
                        emoji="🏪"
                        title="A Merchant"
                        subtitle="Grow · Sell · Partner"
                        gradientColors={['#2D1B69', '#3D1F8A', '#1E0F4A']}
                        borderColor="#9B6FFF"
                        delay={410}
                        onPress={() => onSelectRole('Merchant')}
                    />
                </View>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <View style={styles.divider} />
                    <Text style={styles.footerText}>
                        Already a Dropp user?{' '}
                        <Text style={styles.signIn}>Sign in →</Text>
                    </Text>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080808',
    },
    safe: {
        flex: 1,
    },

    // Ambient glows
    glowTopRight: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#00C96B',
        opacity: 0.12,
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: 80,
        left: -80,
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#00C96B',
        opacity: 0.1,
    },

    // Header
    header: {
        paddingHorizontal: 28,
        paddingTop: 24,
        paddingBottom: 8,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dotCyan: { backgroundColor: '#00FFEE' },
    dotGreen: { backgroundColor: '#00C96B' },
    dotWhite: { backgroundColor: '#FFFFFF' },

    brand: {
        fontSize: 20,
        fontWeight: '800',
        color: '#00C96B',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1.5,
        lineHeight: 52,
    },
    subtitle: {
        fontSize: 14,
        color: '#666666',
        marginTop: 8,
        letterSpacing: 0.2,
    },

    // Cards
    cards: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 28,
        gap: 14,
        justifyContent: 'center',
    },
    cardWrapper: {
        width: '100%',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1.5,
        gap: 16,
    },
    emojiContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 30,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    cardSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 3,
        letterSpacing: 0.3,
    },
    arrow: {
        fontSize: 22,
        fontWeight: '600',
    },

    // Footer
    footer: {
        paddingHorizontal: 28,
        paddingBottom: 12,
        alignItems: 'center',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginBottom: 16,
    },
    footerText: {
        fontSize: 14,
        color: '#555555',
    },
    signIn: {
        color: '#00C96B',
        fontWeight: '700',
    },
});
