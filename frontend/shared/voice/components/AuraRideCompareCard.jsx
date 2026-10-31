// frontend/shared/voice/components/AuraRideCompareCard.jsx
// Shows one trip priced across Dropp, Uber, Ola and Rapido, cheapest first.
// Dropp rows are live and book in-app; other apps are estimates that open in their own app.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BRAND = {
  dropp: { color: '#00A859', bg: '#E6F7EF' },
  uber: { color: '#111111', bg: '#F1F1F1' },
  ola: { color: '#3F8E3A', bg: '#EEF6E8' },
  rapido: { color: '#C99A00', bg: '#FFF7D6' },
};

const shortPlace = (p, fallback) => (p?.address || p || fallback).split(',')[0];

export default function AuraRideCompareCard({ comparison, onBookDropp, onOpenProvider }) {
  if (!comparison?.options?.length) return null;
  const { options, cheapest, cheapestDropp, droppPremium, distanceKm, durationMins, bookedRide } = comparison;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Ionicons name="git-compare" size={20} color="#00A859" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title}>Cheapest Ride Finder</Text>
          <Text style={styles.route} numberOfLines={1}>
            {shortPlace(comparison.pickup, 'Pickup')} → {shortPlace(comparison.drop, 'Drop')} • {distanceKm} km • ~{Math.round(durationMins)} min
          </Text>
        </View>
      </View>

      {options.map((o, idx) => {
        const brand = BRAND[o.provider] || BRAND.dropp;
        const isCheapest = idx === 0;
        return (
          <View key={`${o.provider}-${o.product}`} style={[styles.row, isCheapest && styles.rowCheapest]}>
            <View style={[styles.logo, { backgroundColor: brand.bg }]}>
              <Text style={[styles.logoText, { color: brand.color }]}>{o.providerName[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.nameRow}>
                <Text style={styles.product}>{o.product}</Text>
                {isCheapest && (
                  <View style={styles.cheapestPill}>
                    <Text style={styles.cheapestText}>CHEAPEST</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {o.confidence === 'live' ? `Live price${o.etaMins ? ` • ${o.etaMins} min away` : ''}` : 'Estimate • book in app'}
              </Text>
            </View>
            <Text style={styles.fare}>
              {o.confidence === 'live' ? '' : '~'}₹{o.fare}
            </Text>
          </View>
        );
      })}

      {bookedRide ? (
        <View style={styles.bookedBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#00A859" />
          <Text style={styles.bookedText}>Booked on Dropp • OTP {bookedRide.otp || 'on next screen'}</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {cheapest && cheapest.provider !== 'dropp' && cheapest.deepLink && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => onOpenProvider?.(cheapest.deepLink)} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={16} color="#0F172A" />
              <Text style={styles.secondaryText}>Open {cheapest.providerName} ~₹{cheapest.fare}</Text>
            </TouchableOpacity>
          )}
          {cheapestDropp && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onBookDropp?.(cheapestDropp.rideType)} activeOpacity={0.85}>
              <Text style={styles.primaryText}>Book {cheapestDropp.product} ₹{cheapestDropp.fare}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.footnote}>
        {droppPremium > 0
          ? `Dropp is ₹${droppPremium} more than the estimate, but books instantly with live tracking. `
          : ''}
        Uber, Ola & Rapido prices are estimates; the final fare is shown in their app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2EFE8',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E6F7EF', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  route: { fontSize: 12, color: '#64748B', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12, marginTop: 4 },
  rowCheapest: { backgroundColor: '#F2FBF6', borderWidth: 1, borderColor: '#BFE8D2' },
  logo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  product: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  cheapestPill: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#00A859' },
  cheapestText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
  meta: { fontSize: 11, color: '#64748B', marginTop: 2 },
  fare: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#00A859', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  secondaryText: { color: '#0F172A', fontWeight: '700', fontSize: 13 },
  bookedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: '#E6F7EF' },
  bookedText: { color: '#00874A', fontWeight: '700', fontSize: 13 },
  footnote: { fontSize: 10.5, color: '#94A3B8', marginTop: 10, lineHeight: 14 },
});
