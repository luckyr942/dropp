import React from "react";
import { View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "../theme/themeContext";

export default function HeaderBar({ userAvatar, onNotificationPress, onProfilePress, onMenuPress }) {

    const { theme, isDark, toggleTheme } = useTheme();

    return (
        <View style={styles.header}>
            { /* Left menu grid */}
            <TouchableOpacity
                onPress={onMenuPress || toggleTheme}
                style={[styles.iconButton, {
                    backgroundColor: theme.surface,
                }]}
                activeOpacity={0.7}
            >
                {/* Ionicons Menu Icon */}
                <Ionicons name="apps" size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            {/* App Name */}
            <View style={styles.logoContainer}>
                <Text style={[styles.logoText, { color: theme.textPrimary }]}>dropp</Text>
                <View style={[styles.logoDot, { backgroundColor: theme.primaryGreen }]} />
            </View>

            {/* Notification Icon */}
            <View style={styles.notificationIcon}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface }]}
                    onPress={onNotificationPress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
                </TouchableOpacity>

            </View>

            {/* Profile Avatar  */}
            <View style={styles.avatar}>
                <TouchableOpacity
                    style={[styles.avatarRing, { borderColor: theme.primaryGreen }]}
                    onPress={onProfilePress}
                    activeOpacity={0.8}
                >
                    {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
                    ) : (
                        <View style={styles.iconFallback}>
                            <Ionicons name="person" size={22} color="#1D4ED8" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        position: 'relative',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    logoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    logoText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    logoDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 3,
        marginTop: -8,
    },
    notificationIcon: {
        marginLeft: 'auto', // Pushes notification and avatar together to the right
        marginRight: 12,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    avatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#BFDBFE', // Matching light blue fill for vector fallback
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    iconFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});