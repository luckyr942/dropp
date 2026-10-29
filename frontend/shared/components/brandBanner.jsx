// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useTheme } from '../theme/themeContext';
// import { SERVICE_BANNERS } from '../constants/bannerImages';

// export default function BrandBanner({ activeService = 'ride' }) {

//     const { theme, isDark } = useTheme();
//     const config_service = SERVICE_BANNERS[activeService] || SERVICE_BANNERS.ride;

//     //     return (
//     //         <View style={styles.container}>
//     //             {/* Left Text */}
//     //             <View style={styles.textColumn}>
//     //                 <View style={styles.logoRow}>
//     //                     <Text style={[styles.brandText, { color: theme.textPrimary }]}>Drop</Text>
//     //                     <Text style={[styles.brandText, { color: theme.primaryGreen }]}>p</Text>
//     //                 </View>
//     //                 <Text style={[styles.tagline, { color: theme.textSecondary }]}>
//     //                     Rides. Deliveries. Everything{'\n'}in one app.
//     //                 </Text>
//     //             </View>

//     //             {/* Right Route Graphic Badge */}
//     //             <View style={[styles.graphicBadge, { backgroundColor: theme.surface }]}>
//     //                 <Ionicons name="location" size={14} color={theme.primaryGreen} />
//     //                 <View>
//     //                     <Text style={[styles.badgeTitle, { color: theme.textPrimary }]}>Move freely</Text>
//     //                     <Text style={[styles.badgeSub, { color: theme.primaryGreen }]}>Live smarter</Text>
//     //                 </View>
//     //             </View>
//     //         </View>
//     //     );
//     // }

//     // const styles = StyleSheet.create({
//     //     container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
//     //     textColumn: { flex: 1 },
//     //     logoRow: { flexDirection: 'row', alignItems: 'center' },
//     //     brandText: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
//     //     tagline: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 4 },
//     //     graphicBadge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 3 },
//     //     badgeTitle: { fontSize: 11, fontWeight: '700' },
//     //     badgeSub: { fontSize: 11, fontWeight: '800' },
//     // });
//     return (
//         <View
//             style={[
//                 styles.container,
//                 {
//                     backgroundColor: isDark ? '#0D1117' : '#F8FAFC',
//                     borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
//                 },
//             ]}
//         >
//             {/* Left Typography Block */}
//             <View style={styles.textContainer}>
//                 <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
//                     drop<Text style={{ color: theme.primaryGreen }}>p</Text>
//                 </Text>
//                 <Text style={[styles.subtitleLine1, { color: theme.textSecondary }]}>
//                     {config_service.line1}
//                 </Text>
//                 <Text style={[styles.subtitleLine2, { color: theme.primaryGreen }]}>
//                     {config_service.line2}
//                 </Text>
//             </View>
//             {/* Floating Pill Badge */}
//             <View
//                 style={[
//                     styles.pillBadge,
//                     {
//                         backgroundColor: isDark ? 'rgba(18, 24, 34, 0.85)' : 'rgba(241, 245, 249, 0.9)',
//                         borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
//                     },
//                 ]}
//             >
//                 <Ionicons name="sparkles" size={10} color={theme.primaryGreen} style={{ marginBottom: 2 }} />
//                 <Text style={[styles.pillTop, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
//                     {config_service.pillTop}
//                 </Text>
//                 <Text style={[styles.pillBottom, { color: theme.primaryGreen }]}>
//                     {config_service.pillBottom}
//                 </Text>
//             </View>
//         </View>
//     );
// }
// const styles = StyleSheet.create({
//     container: {
//         minHeight: 120,
//         borderRadius: 24,
//         borderWidth: 1,
//         marginBottom: 20,
//         overflow: 'hidden',
//         position: 'relative',
//         justifyContent: 'center',
//         paddingHorizontal: 18,
//         paddingVertical: 14,
//     },
//     textContainer: {
//         width: '70%',
//         zIndex: 2,
//     },
//     brandTitle: {
//         fontSize: 28,
//         fontWeight: '900',
//         letterSpacing: -0.6,
//         marginBottom: 4,
//     },
//     subtitleLine1: {
//         fontSize: 13,
//         fontWeight: '500',
//         lineHeight: 18,
//     },
//     subtitleLine2: {
//         fontSize: 13,
//         fontWeight: '700',
//         lineHeight: 18,
//         marginTop: 2,
//     },
//     pillBadge: {
//         position: 'absolute',
//         right: 14,
//         bottom: 14,
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 14,
//         alignItems: 'center',
//         borderWidth: 1,
//         zIndex: 3,
//     },
//     pillTop: {
//         fontSize: 10,
//         fontWeight: '600',
//     },
//     pillBottom: {
//         fontSize: 10,
//         fontWeight: '700',
//         marginTop: 1,
//     },
// });

