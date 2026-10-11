import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
    { id: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'Orders', label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt-outline' },
    { id: 'Cart', label: 'Cart', icon: 'bag-handle-outline', activeIcon: 'bag-handle', badge: 2 },
    { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function FoodBottomNav({
    activeTab = 'Home',
    onTabPress,
}) {
    return (
        <View style={styles.container}>
            {TABS.map((tab) => {
                const active = activeTab === tab.id;

                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => onTabPress?.(tab.id)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: active }}
                    >
                        <View style={styles.iconArea}>
                            {active && <View style={styles.activeIndicator} />}

                            <Ionicons
                                name={active ? tab.activeIcon : tab.icon}
                                size={22}
                                color={active ? '#07985D' : '#84938A'}
                            />

                            {tab.badge != null && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {tab.badge}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text
                            style={[
                                styles.label,
                                active && styles.activeLabel,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    // container: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     justifyContent: 'space-around',
    //     backgroundColor: '#FFFFFF',
    //     borderTopWidth: StyleSheet.hairlineWidth,
    //     borderTopColor: '#E4EBE6',
    //     paddingTop: 8,
    //     paddingBottom: 8,
    //     margin: 0,
    //     elevation: 0,
    //     shadowOpacity: 0,
    // },


    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',

        backgroundColor: '#FFFFFF',

        // Full-width bar — no floating box
        margin: 5,
        borderRadius: 0,
        borderWidth: 0,

        paddingTop: 8,
        paddingBottom: 8,

        // Subtle separation from content above
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5EDE7',

        // No shadow or box effect
        elevation: 0,
        shadowOpacity: 0,
    },
    tab: {
        flex: 1,
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },


    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 43,
        gap: 4,
    },

    iconArea: {
        width: 28,
        height: 25,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },

    activeIndicator: {
        position: 'absolute',
        top: -8,
        width: 20,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#07985D',
    },

    badge: {
        position: 'absolute',
        top: -5,
        right: -6,
        minWidth: 15,
        height: 15,
        paddingHorizontal: 3,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#07985D',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },

    badgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
    },

    label: {
        fontSize: 10,
        fontWeight: '500',
        color: '#84938A',
        letterSpacing: 0.1,
    },

    activeLabel: {
        color: '#07985D',
        fontWeight: '700',
    },
});
