import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

const VEHICLES = [
    {
        id: 'bike',
        name: 'Dropp Bike',
        sub: 'Beat the traffic • Solo rider',
        icon: 'bicycle',
        price: 6.50,
        eta: '2 min',
        capacity: '1 seat',
        badge: 'Fastest',
    },
    {
        id: 'auto',
        name: 'Dropp Auto',
        sub: 'Affordable 3-wheeler ride',
        icon: 'car-outline',
        price: 9.00,
        eta: '3 min',
        capacity: '3 seats',
    },
    {
        id: 'standard',
        name: 'Dropp Go (Taxi)',
        sub: 'Compact AC Hatchback',
        icon: 'car-sport-outline',
        price: 14.50,
        eta: '4 min',
        capacity: '4 seats',
        badge: 'Popular',
    },
    {
        id: 'comfort',
        name: 'Dropp Comfort',
        sub: 'Top-rated drivers & Sedans',
        icon: 'car-sport',
        price: 18.50,
        eta: '3 min',
        capacity: '4 seats',
    },
    {
        id: 'xl',
        name: 'Dropp XL (SUV)',
        sub: 'Spacious 6-seater SUV',
        icon: 'bus-outline',
        price: 28.00,
        eta: '5 min',
        capacity: '6 seats',
    },
];

export default function VehicleSelectionModal({
    visible,
    pickup,
    drop,
    onClose,
    onConfirmBook,
}) {
    const { theme } = useTheme();
    const { selectVehicle, setRideStatus } = useRideStore();
    const [selectedId, setSelectedId] = useState('standard');

    const selectedVehicleObj = VEHICLES.find((v) => v.id === selectedId) || VEHICLES[2];

    const handleConfirm = () => {
        selectVehicle(selectedId, selectedVehicleObj.price);
        setRideStatus('SEARCHING');
        if (onConfirmBook) {
            onConfirmBook(selectedVehicleObj);
        }
    };

    if (!visible) return null;

    return (
        <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
                    <View style={styles.dragHandle} />

                    {/* Route Header Pill */}
                    <View style={[styles.routeBox, { backgroundColor: theme.inputBg }]}>
                        <View style={styles.routeRow}>
                            <Ionicons name="ellipse" size={8} color={theme.primaryGreen} />
                            <Text style={[styles.routeText, { color: theme.textPrimary }]} numberOfLines={1}>
                                {pickup || 'Pickup location'}
                            </Text>
                        </View>
                        <View style={[styles.line, { backgroundColor: theme.inputSeparator }]} />
                        <View style={styles.routeRow}>
                            <Ionicons name="location" size={10} color="#EF4444" />
                            <Text style={[styles.routeText, { color: theme.textPrimary }]} numberOfLines={1}>
                                {drop || 'Destination'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Choose a Ride Tier</Text>

                    {/* Vehicle List */}
                    <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                        {VEHICLES.map((vehicle) => {
                            const isSelected = selectedId === vehicle.id;
                            return (
                                <TouchableOpacity
                                    key={vehicle.id}
                                    style={[
                                        styles.vehicleCard,
                                        {
                                            backgroundColor: isSelected ? theme.tierCardActiveBg : theme.inputBg,
                                            borderColor: isSelected ? theme.primaryGreen : 'transparent',
                                        },
                                    ]}
                                    onPress={() => setSelectedId(vehicle.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: isSelected ? theme.primaryGreen : theme.surface }]}>
                                        <Ionicons
                                            name={vehicle.icon}
                                            size={22}
                                            color={isSelected ? '#000' : theme.textPrimary}
                                        />
                                    </View>

                                    <View style={styles.vehicleMeta}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={[styles.vehicleName, { color: theme.textPrimary }]}>{vehicle.name}</Text>
                                            {vehicle.badge && (
                                                <View style={[styles.badgePill, { backgroundColor: theme.primaryGreen }]}>
                                                    <Text style={styles.badgeText}>{vehicle.badge}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.vehicleSub, { color: theme.textSecondary }]}>
                                            {vehicle.eta} away • {vehicle.capacity}
                                        </Text>
                                    </View>

                                    <Text style={[styles.priceText, { color: theme.primaryGreen }]}>
                                        ${vehicle.price.toFixed(2)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Confirm Booking CTA */}
                    <View style={styles.footerRow}>
                        <View>
                            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Price</Text>
                            <Text style={[styles.totalAmount, { color: theme.primaryGreen }]}>
                                ${selectedVehicleObj.price.toFixed(2)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.bookBtn, { backgroundColor: theme.primaryGreen }]}
                            onPress={handleConfirm}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.bookBtnText}>Book {selectedVehicleObj.name.split(' ')[1] || 'Ride'}</Text>
                            <Ionicons name="arrow-forward" size={18} color="#000" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        paddingBottom: 34,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#475569',
        alignSelf: 'center',
        marginBottom: 14,
    },
    routeBox: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        gap: 6,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    line: { width: 2, height: 10, marginLeft: 3 },
    routeText: { fontSize: 13, fontWeight: '600', flex: 1 },
    modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    vehicleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    vehicleMeta: { flex: 1 },
    vehicleName: { fontSize: 15, fontWeight: '800' },
    badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
    vehicleSub: { fontSize: 12, marginTop: 2 },
    priceText: { fontSize: 17, fontWeight: '900' },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
    },
    totalLabel: { fontSize: 11, fontWeight: '600' },
    totalAmount: { fontSize: 24, fontWeight: '900' },
    bookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        height: 50,
        borderRadius: 16,
        gap: 8,
    },
    bookBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
});
