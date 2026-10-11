import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from '@expo/vector-icons';


//animation on android 
if (Platform.OS == 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SERVICES = [
    { id: 'ride', label: 'Ride', icon: 'car-sport-outline' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { id: 'delivery', label: 'Delivery', icon: 'cube-outline' },
    { id: 'shop', label: 'Shop', icon: 'bag-handle-outline' },
];

export default function ServiceTabs({
    activeTab = "food", onSelectTab
}) {
    const handlePress = (tabId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (onSelectTab) onSelectTab(tabId);
    };

    return (
        <View style={styles.container}>
            {SERVICES.map((item) => {
                const isActive = activeTab === item.id;

                if (isActive) {
                    // Active expanded green pill with sparkle accents
                    return (
                        <View key={item.id} style={styles.activeWrapper}>
                            {/* Joyful Gen-Z sparkle rays on top right (from Image 3) */}
                            <View style={styles.sparkleContainer}>
                                <View style={[styles.sparkleRay, styles.rayLeft]} />
                                <View style={[styles.sparkleRay, styles.rayCenter]} />
                                <View style={[styles.sparkleRay, styles.rayRight]} />
                            </View>

                            <TouchableOpacity
                                style={styles.activePill}
                                activeOpacity={0.9}
                                onPress={() => handlePress(item.id)}
                            >
                                <Ionicons
                                    name={item.activeIcon || item.icon}
                                    size={16}
                                    color="#FFFFFF"
                                />
                                <Text style={styles.activeLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                // Inactive Floating Capsule
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.inactivePill}
                        activeOpacity={0.75}
                        onPress={() => handlePress(item.id)}
                    >
                        <Ionicons
                            name={item.icon}
                            size={18}
                            color="#334155"
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, // Aligned with search bar
        marginVertical: 6,
        gap: 8,
    },
    activeWrapper: {
        position: 'relative',
    },
    // Joyful celebration tick marks
    sparkleContainer: {
        position: 'absolute',
        top: -6,
        right: 3,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        zIndex: 10,
    },
    sparkleRay: {
        backgroundColor: '#00C26F',
        borderRadius: 1,
    },
    rayLeft: {
        width: 1.5,
        height: 5,
        transform: [{ rotate: '-28deg' }],
    },
    rayCenter: {
        width: 1.5,
        height: 6.5,
        transform: [{ translateY: -1.5 }],
    },
    rayRight: {
        width: 1.5,
        height: 5,
        transform: [{ rotate: '28deg' }],
    },
    // Active Green Pill: Compact & sleek
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 38,
        paddingHorizontal: 18,
        borderRadius: 19,
        backgroundColor: '#00C26F',
        borderWidth: 1.2,
        borderColor: '#4ADE80',
        gap: 6,
        shadowColor: '#00C26F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    activeLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    // Inactive Pill: Sleek low-profile capsule
    inactivePill: {
        flex: 1,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 5,
        elevation: 1,
    },
});
