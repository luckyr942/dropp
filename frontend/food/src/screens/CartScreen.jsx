import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

    const items = Object.values(cart);
    const itemTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = itemTotal > 299 ? 0 : 35;
    const taxesAndPlatform = 24;
    const toPay = Math.max(0, itemTotal + deliveryFee + taxesAndPlatform - appliedDiscount);

    const handleApplyCoupon = () => {
        if (couponInput.trim().toUpperCase() === 'DROPP50') {
            setAppliedDiscount(50);
            setAppliedCode('DROPP50');
            setCouponInput('');
            Alert.alert('🎉 Coupon Applied', 'You saved ₹50 with DROPP50!');
        } else {
            Alert.alert('Invalid Code', 'Try using code DROPP50 for ₹50 off.');
        }
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Cart</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* 1. Delivery Address Card */}
                <View style={styles.card}>
                    <View style={styles.addressRow}>
                        <View style={styles.pinCircle}>
                            <Ionicons name="location" size={16} color="#00A859" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addressTitle}>Delivering to Home</Text>
                            <Text style={styles.addressSub}>Sector 28, Gurugram • 15–25 mins</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.changeLink}>Change</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. Order Items */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>Items Ordered</Text>
                    {items.length === 0 ? (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', color: '#94A3B8' }}>
                                Your cart is empty
                            </Text>
                        </View>
                    ) : (
                        items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                                </View>

                                <View style={styles.stepper}>
                                    <TouchableOpacity onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, -1)}>
                                        <Ionicons name="remove" size={14} color="#00A859" />
                                    </TouchableOpacity>
                                    <Text style={styles.stepperQty}>{item.quantity}</Text>
                                    <TouchableOpacity onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, 1)}>
                                        <Ionicons name="add" size={14} color="#00A859" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* 3. Promo Code Input */}
                <View style={styles.card}>
                    <View style={styles.couponInputRow}>
                        <Ionicons name="pricetag-outline" size={18} color="#00A859" />
                        <TextInput
                            style={styles.couponInput}
                            placeholder="Enter promo code (e.g. DROPP50)"
                            placeholderTextColor="#94A3B8"
                            value={couponInput}
                            onChangeText={setCouponInput}
                            autoCapitalize="characters"
                        />
                        <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
                            <Text style={styles.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                    {appliedCode && (
                        <View style={styles.appliedBanner}>
                            <Text style={styles.appliedText}>✅ Code '{appliedCode}' applied (₹{appliedDiscount} OFF)</Text>
                        </View>
                    )}
                </View>

                {/* 4. Bill Details */}
                <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>Bill Summary</Text>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billVal}>₹{itemTotal}</Text>
                    </View>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Delivery Fee</Text>
                        <Text style={styles.billVal}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</Text>
                    </View>

                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Taxes & Platform Charges</Text>
                        <Text style={styles.billVal}>₹{taxesAndPlatform}</Text>
                    </View>

                    {appliedDiscount > 0 && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: '#00A859' }]}>Discounts</Text>
                            <Text style={[styles.billVal, { color: '#00A859' }]}>- ₹{appliedDiscount}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>To Pay</Text>
                        <Text style={styles.totalVal}>₹{toPay}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Checkout CTA */}
            {items.length > 0 && (
                <View style={styles.bottomBar}>
                    <View>
                        <Text style={styles.bottomTotalLabel}>Total Amount</Text>
                        <Text style={styles.bottomTotalVal}>₹{toPay}</Text>
                    </View>
                    <TouchableOpacity style={styles.payBtn} onPress={onPlaceOrder} activeOpacity={0.88}>
                        <Text style={styles.payBtnText}>Place Order →</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF9F1' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#0F172A' },
    scroll: { padding: 16, gap: 12, paddingBottom: 90 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 10, borderWidth: 1, borderColor: '#E8EEE9' },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pinCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF9F1', alignItems: 'center', justifyContent: 'center' },
    addressTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#0F172A' },
    addressSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#64748B' },
    changeLink: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#00A859' },
    cardSectionTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#0F172A' },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    itemName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: '#0F172A' },
    itemPrice: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#64748B' },
    stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#00A859', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 8 },
    stepperQty: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#00A859' },
    couponInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 12, height: 44, gap: 8 },
    couponInput: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#0F172A' },
    applyBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#00A859', borderRadius: 10 },
    applyBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#FFFFFF' },
    appliedBanner: { backgroundColor: '#ECFDF5', padding: 8, borderRadius: 10 },
    appliedText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: '#047857' },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#64748B' },
    billVal: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: '#0F172A' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#0F172A' },
    totalVal: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#00A859' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    bottomTotalLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#64748B' },
    bottomTotalVal: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: '#0F172A' },
    payBtn: { backgroundColor: '#00A859', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    payBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#FFFFFF' },
});
