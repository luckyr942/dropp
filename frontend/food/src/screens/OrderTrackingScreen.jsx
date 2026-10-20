import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    Linking,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ORDER_STEPS = [
    { id: 1, title: 'Order Confirmed', time: '6:02 PM', completed: true },
    { id: 2, title: 'Kitchen Preparing', time: '6:05 PM', active: true },
    { id: 3, title: 'Out for Delivery', time: 'Expected 6:18 PM' },
    { id: 4, title: 'Delivered', time: 'Expected 6:25 PM' },
];

export default function OrderTrackingScreen({
    order = {
        id: '#DRP-84920',
        restaurantName: 'The Daily Grind',
        etaMinutes: 18,
        etaTime: '6:25 PM',
        items: [
            { id: '1', name: 'Signature Vanilla Cold Brew', quantity: 2, price: 210 },
            { id: '3', name: 'Butter Croissant', quantity: 1, price: 130 },
        ],
        totalAmount: 514,
        deliveryAddress: 'Flat 402, Tower B, Sector 28, Gurugram',
    },
    onBack,
}) {
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
    const [currentStepIndex, setCurrentStepIndex] = useState(1); // 0: Confirmed, 1: Preparing, 2: Out, 3: Delivered

    // Driver simulation
    const driver = {
        name: 'Amit Kumar',
        rating: '4.9',
        trips: '1,420 trips',
        vehicle: 'Honda Activa • HR 26 AB 1234',
        phone: '+91 98765 43210',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    };

    const handleCallDriver = () => {
        Linking.openURL(`tel:${driver.phone}`).catch(() => {
            alert(`Calling ${driver.name} at ${driver.phone}`);
        });
    };

    const handleChatDriver = () => {
        alert(`Opening chat with ${driver.name}...`);
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#EEF9F1" />
            {/* 1. Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.etaPill}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.etaPillText}>Arriving in {order.etaMinutes} mins</Text>
                </View>

                <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => alert('Support: 24/7 Helpline available')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="help-circle-outline" size={22} color="#00A859" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* 2. Stylized Map View Simulation */}
                <View style={styles.mapContainer}>
                    {/* Stylized streets background */}
                    <View style={styles.mapRoad1} />
                    <View style={styles.mapRoad2} />
                    <View style={styles.mapRoadDiagonal} />

                    {/* Restaurant Origin Pin */}
                    <View style={styles.restaurantPin}>
                        <Ionicons name="restaurant" size={16} color="#FFFFFF" />
                    </View>

                    {/* Route Dashed Line */}
                    <View style={styles.routePath} />

                    {/* Moving Courier Scooter */}
                    <View style={styles.scooterMarker}>
                        <Ionicons name="bicycle" size={18} color="#FFFFFF" />
                    </View>

                    {/* Destination Home Pin */}
                    <View style={styles.homePin}>
                        <Ionicons name="home" size={16} color="#FFFFFF" />
                    </View>

                    {/* Live Tracking Floating Badge */}
                    <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>⚡ Live GPS Tracking</Text>
                    </View>
                </View>

                {/* 3. Order Status Timeline Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>Order Status Timeline</Text>

                    <View style={styles.timelineRow}>
                        {ORDER_STEPS.map((step, idx) => {
                            const isDone = idx <= currentStepIndex;
                            const isActive = idx === currentStepIndex;

                            return (
                                <View key={step.id} style={styles.timelineStep}>
                                    <View style={styles.stepIndicatorRow}>
                                        <View
                                            style={[
                                                styles.stepCircle,
                                                isDone && styles.stepCircleDone,
                                                isActive && styles.stepCircleActive,
                                            ]}
                                        >
                                            {isDone && !isActive ? (
                                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                            ) : isActive ? (
                                                <View style={styles.activeDot} />
                                            ) : (
                                                <View style={styles.idleDot} />
                                            )}
                                        </View>
                                        {idx < ORDER_STEPS.length - 1 && (
                                            <View
                                                style={[
                                                    styles.stepLine,
                                                    idx < currentStepIndex && styles.stepLineDone,
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            styles.stepTitle,
                                            isDone && styles.stepTitleDone,
                                            isActive && styles.stepTitleActive,
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {step.title}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* 4. Delivery Partner Card */}
                <View style={styles.card}>
                    <Text style={styles.cardHeaderTitle}>Delivery Partner</Text>

                    <View style={styles.driverRow}>
                        <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />

                        <View style={styles.driverInfo}>
                            <View style={styles.driverNameRow}>
                                <Text style={styles.driverName}>{driver.name}</Text>
                                <View style={styles.ratingBadge}>
                                    <Ionicons name="star" size={11} color="#F59E0B" />
                                    <Text style={styles.ratingText}>{driver.rating}</Text>
                                </View>
                            </View>
                            <Text style={styles.driverVehicle}>{driver.vehicle}</Text>
                        </View>

                        <View style={styles.driverActions}>
                            <TouchableOpacity
                                style={styles.actionCircleBtn}
                                onPress={handleCallDriver}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={16} color="#00A859" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionCircleBtn}
                                onPress={handleChatDriver}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="chatbubble-ellipses" size={16} color="#00A859" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* 5. Order Summary Accordion */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.summaryHeader}
                        onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        activeOpacity={0.8}
                    >
                        <View>
                            <Text style={styles.cardHeaderTitle}>Order Summary</Text>
                            <Text style={styles.orderIdText}>{order.id} • {order.restaurantName}</Text>
                        </View>
                        <Ionicons
                            name={isSummaryExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color="#0F172A"
                        />
                    </TouchableOpacity>

                    {isSummaryExpanded && (
                        <View style={styles.summaryBody}>
                            {order.items.map((item) => (
                                <View key={item.id} style={styles.summaryItemRow}>
                                    <Text style={styles.summaryItemName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.summaryItemQty}>x{item.quantity}</Text>
                                    <Text style={styles.summaryItemPrice}>
                                        ₹{item.price * item.quantity}
                                    </Text>
                                </View>
                            ))}

                            <View style={styles.divider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Paid</Text>
                                <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
                            </View>

                            <View style={styles.addressBox}>
                                <Ionicons name="location-outline" size={16} color="#00A859" />
                                <Text style={styles.addressText} numberOfLines={2}>
                                    {order.deliveryAddress}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEF9F1',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    etaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00A859',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        gap: 7,
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    etaPillText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12.5,
        color: '#FFFFFF',
    },
    helpBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        padding: 16,
        gap: 14,
        paddingBottom: 40,
    },

    // Stylized Map Simulation
    mapContainer: {
        height: 190,
        backgroundColor: '#E6F4EA',
        borderRadius: 22,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#C6E7D1',
    },
    mapRoad1: {
        position: 'absolute',
        top: 30,
        left: 0,
        right: 0,
        height: 14,
        backgroundColor: '#FFFFFF',
        opacity: 0.8,
    },
    mapRoad2: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        height: 14,
        backgroundColor: '#FFFFFF',
        opacity: 0.8,
    },
    mapRoadDiagonal: {
        position: 'absolute',
        top: 10,
        left: 20,
        width: 250,
        height: 12,
        backgroundColor: '#FFFFFF',
        transform: [{ rotate: '32deg' }],
        opacity: 0.8,
    },
    restaurantPin: {
        position: 'absolute',
        top: 60,
        left: 36,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    routePath: {
        position: 'absolute',
        top: 76,
        left: 60,
        width: 170,
        height: 3,
        borderWidth: 1.5,
        borderColor: '#00A859',
        borderStyle: 'dashed',
        transform: [{ rotate: '-18deg' }],
    },
    scooterMarker: {
        position: 'absolute',
        top: 65,
        left: 140,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#00A859',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00A859',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 4,
    },
    homePin: {
        position: 'absolute',
        top: 30,
        right: 40,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    liveBadge: {
        position: 'absolute',
        bottom: 10,
        left: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    liveBadgeText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        color: '#00A859',
    },

    // Card generic
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E8EEE9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeaderTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#0F172A',
    },

    // Timeline
    timelineRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    timelineStep: {
        flex: 1,
        alignItems: 'center',
    },
    stepIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'center',
    },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        zIndex: 2,
    },
    stepCircleDone: {
        backgroundColor: '#00A859',
        borderColor: '#00A859',
    },
    stepCircleActive: {
        backgroundColor: '#EEF9F1',
        borderColor: '#00A859',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00A859',
    },
    idleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#CBD5E1',
    },
    stepLine: {
        position: 'absolute',
        left: '50%',
        right: '-50%',
        height: 2,
        backgroundColor: '#E2E8F0',
        top: 10,
        zIndex: 1,
    },
    stepLineDone: {
        backgroundColor: '#00A859',
    },
    stepTitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 9.5,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 6,
    },
    stepTitleDone: {
        color: '#0F172A',
    },
    stepTitleActive: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#00A859',
    },

    // Driver Card
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    driverAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E2E8F0',
    },
    driverInfo: {
        flex: 1,
        gap: 3,
    },
    driverNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    driverName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#0F172A',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
    },
    ratingText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        color: '#B45309',
    },
    driverVehicle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
    driverActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionCircleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#EEF9F1',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },

    // Order Summary
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderIdText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    summaryBody: {
        marginTop: 8,
        gap: 8,
    },
    summaryItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryItemName: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12.5,
        color: '#0F172A',
    },
    summaryItemQty: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
        paddingHorizontal: 12,
    },
    summaryItemPrice: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12.5,
        color: '#0F172A',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    totalValue: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#00A859',
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        padding: 10,
        borderRadius: 12,
        marginTop: 4,
    },
    addressText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
});
