import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuraChatThread({ messages = [], isThinking = false }) {
    if (!messages || messages.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {messages.map((msg, index) => {
                const isUser = msg.role === 'user';

                if (isUser) {
                    return (
                        <View key={msg.id || index} style={styles.userRow}>
                            <View style={styles.userBubble}>
                                <Text style={styles.userText}>{msg.text || msg.Text}</Text>
                            </View>
                            <Image
                                source={{
                                    uri: 'https://i.pinimg.com/736x/0b/97/6f/0b976f0a7aa1aa43870e1812eee5a55d.jpg',
                                }}
                                style={styles.chatAvatar}
                            />
                        </View>
                    );
                }

                return (
                    <View key={msg.id || index} style={styles.auraRow}>
                        {/* Glowing Aura Orb Avatar */}
                        <LinearGradient
                            colors={['#0F172A', '#1E1B4B', '#064E3B']}
                            style={styles.auraOrbAvatar}
                        >
                            <Text style={{ fontSize: 13 }}>👀</Text>
                        </LinearGradient>
                        <View style={styles.auraBubble}>
                            <Text style={styles.auraText}>{msg.text}</Text>
                        </View>
                    </View>
                );
            })}


            {/* Thinking state */}
            {/* Backend Thinking Indicator */}
            {isThinking && (
                <View style={styles.auraRow}>
                    <LinearGradient
                        colors={['#0F172A', '#1E1B4B', '#064E3B']}
                        style={styles.auraOrbAvatar}
                    >
                        <Text style={{ fontSize: 13 }}>✦</Text>
                    </LinearGradient>
                    <View style={[styles.auraBubble, styles.thinkingBubble]}>
                        <ActivityIndicator size="small" color="#00A859" />
                        <Text style={styles.thinkingText}>Finding best options...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginVertical: 10,
        gap: 12,
    },
    userRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: 10,
    },
    userBubble: {
        maxWidth: '78%',
        backgroundColor: '#EDE9FE',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderTopRightRadius: 4,
    },
    userText: {
        fontSize: 14,
        color: '#1E1B4B',
        fontWeight: '500',
        lineHeight: 20,
    },
    chatAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginTop: 2,
    },
    auraRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    auraOrbAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#00E575',
    },
    auraBubble: {
        maxWidth: '80%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderTopLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 2,
    },
    auraText: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '500',
        lineHeight: 20,
    },
    thinkingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    thinkingText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
});
