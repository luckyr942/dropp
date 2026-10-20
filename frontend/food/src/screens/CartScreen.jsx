import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Alert,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function CartScreen({
    cart = {
        '1': { id: '1', name: 'Signature Vanilla Cold Brew', price: 210, quantity: 2 },
        '3': { id: '3', name: 'Butter Croissant', price: 130, quantity: 1 },
    },
    onBack,
    onPlaceOrder,
    onUpdateQuantity,
}) {
    const [couponInput, setCouponInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(50);
    const [appliedCode, setAppliedCode] = useState('DROPP50');
    const [selectedPayment, setSelectedPayment] = useState('UPI');
    const [cookingInstructions, setCookingInstructions] = useState('');

    const items = Object.values(cart);
    const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = itemTotal > 299 ? 0 : 35;
    const taxesAndPlatform = 24;
    const toPay = Math.max(0, itemTotal + deliveryFee + taxesAndPlatform - appliedDiscount);

    const handleApplyCoupon = (codeToApply) => {
        const code = (codeToApply || couponInput).trim().toUpperCase();
        if (code === 'DROPP50' || code === 'FIRSTFREE' || code === 'DROPP20') {
            const disc = code === 'DROPP20' ? 60 : 50;
            setAppliedDiscount(disc);
            setAppliedCode(code);
            setCouponInput('');
            Alert.alert('🎉 Coupon Applied!', `You saved ₹${disc} with ${code}`);
        } else {
            Alert.alert('Invalid Code', 'Try using code DROPP50 for ₹50 off.');
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedDiscount(0);
        setAppliedCode('');
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F3FAF6" />
            {/* ══════════════════════════════════════════════════════════════
                1. TOP HEADER WITH STEP INDICATOR
            ══════════════════════════════════════════════════════════════ */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Review Order</Text>
                    <Text style={styles.headerSubtitle}>
                        {items.length} {items.length === 1 ? 'item' : 'items'} in basket
                    </Text>
                </View>

                <TouchableOpacity style={styles.clearBtn} onPress={onBack}>
                    <Ionicons name="close-circle-outline" size={22} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {/* ══════════════════════════════════════════════════════════════
                    2. DELIVERY ADDRESS & ETA CARD (AESTHETIC FLOATING TILE)
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.heroDeliveryCard}>
                    <LinearGradient
                        colors={['#071F15', '#0B3624']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />

                    <View style={styles.deliveryCardHeader}>
                        <View style={styles.deliveryIconCircle}>
                            <Ionicons name="bicycle" size={16} color="#42F5A1" />
                        </View>
                        <View style={styles.deliveryTextCol}>
                            <View style={styles.deliveryBadgeRow}>
                                <Text style={styles.deliveryBadgeTitle}>DELIVERING IN 20-30 MINS</Text>
                                <View style={styles.livePulseDot} />
                            </View>
                            <Text style={styles.deliveryAddressText} numberOfLines={1}>
                                Home • Sector 28, Golf Course Rd, Gurugram
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.changeAddressPill}>
                            <Text style={styles.changeAddressText}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    3. BASKET ITEMS LIST WITH TOUCH CONTROLS
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.cardTitleGroup}>
                            <Ionicons name="receipt-outline" size={18} color="#008744" />
                            <Text style={styles.cardSectionTitle}>Order Items</Text>
                        </View>
                        <Text style={styles.cardItemCountText}>{items.length} items</Text>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.emptyCartBox}>
                            <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
                            <Text style={styles.emptyCartSub}>Add some delicious dishes to get started!</Text>
                            <TouchableOpacity style={styles.browseMenuBtn} onPress={onBack}>
                                <Text style={styles.browseMenuBtnText}>Explore Menu →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        items.map((item, idx) => (
                            <View key={item.id}>
                                <View style={styles.itemRow}>
                                    {/* Veg dot */}
                                    <View style={styles.vegBox}>
                                        <View style={styles.vegDot} />
                                    </View>

                                    {/* Item name and calculated item price */}
                                    <View style={styles.itemDetailCol}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemPrice}>
                                            ₹{item.price * item.quantity}{' '}
                                            {item.quantity > 1 && (
                                                <Text style={styles.itemUnitPrice}>
                                                    (₹{item.price} each)
                                                </Text>
                                            )}
                                        </Text>
                                    </View>

                                    {/* Sleek Stepper */}
                                    <View style={styles.stepper}>
                                        <TouchableOpacity
                                            onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, -1)}
                                            style={styles.stepperAction}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="remove" size={14} color="#008744" />
                                        </TouchableOpacity>

                                        <Text style={styles.stepperQty}>{item.quantity}</Text>

                                        <TouchableOpacity
                                            onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, 1)}
                                            style={styles.stepperAction}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="add" size={14} color="#008744" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {idx < items.length - 1 && <View style={styles.itemDivider} />}
                            </View>
                        ))
                    )}
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    4. COOKING INSTRUCTIONS NOTE
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.card}>
                    <View style={styles.instructionsHeader}>
                        <Ionicons name="chatbox-ellipses-outline" size={17} color="#64748B" />
                        <Text style={styles.instructionsLabel}>Add Cooking Instructions / Note</Text>
                    </View>
                    <TextInput
                        style={styles.instructionsInput}
                        placeholder="e.g. Leave at door, extra napkins, less spicy..."
                        placeholderTextColor="#94A3B8"
                        value={cookingInstructions}
                        onChangeText={setCookingInstructions}
                    />
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    5. OFFERS & PROMO CODE CAPSULE
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.card}>
                    <View style={styles.cardTitleGroup}>
                        <Ionicons name="pricetag" size={18} color="#008744" />
                        <Text style={styles.cardSectionTitle}>Offers & Discounts</Text>
                    </View>

                    {appliedCode ? (
                        <View style={styles.appliedBanner}>
                            <View style={styles.appliedLeft}>
                                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                                <View>
                                    <Text style={styles.appliedCodeTitle}>'{appliedCode}' Applied</Text>
                                    <Text style={styles.appliedSavingsSub}>You saved ₹{appliedDiscount} on this order</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                                <Text style={styles.removeCouponText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.couponInputRow}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Enter coupon (e.g. DROPP50)"
                                placeholderTextColor="#94A3B8"
                                value={couponInput}
                                onChangeText={setCouponInput}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity
                                style={styles.applyBtn}
                                onPress={() => handleApplyCoupon()}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.applyBtnText}>APPLY</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    6. BILL BREAKDOWN
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>Bill Summary</Text>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billVal}>₹{itemTotal}</Text>
                    </View>

                    <View style={styles.billRow}>
                        <View style={styles.billLabelWithInfo}>
                            <Text style={styles.billLabel}>Delivery Partner Fee</Text>
                            {deliveryFee === 0 && (
                                <View style={styles.freeBadge}>
                                    <Text style={styles.freeBadgeText}>FREE OVER ₹299</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.billVal, deliveryFee === 0 && { color: '#008744' }]}>
                            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                        </Text>
                    </View>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Platform & Taxes (GST)</Text>
                        <Text style={styles.billVal}>₹{taxesAndPlatform}</Text>
                    </View>

                    {appliedDiscount > 0 && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: '#008744', fontFamily: 'PlusJakartaSans_700Bold' }]}>
                                Coupon Savings
                            </Text>
                            <Text style={[styles.billVal, { color: '#008744', fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
                                - ₹{appliedDiscount}
                            </Text>
                        </View>
                    )}

                    <View style={styles.billDivider} />

                    <View style={styles.grandTotalRow}>
                        <View>
                            <Text style={styles.grandTotalLabel}>To Pay</Text>
                            <Text style={styles.taxesIncludedSub}>Includes all taxes & fees</Text>
                        </View>
                        <Text style={styles.grandTotalVal}>₹{toPay}</Text>
                    </View>
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    7. PAYMENT METHOD SELECTOR
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>Payment Method</Text>

                    <View style={styles.paymentMethodsRow}>
                        {[
                            { id: 'UPI', label: 'UPI / GPay', icon: 'flash' },
                            { id: 'Cards', label: 'Card', icon: 'card' },
                            { id: 'Cash', label: 'Cash on Del.', icon: 'cash' },
                        ].map((m) => {
                            const isSelected = selectedPayment === m.id;
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.paymentPill, isSelected && styles.paymentPillActive]}
                                    onPress={() => setSelectedPayment(m.id)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name={m.icon}
                                        size={14}
                                        color={isSelected ? '#FFFFFF' : '#64748B'}
                                    />
                                    <Text
                                        style={[
                                            styles.paymentPillText,
                                            isSelected && styles.paymentPillTextActive,
                                        ]}
                                    >
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* ══════════════════════════════════════════════════════════════
                8. BOTTOM CHECKOUT ACTION BAR
            ══════════════════════════════════════════════════════════════ */}
            {items.length > 0 && (
                <View style={styles.bottomCheckoutBar}>
                    <View style={styles.bottomTotalCol}>
                        <Text style={styles.bottomPayLabel}>TOTAL TO PAY</Text>
                        <Text style={styles.bottomPayAmount}>₹{toPay}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.placeOrderBtn}
                        onPress={onPlaceOrder}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.placeOrderBtnText}>Place Order</Text>
                        <View style={styles.placeOrderArrowCircle}>
                            <Ionicons name="arrow-forward" size={16} color="#008744" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3FAF6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9F1ED',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
        color: '#0F172A',
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    clearBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        padding: 16,
        gap: 12,
        paddingBottom: 110,
    },

    // 2. Delivery Hero Card
    heroDeliveryCard: {
        borderRadius: 20,
        padding: 14,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    deliveryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deliveryIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(66, 245, 161, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deliveryTextCol: {
        flex: 1,
        gap: 2,
    },
    deliveryBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deliveryBadgeTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 10,
        color: '#42F5A1',
        letterSpacing: 0.6,
    },
    livePulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#42F5A1',
    },
    deliveryAddressText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    changeAddressPill: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    changeAddressText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        color: '#FFFFFF',
    },

    // Card Base
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E8F1EC',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardSectionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#0F172A',
    },
    cardItemCountText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#64748B',
    },

    // Empty Cart
    emptyCartBox: {
        alignItems: 'center',
        paddingVertical: 28,
        gap: 8,
    },
    emptyCartTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
        color: '#0F172A',
        marginTop: 6,
    },
    emptyCartSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
    },
    browseMenuBtn: {
        backgroundColor: '#008744',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
        marginTop: 8,
    },
    browseMenuBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#FFFFFF',
    },

    // Items
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    vegBox: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        borderColor: '#008744',
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vegDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#008744',
    },
    itemDetailCol: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#0F172A',
    },
    itemPrice: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    itemUnitPrice: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#94A3B8',
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 10,
    },
    stepperAction: {
        padding: 3,
    },
    stepperQty: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#008744',
    },

    // Cooking Instructions
    instructionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    instructionsLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#334155',
    },
    instructionsInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    // Offers & Coupon
    appliedBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        padding: 12,
        borderRadius: 14,
    },
    appliedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appliedCodeTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 12,
        color: '#065F46',
    },
    appliedSavingsSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 10,
        color: '#047857',
        marginTop: 1,
    },
    removeCouponBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    removeCouponText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        color: '#EF4444',
    },
    couponInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 46,
        gap: 8,
    },
    couponInput: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#0F172A',
    },
    applyBtn: {
        backgroundColor: '#008744',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
    },
    applyBtnText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 11,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    // Bill Details
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    billLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
    },
    billLabelWithInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    freeBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    freeBadgeText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 9,
        color: '#059669',
    },
    billVal: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#0F172A',
    },
    billDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    grandTotalLabel: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#0F172A',
    },
    taxesIncludedSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 1,
    },
    grandTotalVal: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 19,
        color: '#008744',
    },

    // Payment Selector
    paymentMethodsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    paymentPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    paymentPillActive: {
        backgroundColor: '#008744',
        borderColor: '#008744',
    },
    paymentPillText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 11,
        color: '#64748B',
    },
    paymentPillTextActive: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#FFFFFF',
    },

    // Bottom Checkout Bar
    bottomCheckoutBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#E8F1EC',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 8,
    },
    bottomTotalCol: {
        gap: 2,
    },
    bottomPayLabel: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 10,
        color: '#64748B',
        letterSpacing: 0.6,
    },
    bottomPayAmount: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        color: '#0F172A',
    },
    placeOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#008744',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 20,
        gap: 10,
        shadowColor: '#008744',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    placeOrderBtnText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#FFFFFF',
    },
    placeOrderArrowCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
