import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';

export default function FoodCartDrawer({
    visible,
    cartItems = [],
    restaurantName = 'Burger Haven',
    onClose,
    onUpdateQuantity,
    onPlaceOrder,
}) {
    const { theme } = useTheme();
    const [promoApplied, setPromoApplied] = useState(true);

    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const deliveryFee = 2.50;
    const taxes = 1.80;
    const discount = promoApplied ? 5.00 : 0;
    const totalPayable = Math.max(0, subtotal + deliveryFee + taxes - discount);

    if (cartItems.length === 0) return null;

    return (
        <>
            {/* Floating Mini Cart Pill Bar */}
            {!visible && (
                <View style={styles.floatingBarWrapper}>
                    <TouchableOpacity
                        style={[styles.floatingBar, { backgroundColor: theme.primaryGreen }]}
                        onPress={onClose} // Opens full drawer modal
                        activeOpacity={0.9}
                    >
                        <View style={styles.floatingLeft}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>
                                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.floatingTitle}>{restaurantName}</Text>
                                <Text style={styles.floatingPrice}>${totalPayable.toFixed(2)}</Text>
                            </View>
                        </View>

                        <View style={styles.floatingRight}>
                            <Text style={styles.viewCartText}>View Cart</Text>
                            <Ionicons name="arrow-forward" size={18} color="#000" />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Full Checkout Sheet Modal */}
            <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                    <TouchableOpacity activeOpacity={1} style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
                        <View style={styles.dragHandle} />

                        {/* Modal Header */}
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{restaurantName}</Text>
                                <Text style={[styles.sheetSub, { color: theme.textSecondary }]}>Delivery to Green Park Main</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                            {/* Items List */}
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Order Items</Text>
                            <View style={styles.itemsList}>
                                {cartItems.map((item) => (
                                    <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.inputSeparator }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                            <View style={[styles.vegBadge, { borderColor: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                                                <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' }]} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.name}</Text>
                                                <Text style={[styles.itemPrice, { color: theme.primaryGreen }]}>
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Stepper Buttons */}
                                        <View style={[styles.stepper, { backgroundColor: theme.inputBg }]}>
                                            <TouchableOpacity
                                                onPress={() => onUpdateQuantity(item.id, -1)}
                                                style={styles.stepBtn}
                                            >
                                                <Ionicons name="remove" size={16} color={theme.textPrimary} />
                                            </TouchableOpacity>
                                            <Text style={[styles.stepCount, { color: theme.textPrimary }]}>{item.quantity}</Text>
                                            <TouchableOpacity
                                                onPress={() => onUpdateQuantity(item.id, 1)}
                                                style={styles.stepBtn}
                                            >
                                                <Ionicons name="add" size={16} color={theme.primaryGreen} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Promo Code Card */}
                            <View style={[styles.promoCard, { backgroundColor: theme.tierCardActiveBg, borderColor: theme.primaryGreen }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="sparkles" size={18} color={theme.primaryGreen} />
                                    <View>
                                        <Text style={[styles.promoTitle, { color: theme.primaryGreen }]}>DROPP50 Applied</Text>
                                        <Text style={[styles.promoSub, { color: theme.textSecondary }]}>You saved $5.00 on this order!</Text>
                                    </View>
                                </View>
                                <Ionicons name="checkmark-circle" size={20} color={theme.primaryGreen} />
                            </View>

                            {/* Bill Details */}
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>Bill Summary</Text>
                            <View style={[styles.billCard, { backgroundColor: theme.inputBg }]}>
                                <View style={styles.billRow}>
                                    <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Item Subtotal</Text>
                                    <Text style={[styles.billVal, { color: theme.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                                </View>
                                <View style={styles.billRow}>
                                    <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Delivery Fee</Text>
                                    <Text style={[styles.billVal, { color: theme.textPrimary }]}>${deliveryFee.toFixed(2)}</Text>
                                </View>
                                <View style={styles.billRow}>
                                    <Text style={[styles.billLabel, { color: theme.textSecondary }]}>Taxes & Fees</Text>
                                    <Text style={[styles.billVal, { color: theme.textPrimary }]}>${taxes.toFixed(2)}</Text>
                                </View>
                                {promoApplied && (
                                    <View style={styles.billRow}>
                                        <Text style={[styles.billLabel, { color: theme.primaryGreen }]}>Promo Discount</Text>
                                        <Text style={[styles.billVal, { color: theme.primaryGreen }]}>-${discount.toFixed(2)}</Text>
                                    </View>
                                )}
                                <View style={[styles.divider, { backgroundColor: theme.inputSeparator }]} />
                                <View style={styles.billRow}>
                                    <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>Grand Total</Text>
                                    <Text style={[styles.totalVal, { color: theme.primaryGreen }]}>${totalPayable.toFixed(2)}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Place Order CTA */}
                        <TouchableOpacity
                            style={[styles.placeOrderBtn, { backgroundColor: theme.primaryGreen }]}
                            onPress={onPlaceOrder}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.placeOrderText}>Place Food Order • ${totalPayable.toFixed(2)}</Text>
                            <Ionicons name="arrow-forward" size={18} color="#000" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    floatingBarWrapper: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        zIndex: 99,
    },
    floatingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        elevation: 8,
        shadowColor: '#22C55E',
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    floatingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
    floatingTitle: { color: '#000', fontWeight: '800', fontSize: 14 },
    floatingPrice: { color: '#000', fontWeight: '700', fontSize: 12 },
    floatingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    viewCartText: { color: '#000', fontWeight: '900', fontSize: 14 },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
        marginBottom: 12,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sheetTitle: { fontSize: 20, fontWeight: '900' },
    sheetSub: { fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
    itemsList: { gap: 10, marginBottom: 14 },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    vegBadge: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
    },
    vegDot: { width: 6, height: 6, borderRadius: 3 },
    itemName: { fontSize: 14, fontWeight: '700' },
    itemPrice: { fontSize: 13, fontWeight: '800', marginTop: 2 },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 8,
        height: 34,
        gap: 10,
    },
    stepBtn: { padding: 4 },
    stepCount: { fontWeight: '800', fontSize: 14 },
    promoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 14,
    },
    promoTitle: { fontWeight: '800', fontSize: 13 },
    promoSub: { fontSize: 11, marginTop: 2 },
    billCard: { borderRadius: 16, padding: 14, gap: 8 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billLabel: { fontSize: 12, fontWeight: '500' },
    billVal: { fontSize: 13, fontWeight: '700' },
    divider: { height: 1, marginVertical: 4 },
    totalLabel: { fontSize: 15, fontWeight: '900' },
    totalVal: { fontSize: 18, fontWeight: '900' },
    placeOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 16,
        marginTop: 16,
        gap: 8,
    },
    placeOrderText: { color: '#000', fontWeight: '900', fontSize: 16 },
});
