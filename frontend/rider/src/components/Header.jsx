import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';

export default function TopHeader({ userAvatar, onNotificationsPress, onProfilePress }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <View style={styles.container}>
            {/* App Grid Menu / Theme Toggle Trigger */}
            <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: theme.surface }]}
                onPress={toggleTheme}
                activeOpacity={0.8}
            >
                <Ionicons name="apps" size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            {/* Right Actions Cluster */}
            <View style={styles.rightGroup}>
                <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: theme.surface }]}
                    onPress={onNotificationsPress}
                    activeOpacity={0.8}
                >
                    <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.avatarRing, { borderColor: theme.primaryGreen }]}
                    onPress={onProfilePress}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' }}
                        style={styles.avatarImg}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
});
