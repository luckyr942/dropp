// frontend/shared/voice/components/AuraBottomCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AuraBottomCard({
  count = 2,
  total = 318,
  onReviewBoth,
  buttonText = 'Confirm Both (Ride + Food)',
}) {
  const safeTotal = Number(total);
  const displayTotal = Number.isFinite(safeTotal) ? safeTotal.toLocaleString('en-IN') : '0';

  return (
    <View style={styles.container}>
      {/* ── Top Row: Draft Info + Price ── */}
      <View style={styles.topRow}>
        <View style={styles.draftInfo}>
          <View style={styles.walletIconBox}>
            <Ionicons name="layers-outline" size={20} color="#00A859" />
          </View>
          <View>
            <Text style={styles.draftTitle}>{count} booking draft{count > 1 ? 's' : ''}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <Text style={styles.draftSub}>Est. combined total</Text>
              <Ionicons name="information-circle-outline" size={12} color="#94A3B8" />
            </View>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.priceText}>{displayTotal}</Text>
        </View>
      </View>

      {/* ── Bottom Row: Large Glowing Confirm Both Button ── */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onReviewBoth}
        style={styles.btnWrapper}
      >
        <LinearGradient
          colors={['#00E575', '#00A859', '#065F46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnGradient}
        >
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          <Text style={styles.btnText}>{buttonText}</Text>
          <View style={styles.arrowCircle}>
            <Ionicons name="chevron-forward" size={16} color="#00A859" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#00A859',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    marginVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  draftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E8FDF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  draftTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  draftSub: {
    fontSize: 11,
    color: '#64748B',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00A859',
    marginRight: 2,
  },
  priceText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#00A859',
    letterSpacing: -0.5,
  },
  btnWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#00A859',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
