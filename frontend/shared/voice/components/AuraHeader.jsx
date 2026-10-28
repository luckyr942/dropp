// frontend/shared/voice/components/AuraHeader.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuraHeader({ onClose, onBack, credits = 50, isThinking, isListening }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={onBack || onClose}
          style={styles.circleBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        {/* Brand Title */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandDropp}>Dropp</Text>
          <Text style={styles.brandAura}> Aura</Text>
          <Ionicons name="sparkles" size={16} color="#00C868" style={{ marginLeft: 3 }} />
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          {/* Credit Badge */}
          <View style={styles.creditPill}>
            <Ionicons name="sparkles" size={13} color="#00A859" />
            <Text style={styles.creditText}>{credits} Credits</Text>
          </View>

          {/* Close Button */}
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.circleBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}

          {/* Profile Avatar */}
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://i.pinimg.com/736x/0b/97/6f/0b976f0a7aa1aa43870e1812eee5a55d.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.activeDot} />
          </View>
        </View>
      </View>

      {/* Sub-header Status Pill ("Dropp Aura ready") */}
      <View style={styles.statusPillRow}>
        <View style={styles.statusPill}>
          <LinearGradient
            colors={
              isThinking
                ? ['#F59E0B', '#D97706']
                : isListening
                ? ['#EF4444', '#DC2626']
                : ['#00E575', '#00A859']
            }
            style={styles.statusDot}
          />
          <Text style={styles.statusPillText}>
            {isThinking
              ? 'Aura is thinking...'
              : isListening
              ? 'Listening to you...'
              : 'Dropp Aura ready'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flex: 1,
  },
  brandDropp: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandAura: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00A859',
    letterSpacing: -0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FDF0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  creditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00A859',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00C868',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusPillRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
});
