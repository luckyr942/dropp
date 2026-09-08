import React from 'react';
import {
    StyleSheet, Text, View, Image, TouchableOpacity,
    TextInput, ScrollView, SafeAreaView, StatusBar
} from 'react-native';
import { theme } from '../../theme';
import { useRideStore } from '../../store/rideStore.js';

const VEHICLE_TIERS = [
    { id: 'standard', name: 'Standard', time: '3 min', seats: 4, price: 10 },
    { id: 'comfort', name: 'Comfort', time: '3 min', seats: 4, price: 15 },
    { id: 'luxury', name: 'Luxury', time: '3 min', seats: 4, price: 25 },
];

export default function HomeScreen({ onNavigate }) {
    const {
        pickupLocation, destination, fare, selectedVehicleTier,
        serviceType, driver, selectVehicle, setServiceType,
        setRideStatus, setPickupLocation, setDestination
    } = useRideStore();

    const handleRequestRide = () => {
        setRideStatus('SEARCHING');
        onNavigate('DriverArriving');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.bgDark} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Top Header */}
                <View style={styles.header}>
                    <View style={styles.avatarBadge}>
                        <Image
                            source={{ uri: driver?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80' }}
                            style={styles.avatar}
                        />
                    </View>
                </View>

                {/* Heading */}
                <Text style={styles.mainTitle}>Where do you{'\n'}want to go?</Text>
                

                {/* Driver Profile Card */}
                <View style={styles.profileCard}>
                    <Image
                        source={{ uri: driver?.avatar }}
                        style={styles.profileAvatar}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{driver?.name || 'Driver'}</Text>
                        <Text style={styles.profileSub}>{driver?.vehicle} • {driver?.plate}</Text>
                    </View>
                    <Text style={styles.stars}>★ {driver?.rating || '5.0'}</Text>
                </View>

                {/* Location Box */}
                <View style={styles.locationBox}>
                    <View style={styles.inputRow}>
                        <View style={styles.pinWhite} />
                        <TextInput
                            style={styles.input}
                            value={pickupLocation}
                            onChangeText={setPickupLocation}
                            placeholder="Add a pickup location"
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.pinGreen} />
                        <TextInput
                            style={styles.input}
                            value={destination}
                            onChangeText={setDestination}
                            placeholder="Add your destination"
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    </View>
                </View>

                {/* Service Toggle Pills */}
                <View style={styles.servicePills}>
                    <TouchableOpacity
                        style={[styles.pill, serviceType === 'driver' && styles.pillActive]}
                        onPress={() => setServiceType('driver')}
                    >
                        <Text style={[styles.pillText, serviceType === 'driver' && styles.pillTextActive]}>🚗 Driver</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.pill, serviceType === 'package' && styles.pillActive]}
                        onPress={() => setServiceType('package')}
                    >
                        <Text style={[styles.pillText, serviceType === 'package' && styles.pillTextActive]}>📦 Package</Text>
                    </TouchableOpacity>
                </View>

                {/* Vehicle Carousel */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
                    {VEHICLE_TIERS.map((tier) => {
                        const isSelected = selectedVehicleTier === tier.id;
                        return (
                            <TouchableOpacity
                                key={tier.id}
                                style={[styles.vCard, isSelected && styles.vCardActive]}
                                onPress={() => selectVehicle(tier.id, tier.price)}
                            >
                                <View style={styles.vHeader}>
                                    <Text style={styles.vName}>{tier.name}</Text>
                                    <Text style={styles.vTime}>{tier.time}</Text>
                                </View>
                                <Text style={styles.vSeats}>👤 {tier.seats}</Text>
                                <View style={styles.vFooter}>
                                    <View style={styles.steeringCircle}><Text style={styles.steeringText}>☸</Text></View>
                                    <Text style={styles.vPrice}>${tier.price}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Request Ride CTA Button */}
                <TouchableOpacity style={styles.ctaButton} onPress={handleRequestRide}>
                    <Text style={styles.ctaText}>Request Dropp Ride (${fare})</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bgDark },
    scrollContent: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 },
    avatarBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: theme.colors.accentGreen, overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    mainTitle: { color: theme.colors.textWhite, fontSize: 28, fontWeight: '800', lineHeight: 34, marginBottom: 16 },
    profileCard: { backgroundColor: theme.colors.cardDark, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    profileAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
    profileInfo: { flex: 1 },
    profileName: { color: theme.colors.textWhite, fontWeight: '700', fontSize: 15 },
    profileSub: { color: theme.colors.textMuted, fontSize: 12 },
    stars: { color: '#F59E0B', fontSize: 13, fontWeight: '700' },
    locationBox: { backgroundColor: theme.colors.cardDark, borderRadius: 20, padding: 14, marginBottom: 16 },
    inputRow: { backgroundColor: theme.colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    pinWhite: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.textWhite, marginRight: 10 },
    pinGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentGreen, marginRight: 10 },
    input: { flex: 1, color: theme.colors.textWhite, fontWeight: '600', fontSize: 14 },
    servicePills: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    pill: { flex: 1, backgroundColor: theme.colors.cardDark, paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
    pillActive: { backgroundColor: theme.colors.accentGreen },
    pillText: { color: theme.colors.textWhite, fontWeight: '700', fontSize: 14 },
    pillTextActive: { color: '#000' },
    carousel: { marginBottom: 16 },
    vCard: { minWidth: 130, backgroundColor: theme.colors.cardDark, borderRadius: 16, padding: 12, marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
    vCardActive: { backgroundColor: '#0B2B18', borderColor: theme.colors.accentGreen },
    vHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    vName: { color: theme.colors.textWhite, fontWeight: '700', fontSize: 13 },
    vTime: { color: theme.colors.textMuted, fontSize: 12 },
    vSeats: { color: theme.colors.textMuted, fontSize: 12 },
    vFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    steeringCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.accentGreen, justifyContent: 'center', alignItems: 'center' },
    steeringText: { color: '#000', fontSize: 14 },
    vPrice: { color: theme.colors.textWhite, fontWeight: '800', fontSize: 16 },
    ctaButton: { backgroundColor: theme.colors.accentGreen, paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
    ctaText: { color: '#000', fontWeight: '800', fontSize: 16 },
});