import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import BottomNavBar from '../components/bottomNavBar';

const { width } = Dimensions.get('window');


const Images = {
    logo: require('../../assets/logo.png'),
    hero: require('../../rider/assets/hero.png'),
    ride: require('../../assets/ride-tile.png'),
    food: require('../../assets/food-tile.png'),
    delivery: require('../../assets/delivery-tile.png'),
    shop: require('../../assets/shop-tile.png'),
    offerBanner: require('../../assets/hero_food_banner-clean.png'), // Exact image uploaded by user
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
};

export default function MainHomeScreen({ onNavigate }) {
    const [activeTab, setActiveTab] = useState('Home');

    const dispatchTo = (route, params = {}) => {
        if (typeof onNavigate === 'function') {
            onNavigate(route, params);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4FAF7" />

            {/* Subtle aesthetic gradient background */}
            <LinearGradient
                colors={['#E5F8EE', '#F3FBF7', '#FFFFFF']}
                locations={[0, 0.2, 0.55]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─────────────────────────────────────────────────────────────
                    1. TOP HEADER (dropp Logo, Location, Wallet, Bell, Avatar)
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {/* Genuine dropp Logo */}
                        <Image
                            source={Images.logo}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />

                        {/* Location Selector */}
                        <TouchableOpacity
                            style={styles.locationSelector}
                            activeOpacity={0.7}
                            onPress={() => dispatchTo('Location')}
                        >
                            <Ionicons name="location-sharp" size={14} color="#00C96B" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                Gurugram, Sector 28
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#606670" />
                        </TouchableOpacity>
                    </View>

                    {/* Right Header Controls */}
                    <View style={styles.headerRight}>
                        {/* Wallet Pill */}
                        <TouchableOpacity
                            style={styles.walletPill}
                            activeOpacity={0.8}
                            onPress={() => dispatchTo('Wallet')}
                        >
                            <Ionicons name="wallet-outline" size={15} color="#1A1D20" />
                            <Text style={styles.walletAmount}>₹450</Text>
                        </TouchableOpacity>

                        {/* Notification Bell */}
                        <TouchableOpacity
                            style={styles.iconCircleButton}
                            activeOpacity={0.8}
                            onPress={() => alert('No new notifications')}
                        >
                            <Ionicons name="notifications-outline" size={17} color="#1A1D20" />
                            <View style={styles.notificationBadge} />
                        </TouchableOpacity>

                        {/* User Avatar */}
                        <TouchableOpacity
                            style={styles.avatarWrapper}
                            activeOpacity={0.8}
                            onPress={() => dispatchTo('Profile')}
                        >
                            <Image
                                source={{ uri: Images.avatar }}
                                style={styles.avatarImage}
                            />
                            <View style={styles.onlineBadge} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    2. HERO SECTION ("Move freely. Live smarter.")
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.heroContainer}>
                    <Image
                        source={Images.hero}
                        style={styles.heroBackgroundImage}
                        resizeMode="cover"
                    />

                    {/* Left soft fade so text is 100% readable */}
                    <LinearGradient
                        colors={[
                            'rgba(243, 251, 247, 1)',
                            'rgba(243, 251, 247, 0.95)',
                            'rgba(243, 251, 247, 0.65)',
                            'rgba(243, 251, 247, 0.0)',
                        ]}
                        locations={[0, 0.44, 0.68, 0.98]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroEyebrow}>
                            ONE APP. ENDLESS POSSIBILITIES.
                        </Text>
                        <Text style={styles.heroHeadline}>
                            Move freely.{'\n'}
                            <Text style={styles.heroHighlight}>Live smarter.</Text>
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            Rides, food, deliveries and{' '}
                            <Text style={styles.boldText}>local{'\n'}shopping</Text> — all in one place.
                        </Text>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    3. 2x2 SERVICES GRID (Using Your New Tile Assets)
                ───────────────────────────────────────────────────────────── */}
                <View style={styles.gridContainer}>
                    {/* Row 1: Ride & Food */}
                    <View style={styles.gridRow}>
                        {/* 1. RIDE TILE */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            activeOpacity={0.86}
                            onPress={() => dispatchTo('RiderHome')}
                        >
                            <Image
                                source={Images.ride}
                                style={styles.cardTileImage}
                                resizeMode="cover"
                            />
                            <View style={styles.cardTextCol}>
                                <View>
                                    <Text style={styles.cardTitle}>Ride</Text>
                                    <Text style={styles.cardSubtitle}>Get there{'\n'}safely</Text>
                                </View>
                                <View style={styles.arrowCircle}>
                                    <Feather name="arrow-right" size={15} color="#111820" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* 2. FOOD TILE */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            activeOpacity={0.86}
                            onPress={() => dispatchTo('Food')}
                        >
                            <Image
                                source={Images.food}
                                style={styles.cardTileImage}
                                resizeMode="cover"
                            />
                            <View style={styles.cardTextCol}>
                                <View>
                                    <Text style={styles.cardTitle}>Food</Text>
                                    <Text style={styles.cardSubtitle}>Order from{'\n'}cafés & more</Text>
                                </View>
                                <View style={styles.arrowCircle}>
                                    <Feather name="arrow-right" size={15} color="#111820" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Row 2: Delivery & Shop */}
                    <View style={styles.gridRow}>
                        {/* 3. DELIVERY TILE */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            activeOpacity={0.86}
                            onPress={() => dispatchTo('PackageDetails')}
                        >
                            <Image
                                source={Images.delivery}
                                style={styles.cardTileImage}
                                resizeMode="cover"
                            />
                            <View style={styles.cardTextCol}>
                                <View>
                                    <Text style={styles.cardTitle}>Delivery</Text>
                                    <Text style={styles.cardSubtitle}>Send anything{'\n'}anywhere</Text>
                                </View>
                                <View style={styles.arrowCircle}>
                                    <Feather name="arrow-right" size={15} color="#111820" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* 4. SHOP TILE */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            activeOpacity={0.86}
                            onPress={() => dispatchTo('Food')}
                        >
                            <Image
                                source={Images.shop}
                                style={styles.cardTileImage}
                                resizeMode="cover"
                            />
                            <View style={styles.cardTextCol}>
                                <View>
                                    <Text style={styles.cardTitle}>Shop</Text>
                                    <Text style={styles.cardSubtitle}>Explore local{'\n'}stores</Text>
                                </View>
                                <View style={styles.arrowCircle}>
                                    <Feather name="arrow-right" size={15} color="#111820" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─────────────────────────────────────────────────────────────
                    4. SPECIAL OFFER BANNER (Flat 20% OFF + DROPP20)
                ───────────────────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.bannerContainer}
                    activeOpacity={0.9}
                    onPress={() => dispatchTo('Food')}
                >
                    <Image
                        source={Images.offerBanner}
                        style={styles.bannerBackgroundImage}
                        resizeMode="cover"
                    />

                    {/* Smooth gradient blend for text readability */}
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0.96)',
                            'rgba(240, 252, 246, 0.90)',
                            'rgba(240, 252, 246, 0.40)',
                            'rgba(240, 252, 246, 0.0)',
                        ]}
                        locations={[0, 0.45, 0.68, 0.98]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                    />

                    <View style={styles.bannerLeft}>
                        <Text style={styles.bannerTag}>SPECIAL OFFER</Text>
                        <Text style={styles.bannerHeading}>Flat 20% OFF</Text>
                        <Text style={styles.bannerSubtext}>on your first order</Text>

                        <View style={styles.couponPill}>
                            <Text style={styles.couponLabel}>Use Code</Text>
                            <Text style={styles.couponCode}>DROPP20</Text>
                            <Feather name="arrow-right" size={12} color="#FFFFFF" />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Bottom padding for floating navigation */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ─────────────────────────────────────────────────────────────
                5. FLOATING BOTTOM NAVIGATION BAR (Shared Component)
            ───────────────────────────────────────────────────────────── */}
            <BottomNavBar
                activeTab={activeTab}
                onTabPress={(tabId) => {
                    setActiveTab(tabId);
                    if (tabId === 'Activity') dispatchTo('Bookings');
                    else if (tabId === 'Wallet') dispatchTo('Wallet');
                    else if (tabId === 'Profile') dispatchTo('Profile');
                }}
                centerAction={{
                    icon: 'microphone-outline',
                    family: 'MaterialCommunityIcons',
                    size: 30,
                    colors: ['#00E57B', '#00AD57'],
                    onPress: () => alert('Dropp Voice Assistant'),
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3FBF7',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 6 : 2,
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    headerLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    logoImage: {
        width: 98,
        height: 33,
        marginBottom: 2,
    },
    locationSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    locationText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#1A1D20',
        marginHorizontal: 4,
        fontFamily: 'PlusJakartaSans_700Bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    walletPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 5,
        borderWidth: 1,
        borderColor: '#E8ECEF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    walletAmount: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#11181C',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    iconCircleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E8ECEF',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    notificationBadge: {
        position: 'absolute',
        top: 7,
        right: 8,
        width: 6.5,
        height: 6.5,
        borderRadius: 3.5,
        backgroundColor: '#FF3B30',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    onlineBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: '#00C96B',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },

    /* Hero Section */
    heroContainer: {
        height: 195,
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 13,
        position: 'relative',
        backgroundColor: '#EAF8F1',
    },
    heroBackgroundImage: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    heroTextContent: {
        position: 'absolute',
        top: 18,
        left: 16,
        right: 90,
        zIndex: 2,
    },
    heroEyebrow: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#717E85',
        letterSpacing: 1.2,
        marginBottom: 6,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    heroHeadline: {
        fontSize: 27,
        fontWeight: '900',
        color: '#111820',
        lineHeight: 29,
        letterSpacing: -0.7,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    heroHighlight: {
        color: '#00A855',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    heroSubtitle: {
        fontSize: 11,
        color: '#5D6872',
        lineHeight: 16,
        marginTop: 8,
        maxWidth: 200,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    boldText: {
        fontWeight: '800',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },

    /* 2x2 Services Grid (Landscape & Compact) */
    gridContainer: {
        gap: 11,
        marginBottom: 11,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 11,
    },
    serviceCard: {
        flex: 1,
        aspectRatio: 729 / 440,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    cardTileImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    cardTextCol: {
        flex: 1,
        justifyContent: 'space-between',
        height: '100%',
        padding: 10,
        zIndex: 2,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#111820',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    cardSubtitle: {
        fontSize: 10,
        color: '#626D77',
        lineHeight: 12.5,
        marginTop: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },

    /* Special Offer Banner */
    bannerContainer: {
        height: 124,
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#D8F3E5',
        shadowColor: '#00C96B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 8,
        justifyContent: 'center',
    },
    bannerBackgroundImage: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    bannerLeft: {
        paddingLeft: 16,
        paddingRight: 135,
        zIndex: 2,
    },
    bannerTag: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#76838C',
        letterSpacing: 1.1,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    bannerHeading: {
        fontSize: 21,
        fontWeight: '900',
        color: '#111820',
        marginTop: 2,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    bannerSubtext: {
        fontSize: 11,
        color: '#626D77',
        marginBottom: 8,
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    couponPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00C96B',
        paddingHorizontal: 11,
        paddingVertical: 5.5,
        borderRadius: 18,
        alignSelf: 'flex-start',
        gap: 5,
    },
    couponLabel: {
        fontSize: 10,
        color: '#E0F8ED',
        fontFamily: 'PlusJakartaSans_500Medium',
    },
    couponCode: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
});