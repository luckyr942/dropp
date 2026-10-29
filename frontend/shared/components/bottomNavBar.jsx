import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Ionicons,
    MaterialCommunityIcons,
    Feather,
    FontAwesome5,
    MaterialIcons,
} from '@expo/vector-icons';
import useAura from '../voice/useAura';

/**
 * Pre-configured presets for different screens & use cases
 */
export const NAV_PRESETS = {
    // 1. Main Home (Super App Hub)
    main: {
        fadeColor: '#F3FBF7',
        tabs: [
            { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', family: 'Ionicons' },
            { id: 'Activity', label: 'Activity', icon: 'receipt-outline', activeIcon: 'receipt', family: 'Ionicons' },
            { id: 'CenterAction', isCenter: true },
            { id: 'Wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', family: 'Ionicons' },
            { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', family: 'Ionicons' },
        ],
        centerAction: {
            icon: 'microphone-outline',
            family: 'MaterialCommunityIcons',
            size: 28,
            colors: ['#00E57B', '#00AD57'],
            onPress: () => alert('Dropp Voice Assistant'),
        },
    },

    // 2. Food Marketplace
    food: {
        fadeColor: '#EEF9F1',
        tabs: [
            { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', family: 'Ionicons' },
            { id: 'Food', label: 'Food', icon: 'restaurant-outline', activeIcon: 'restaurant', family: 'Ionicons' },
            { id: 'CenterAction', isCenter: true },
            { id: 'Cart', label: 'Cart', icon: 'bag-handle-outline', activeIcon: 'bag-handle', family: 'Ionicons' },
            { id: 'Activity', label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt', family: 'Ionicons' },
        ],
        centerAction: {
            icon: 'microphone-outline',
            family: 'MaterialCommunityIcons',
            size: 28,
            colors: ['#00E57B', '#00AD57'],
            onPress: () => alert('Dropp Food Assistant: "Order iced coffee"'),
        },
    },

    // 3. Activity & Bookings Screen
    activity: {
        fadeColor: '#F2F6FA',
        tabs: [
            { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', family: 'Ionicons' },
            { id: 'Activity', label: 'Activity', icon: 'receipt-outline', activeIcon: 'receipt', family: 'Ionicons' },
            { id: 'CenterAction', isCenter: true },
            { id: 'Wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', family: 'Ionicons' },
            { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', family: 'Ionicons' },
        ],
        centerAction: {
            icon: 'car-sports',
            family: 'MaterialCommunityIcons',
            size: 26,
            colors: ['#00E57B', '#00AD57'],
            onPress: () => alert('Book a new ride or delivery'),
        },
    },

    // 4. Wallet Screen
    wallet: {
        fadeColor: '#F2F6FA',
        tabs: [
            { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', family: 'Ionicons' },
            { id: 'Activity', label: 'History', icon: 'receipt-outline', activeIcon: 'receipt', family: 'Ionicons' },
            { id: 'CenterAction', isCenter: true },
            { id: 'Wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', family: 'Ionicons' },
            { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', family: 'Ionicons' },
        ],
        centerAction: {
            icon: 'qrcode-scan',
            family: 'MaterialCommunityIcons',
            size: 22,
            colors: ['#00E57B', '#00AD57'],
            onPress: () => alert('Scan & Pay via Dropp Wallet'),
        },
    },

    // 5. Profile Screen
    profile: {
        fadeColor: '#F2F6FA',
        tabs: [
            { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', family: 'Ionicons' },
            { id: 'Activity', label: 'Activity', icon: 'receipt-outline', activeIcon: 'receipt', family: 'Ionicons' },
            { id: 'CenterAction', isCenter: true },
            { id: 'Wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', family: 'Ionicons' },
            { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', family: 'Ionicons' },
        ],
        centerAction: {
            icon: 'headset',
            family: 'MaterialCommunityIcons',
            size: 24,
            colors: ['#00E57B', '#00AD57'],
            onPress: () => alert('24/7 Dropp Customer Support'),
        },
    },
};

/**
 * Generate soft gradient colors that dissolve scrolling content into the screen background
 */
function getFadeColors(color = '#EEF9F1') {
    if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return [
            `rgba(${r}, ${g}, ${b}, 0.0)`,
            `rgba(${r}, ${g}, ${b}, 0.45)`,
            `rgba(${r}, ${g}, ${b}, 0.88)`,
            `rgba(${r}, ${g}, ${b}, 1.0)`,
        ];
    }
    return [
        'rgba(238, 249, 241, 0.0)',
        'rgba(238, 249, 241, 0.45)',
        'rgba(238, 249, 241, 0.88)',
        'rgba(238, 249, 241, 1.0)',
    ];
}

/**
 * Render an icon dynamically based on family
 */
export function TabIcon({ family = 'Ionicons', name, size = 22, color }) {
    if (family === 'MaterialCommunityIcons') {
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
    }
    if (family === 'Feather') {
        return <Feather name={name} size={size} color={color} />;
    }
    if (family === 'FontAwesome5') {
        return <FontAwesome5 name={name} size={size} color={color} />;
    }
    if (family === 'MaterialIcons') {
        return <MaterialIcons name={name} size={size} color={color} />;
    }
    return <Ionicons name={name} size={size} color={color} />;
}

/**
 * Universal Floating Bottom Navigation Bar
 * ─────────────────────────────────────────────────────────────────────────────
 * Keeps the identical floating pill design across all screens, but allows
 * full customizability of icons, labels, badges, and center action buttons per screen.
 *
 * Includes a soft background veil/gradient that smoothly dissolves scrolling content
 * so it never awkwardly clips or bleeds under the bottom bar or screen bezel.
 *
 * @param {string} preset - One of 'main' | 'food' | 'activity' | 'wallet' | 'profile'
 * @param {string} activeTab - The currently active tab ID
 * @param {function} onTabPress - Called when a tab is pressed: (tabId) => void
 * @param {Array} tabs - Custom list of tabs if overriding preset
 * @param {object|null} centerAction - Custom center button config or null to omit
 * @param {number} cartBadge - Convenience shortcut to show badge on 'Cart' tab
 * @param {string} fadeColor - Background color for the bottom fade veil (defaults to preset color)
 * @param {boolean} showFade - Set to false to disable the bottom veil gradient
 * @param {object} containerStyle - Optional style override for the container
 */
export default function BottomNavBar({
    preset = 'main',
    activeTab = 'Home',
    onTabPress,
    tabs,
    centerAction,
    cartBadge,
    fadeColor,
    showFade = true,
    containerStyle,
}) {
    const selectedPreset = NAV_PRESETS[preset] || NAV_PRESETS.main;
    const resolvedFadeColor = fadeColor || selectedPreset.fadeColor || '#EEF9F1';
    const fadeGradients = getFadeColors(resolvedFadeColor);

    // Use custom tabs if supplied, otherwise preset tabs
    let resolvedTabs = (tabs || selectedPreset.tabs).map((t) => {
        if (t.id === 'Cart' && cartBadge !== undefined) {
            return { ...t, badge: cartBadge };
        }
        return { ...t };
    });

    // Use custom centerAction if supplied, otherwise preset centerAction
    const resolvedCenterAction =
        centerAction !== undefined ? centerAction : selectedPreset.centerAction;

    let aura = null;
    try {
        aura = useAura();
    } catch (e) {
        // Safe fallback if BottomNavBar rendered outside AuraProvider
    }

    const handleCenterPress = () => {
        if (centerAction && typeof centerAction.onPress === 'function') {
            centerAction.onPress();
        } else if (aura?.openAura) {
            aura.openAura();
        } else if (resolvedCenterAction?.onPress) {
            resolvedCenterAction.onPress();
        }
    };

    // If center placeholder is missing but centerAction exists, insert in middle
    const hasCenterPlaceholder = resolvedTabs.some((t) => t.isCenter);
    if (!hasCenterPlaceholder && resolvedCenterAction) {
        const midIndex = Math.floor(resolvedTabs.length / 2);
        resolvedTabs.splice(midIndex, 0, { id: 'CenterAction', isCenter: true });
    }

    return (
        <View style={[styles.wrapper, containerStyle]} pointerEvents="box-none">
            {/* Background Soft Fade: Smoothly dissolves scrolling content so nothing awkwardly bleeds under the bar */}
            {showFade && (
                <LinearGradient
                    colors={fadeGradients}
                    locations={[0, 0.38, 0.76, 1]}
                    style={styles.bottomVeil}
                    pointerEvents="none"
                />
            )}

            {/* The Floating Navigation Bar */}
            <View style={styles.barWrapper} pointerEvents="box-none">
                <View style={styles.bar}>
                    {resolvedTabs.map((tab, index) => {
                        // Center Floating Action Button
                        if (tab.isCenter) {
                            if (!resolvedCenterAction) return null;
                            return (
                                <View key="center-fab-slot" style={styles.centerFabAnchor}>
                                    <TouchableOpacity
                                        style={styles.centerFab}
                                        activeOpacity={0.85}
                                        onPress={handleCenterPress}
                                        accessibilityRole="button"
                                        accessibilityLabel="Action button"
                                    >
                                        <LinearGradient
                                            colors={resolvedCenterAction.colors || ['#00E57B', '#00AD57']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.centerFabGradient}
                                        >
                                            <TabIcon
                                                family={resolvedCenterAction.family || 'MaterialCommunityIcons'}
                                                name={resolvedCenterAction.icon || 'microphone-outline'}
                                                size={resolvedCenterAction.size || 26}
                                                color="#FFFFFF"
                                            />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        const isActive = activeTab === tab.id;
                        const iconColor = isActive ? '#00C96B' : '#8A94A0';
                        const iconName = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

                        return (
                            <TouchableOpacity
                                key={tab.id || `tab-${index}`}
                                style={styles.navTab}
                                activeOpacity={0.7}
                                onPress={() => onTabPress?.(tab.id)}
                                accessibilityRole="button"
                                accessibilityLabel={tab.label}
                                accessibilityState={{ selected: isActive }}
                            >
                                <View style={styles.iconWrapper}>
                                    <TabIcon
                                        family={tab.family || 'Ionicons'}
                                        name={iconName}
                                        size={21}
                                        color={iconColor}
                                    />

                                    {/* Badge Count or Dot */}
                                    {tab.badge !== undefined && tab.badge !== null && tab.badge !== false && (
                                        <View
                                            style={
                                                typeof tab.badge === 'number'
                                                    ? styles.tabBadgeCount
                                                    : styles.tabBadgeDot
                                            }
                                        >
                                            {typeof tab.badge === 'number' && (
                                                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                                            )}
                                        </View>
                                    )}
                                </View>

                                <Text
                                    style={[
                                        styles.navLabel,
                                        isActive && styles.navLabelActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99,
        alignItems: 'center',
    },
    bottomVeil: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 120 : 105,
    },
    barWrapper: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#FFFFFF',
        height: 64,
        borderRadius: 32,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: '#EEF4F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 8,
    },
    navTab: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 2,
        position: 'relative',
    },
    iconWrapper: {
        width: 28,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    navLabel: {
        fontSize: 10,
        color: '#8A94A0',
        fontWeight: '600',
        fontFamily: 'PlusJakartaSans_600SemiBold',
    },
    navLabelActive: {
        color: '#00C96B',
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    tabBadgeCount: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    tabBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans_800ExtraBold',
    },
    tabBadgeDot: {
        position: 'absolute',
        top: -1,
        right: -2,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    centerFabAnchor: {
        width: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerFab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00C96B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },
    centerFabGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
