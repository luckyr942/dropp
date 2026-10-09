import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
    { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'Orders', label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'Wallet', label: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
    { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function BottomNavBar({ activeTab, onTabPress }) {
    const { theme, isDark } = useTheme();

    let insets = { bottom: 0 };
    try {
        insets = useSafeAreaInsets();
    } catch (e) { }

    // Handles home indicator padding on modern iPhones & Android gesture bars
    const bottomPadding = insets.bottom > 0 ? insets.bottom - 4 : 12;

    return (
        <View
            style={[
                styles.wrapper,
                {
                    backgroundColor: theme.surface,
                    paddingBottom: bottomPadding,
                },
            ]}
        >
            <View style={styles.nav}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.tabItem}
                            onPress={() => onTabPress?.(tab.id)}
                            activeOpacity={0.7}
                        >
                            {/* Active Tab Icon Highlight */}
                            <View
                                style={[
                                    styles.iconWrapper,
                                    isActive && {
                                        backgroundColor: isDark
                                            ? 'rgba(34, 197, 94, 0.15)'
                                            : 'rgba(34, 197, 94, 0.1)',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={isActive ? tab.activeIcon : tab.icon}
                                    size={28}
                                    color={isActive ? theme.primaryGreen : theme.placeholder}
                                />
                            </View>

                            <Text
                                style={[
                                    styles.label,
                                    {
                                        color: isActive ? theme.primaryGreen : theme.placeholder,
                                        fontWeight: isActive ? '700' : '500',
                                    },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        // Soft drop shadow above navigation bar
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    nav: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        // maxWidth: 300,        // Lower this value (e.g., 280 or 300) to pull icons closer
        alignSelf: 'center',  // Keeps the group centered on the screen
        width: '100%',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 44,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    label: {
        fontSize: 11,
        letterSpacing: -0.2,
    },
});
