import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AuraHero({ isThinking, isListening, compact = false }) {
  // Once the conversation starts, give the chat the space: small mascot + status line
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <Image
          source={require('../../../assets/aura/image copy.png')}
          style={styles.compactMascot}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.compactTitle}>
            <Text style={styles.headlineAura}>Aura</Text>
          </Text>
          <Text style={styles.compactStatus}>
            {isThinking ? 'Thinking...' : isListening ? 'Listening...' : 'Ready for your next request'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.glowContainer} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(167, 243, 208, 0.45)',
            'rgba(219, 234, 254, 0.55)',
            'rgba(243, 232, 255, 0.35)'
          ]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.ambientGlow}
        />
        <LinearGradient
          colors={['#74EBD5', '#9FACE6', '#D6A4E8', '#FFDEE9']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.orbSphere}
        />
      </View>

      {/* 3D Glowing Aura Mascot */}
      <View style={styles.mascotWrapper}>
        <Image
          source={require('../../../assets/aura/image copy.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>


      {/* AI assistant */}
      <View style={styles.assistantBadge}>
        <Ionicons name="sparkles" size={13} color="#4F46E5" />
        <Text style={styles.assistantText}>
          {isThinking ? 'Thinking...' : isListening ? 'Listening...' : 'AI Assistant'}
        </Text>
      </View>

      {/* Main Greeting */}
      <Text style={styles.headline}>
        Hey! I’m <Text style={styles.headlineAura}>Aura.</Text>
      </Text>
      <Text style={styles.subheadline}>What can I help you book today?</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 320,
  },
  ambientGlow: {
    position: 'absolute',
    width: 320,
    height: 280,
    borderRadius: 140,
    opacity: 0.85,
  },
  mascotWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#00CEC9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  mascotImage: {
    width: 135,
    height: 135,
  },
  assistantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  assistantText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  headlineAura: {
    color: '#00A859',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  compactMascot: {
    width: 48,
    height: 48,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  compactStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
});