import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../theme/themeContext";
import { SERVICE_BANNERS } from "../constants/bannerImages";

export default function BrandBanner({ activeService = "ride" }) {
    const { theme, isDark } = useTheme();

    const config = SERVICE_BANNERS[activeService] || SERVICE_BANNERS.ride;

    const vehicleOpacity = useRef(new Animated.Value(1)).current;
    const vehicleX = useRef(new Animated.Value(0)).current;
    const vehicleScale = useRef(new Animated.Value(1)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        vehicleOpacity.setValue(0);
        vehicleX.setValue(25);
        vehicleScale.setValue(0.92);
        contentOpacity.setValue(0);

        Animated.parallel([
            Animated.timing(vehicleOpacity, {
                toValue: 1,
                duration: 350,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.spring(vehicleX, {
                toValue: 0,
                damping: 16,
                stiffness: 140,
                mass: 0.8,
                useNativeDriver: true,
            }),
            Animated.spring(vehicleScale, {
                toValue: 1,
                damping: 16,
                stiffness: 130,
                mass: 0.8,
                useNativeDriver: true,
            }),
            Animated.timing(contentOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [activeService]);

    const green = theme.primaryGreen || "#22C55E";

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? "#080D12" : "#F7FAF8",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
                },
            ]}
        >
            {/* Background Glow */}
            <View
                pointerEvents="none"
                style={[
                    styles.glow,
                    {
                        backgroundColor: isDark
                            ? "rgba(0,230,118,0.035)"
                            : "rgba(0,190,90,0.025)",
                    },
                ]}
            />

            {/* Left Content */}
            <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                <Text style={[styles.logo, { color: theme.textPrimary }]}>
                    Drop<Text style={{ color: green }}>p</Text>
                </Text>

                <Text style={[styles.lineOne, { color: theme.textSecondary }]}>
                    {config.line1}
                </Text>

                <Text style={[styles.lineTwo, { color: green }]}>
                    {config.line2}
                </Text>
            </Animated.View>

            {/* Dynamic Vehicle / Service Asset Image */}
            {config.image && (
                <Animated.View
                    style={[
                        styles.vehicleContainer,
                        {
                            opacity: vehicleOpacity,
                            transform: [
                                { translateX: vehicleX },
                                { scale: vehicleScale },
                            ],
                        },
                    ]}
                >
                    <Image
                        source={config.image}
                        resizeMode="contain"
                        style={styles.vehicle}
                    />
                </Animated.View>
            )}

            {/* Floating Pill Badge */}
            <Animated.View
                style={[
                    styles.pill,
                    {
                        opacity: contentOpacity,
                        backgroundColor: isDark
                            ? "rgba(18,29,36,0.94)"
                            : "rgba(255,255,255,0.94)",
                        borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                    },
                ]}
            >
                <Text style={[styles.pillTop, { color: theme.textPrimary }]}>
                    {config.pillTop}
                </Text>

                <Text style={[styles.pillBottom, { color: green }]}>
                    {config.pillBottom}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 150,
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        position: "relative",
        marginBottom: 18,
    },
    glow: {
        position: "absolute",
        width: 230,
        height: 230,
        borderRadius: 115,
        right: -55,
        top: -55,
        opacity: 0.8,
    },
    content: {
        position: "absolute",
        left: 18,
        top: 22,
        width: "50%",
        zIndex: 10,
    },
    logo: {
        fontSize: 26,
        fontWeight: "900",
        letterSpacing: -1,
        marginBottom: 6,
    },
    lineOne: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "500",
    },
    lineTwo: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: "800",
        marginTop: 2,
    },
    vehicleContainer: {
        position: "absolute",
        right: 15,
        top: 15,
        bottom: 15,
        width: 155,
        zIndex: 5,
    },
    vehicle: {
        width: "100%",
        height: "100%",
    },
    pill: {
        position: "absolute",
        right: 14,
        bottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 5,
        minWidth: 86,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: "center",
        zIndex: 10,
    },
    pillTop: {
        fontSize: 9,
        lineHeight: 12,
        fontWeight: "700",
    },
    pillBottom: {
        fontSize: 9,
        lineHeight: 12,
        fontWeight: "800",
        marginTop: 1,
    },
});
