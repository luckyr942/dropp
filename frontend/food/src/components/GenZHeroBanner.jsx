import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ImageBackground,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32; // 16px horizontal padding on screen

export default function HeroBanner({ onOrderNow }) {
    return (
        <View style={styles.container}>
            <View style={styles.bannerCard}>
                {/* Landscape Drinks Image */}
                <ImageBackground
                    source={require('../../../assets/hero_food_banner-clean.png')}
                    style={styles.backgroundImage}
                    imageStyle={styles.backgroundImageStyle}
                    resizeMode="cover"
                >
                    {/* Soft Mint Linear Gradient Mask for seamless text contrast */}
                    <LinearGradient
                        colors={['#DCFCE7', 'rgba(220, 252, 231, 0.9)', 'rgba(220, 252, 231, 0.35)', 'transparent']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0.58, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                </ImageBackground>

                {/* Left Content Area */}
                <View style={styles.contentContainer}>
                    {/* Kicker Label */}
                    <Text style={styles.kickerText}>GOOD FOOD  •  BETTER MOOD</Text>

                    {/* Main Headline */}
                    <Text style={styles.headlineText}>
                        Gen Z{'\n'}Cravings,{'\n'}Delivered.
                    </Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitleText}>
                        Your next favourite sip is{'\n'}closer than you think.
                    </Text>

                    {/* Order Now CTA Button */}
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={onOrderNow}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.ctaText}>Order Now</Text>
                        <Feather name="arrow-right" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Cursive Handwriting Annotation (Shifted to upper-right leaf area clear of boba cup) */}
                <View style={styles.annotationContainer} pointerEvents="none">
                    <Text style={styles.cursiveText}>
                        Cafés{'\n'}Snacks{'\n'}Desserts{'\n'}& More
                    </Text>
                </View>

                {/* Carousel Pagination Dots */}
                <View style={styles.paginationContainer} pointerEvents="none">
                    <View style={[styles.dot, styles.activeDot]} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginVertical: 10,
    },
    bannerCard: {
        width: BANNER_WIDTH,
        height: 175,
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#DCFCE7',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
    },
    backgroundImageStyle: {
        borderRadius: 22,
    },
    contentContainer: {
        position: 'absolute',
        left: 16,
        top: 14,
        bottom: 14,
        width: '52%',
        justifyContent: 'center',
        zIndex: 3,
    },
    kickerText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 9,
        fontWeight: '700',
        color: '#15803D',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headlineText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 21,
        fontWeight: '900',
        color: '#052E16',
        lineHeight: 23,
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    subtitleText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 10,
        fontWeight: '500',
        color: '#166534',
        lineHeight: 13,
        marginBottom: 8,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00A859',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        alignSelf: 'flex-start',
        gap: 5,
        shadowColor: '#00A859',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    ctaText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    annotationContainer: {
        position: 'absolute',
        right: 14,
        bottom: 10,
        //top: 14,
        zIndex: 3,
    },
    cursiveText: {
        fontFamily: 'Caveat_600SemiBold',
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'right',
        lineHeight: 19,
        textShadowColor: 'rgba(255, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        zIndex: 4,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(5, 46, 22, 0.25)',
    },
    activeDot: {
        width: 14,
        backgroundColor: '#7a9685ff',
    },
});
