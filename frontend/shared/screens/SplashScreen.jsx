import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    View,
    Animated,
    Dimensions,
    StatusBar,
    AccessibilityInfo,
    Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { DROPP_THEME, DROPP_MOTION } from '../theme/droppMotion';
import CityGridPattern from './splash/CityGridPattern';
import RoutePathAnimation from './splash/RoutePathAnimation';
import BrandReveal from './splash/BrandReveal';
import ServiceGlyphs from './splash/ServiceGlyphs';

const { width, height } = Dimensions.get('window');

/**
 * Dropp Premium Animated Splash Screen
 * Full choreographic sequence:
 * Scene A (0–320ms): City awakens from near-black
 * Scene B (250–850ms): Living mint route travels across the screen
 * Scene C (650–1200ms): Dropp brand mark & tagline emerges with mint bloom
 * Scene D (900–1400ms): 4 compact services (Rides, Food, Delivery, Shop) revealed
 * Scene E (1400–1750ms): Settles & seamless opacity transition into the app
 */
export default function DroppAnimatedSplash({ onFinish }) {
    const [reducedMotion, setReducedMotion] = useState(false);

    // Animation Drivers
    const gridOpacity = useRef(new Animated.Value(0)).current;
    const logoAnim = useRef(new Animated.Value(0)).current;
    const serviceAnim = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Detect OS Reduced Motion Preference
        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => setReducedMotion(enabled))
            .catch(() => {});

        // Release the static native splash layer immediately now that React Native is rendering
        SplashScreen.hideAsync().catch(() => {});

        if (reducedMotion) {
            // Simplified fast transition for accessibility
            gridOpacity.setValue(1);
            logoAnim.setValue(1);
            serviceAnim.setValue(1);
            const timer = setTimeout(() => {
                if (onFinish) onFinish();
            }, 600);
            return () => clearTimeout(timer);
        }

        // Scene A: The City Awakens (0–320ms)
        Animated.timing(gridOpacity, {
            toValue: 1,
            duration: DROPP_MOTION.sceneA.gridFadeIn,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();

        // Scene C: Logo Reveal (Starts around 450ms while route is mid-flight)
        const logoTimer = setTimeout(() => {
            Animated.timing(logoAnim, {
                toValue: 1,
                duration: DROPP_MOTION.sceneC.logoFade,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                useNativeDriver: true,
            }).start();
        }, 400);

        // Scene D: Connected Services (750ms)
        const serviceTimer = setTimeout(() => {
            Animated.timing(serviceAnim, {
                toValue: 1,
                duration: DROPP_MOTION.sceneD.serviceFade,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        }, 750);

        // Scene E: Settle & Exit into Main App (1500–1750ms)
        const exitTimer = setTimeout(() => {
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: DROPP_MOTION.sceneE.exitFade,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            }).start(() => {
                if (onFinish) onFinish();
            });
        }, 1550);

        return () => {
            clearTimeout(logoTimer);
            clearTimeout(serviceTimer);
            clearTimeout(exitTimer);
        };
    }, [reducedMotion]);

    return (
        <Animated.View style={[styles.root, { opacity: containerOpacity }]}>
            <StatusBar barStyle="light-content" backgroundColor="#07110F" translucent />

            {/* Rich Radial/Linear Background Depth */}
            <LinearGradient
                colors={[DROPP_THEME.bgNearBlack, DROPP_THEME.bgDarkForest, DROPP_THEME.bgNearBlack]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Scene A: Subtle City Grid Artery Pattern */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: gridOpacity }]}>
                <CityGridPattern width={width} height={height} />
            </Animated.View>

            {/* Scene B: The Living Mint Route Trail */}
            <RoutePathAnimation
                width={width}
                height={height}
                reducedMotion={reducedMotion}
            />

            {/* Scene C: Dropp Logo & Brand Reveal */}
            <BrandReveal
                logoAnim={logoAnim}
                reducedMotion={reducedMotion}
            />

            {/* Scene D: 4 Service Glyphs (Rides, Food, Delivery, Shop) */}
            <ServiceGlyphs
                serviceAnim={serviceAnim}
                reducedMotion={reducedMotion}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: DROPP_THEME.bgNearBlack,
        zIndex: 999,
    },
});
