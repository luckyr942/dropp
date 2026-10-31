import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
    Modal,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createDraftOrder, confirmOrder } from '../api/foodApi';
import AddressSheet from '../components/AddressSheet';
import { loadDeliveryAddress, formatAddress } from '../utils/deliveryAddress';

const rupees = (n) => `₹${Math.round(Number(n) || 0)}`;

/**
 * Checkout flow:
 *  1. Customer reviews items + confirms a delivery address (saved on device).
 *  2. "Review bill" creates a draft order. The backend prices every item from
 *     the catalog and returns subtotal / deliveryFee / totalAmount.
 *  3. The bill sheet shows exactly that draft; "Place order" confirms it.
 * A draft is reused while the cart and address are unchanged.
 */
export default function CartScreen({
    cart = {},
    restaurant = null,
    onBack,
    onBrowse,
    onPlaceOrder,
    onUpdateQuantity,
}) {
    const [address, setAddress] = useState(null);
    const [addressLoaded, setAddressLoaded] = useState(false);
    const [showAddressSheet, setShowAddressSheet] = useState(false);

    const [draft, setDraft] = useState(null); // { key, order }
    const [quoting, setQuoting] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState(null);
    const [showBillSheet, setShowBillSheet] = useState(false);

    useEffect(() => {
        let alive = true;
        loadDeliveryAddress().then((a) => {
            if (!alive) return;
            setAddress(a);
            setAddressLoaded(true);
        });
        return () => { alive = false; };
    }, []);

    const items = Object.values(cart || {}).filter((i) => i && i.quantity > 0);
    const totalItemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const itemEstimate = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const restaurantId = items[0]?.restaurantId || restaurant?._id || restaurant?.id || null;
    const restaurantName = items[0]?.restaurantName || restaurant?.name || '';

    // Identity of the current cart+address; a draft is only valid for the same key
    const cartKey = useMemo(
        () => JSON.stringify({
            r: restaurantId,
            i: items.map((i) => [i.id, i.quantity]).sort(),
            a: address ? [address.street, address.city, address.pincode] : null,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cart, address, restaurantId]
    );
    const currentDraft = draft && draft.key === cartKey ? draft.order : null;

    const requestBill = async () => {
        if (quoting || placing) return;
        setError(null);
        if (items.length === 0) return;
        if (!address) {
            setShowAddressSheet(true);
            return;
        }
        if (currentDraft) {
            setShowBillSheet(true);
            return;
        }
        setQuoting(true);
        try {
            const order = await createDraftOrder({
                restaurantId,
                restaurantName,
                items,
                deliveryAddress: { street: address.street, city: address.city, pincode: address.pincode },
            });
            if (!order?._id) throw new Error('The server did not return an order.');
            setDraft({ key: cartKey, order });
            setShowBillSheet(true);
        } catch (err) {
            setError(err?.message || 'Could not prepare your bill. Please try again.');
        } finally {
            setQuoting(false);
        }
    };

    const placeOrder = async () => {
        if (!currentDraft || placing) return;
        setPlacing(true);
        setError(null);
        try {
            const confirmed = await confirmOrder(currentDraft._id);
            setShowBillSheet(false);
            onPlaceOrder?.({
                ...currentDraft,
                ...(confirmed || {}),
                restaurantName: currentDraft.restaurantName || restaurantName,
            });
        } catch (err) {
            // Stay on this screen; the draft is still valid unless the server says otherwise
            setError(err?.message || 'Could not place your order. Please try again.');
        } finally {
            setPlacing(false);
        }
    };

    const etaText = restaurant?.time || (restaurant?.deliveryTimeMins ? `${restaurant.deliveryTimeMins} min` : null);

    // ─── Empty cart ─────────────────────────────────────────────────────────
    if (items.length === 0) {
        return (
            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Header onBack={onBack} subtitle="Your basket" />
                <View style={styles.emptyWrap}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="bag-handle-outline" size={40} color="#008744" />
                    </View>
                    <Text style={styles.emptyTitle}>Your basket is empty</Text>
                    <Text style={styles.emptyText}>Add dishes from a restaurant to see them here.</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={onBrowse || onBack} activeOpacity={0.88}>
                        <Text style={styles.primaryBtnText}>Browse restaurants</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Header
                onBack={onBack}
                subtitle={`${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}${restaurantName ? ` from ${restaurantName}` : ''}`}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Address ── */}
                <View style={styles.card}>
                    <View style={styles.addressRow}>
                        <View style={styles.iconCircle}>
                            <Ionicons
                                name={address?.label === 'Work' ? 'briefcase' : address ? 'home' : 'location'}
                                size={19}
                                color="#008744"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.smallLabel}>Delivering to</Text>
                            {!addressLoaded ? (
                                <View style={[styles.skeletonLine, { width: '70%', marginTop: 6 }]} />
                            ) : address ? (
                                <>
                                    <Text style={styles.addressTitle} numberOfLines={2}>
                                        {address.label} • {address.street}
                                    </Text>
                                    <Text style={styles.addressSub} numberOfLines={1}>
                                        {[address.city, address.pincode].filter(Boolean).join(' ')}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.addressMissing}>Add a delivery address to continue</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.pillBtn}
                            onPress={() => setShowAddressSheet(true)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.pillBtnText}>{address ? 'Change' : 'Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    {etaText ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.inlineRow}>
                                <Ionicons name="time-outline" size={16} color="#64748B" />
                                <Text style={styles.mutedText}>
                                    Usually delivered in <Text style={styles.strongText}>{etaText}</Text>
                                </Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* ── Items ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.inlineRow}>
                            <Ionicons name="bag-handle-outline" size={19} color="#0F172A" />
                            <Text style={styles.cardTitle}>Order items</Text>
                        </View>
                        <TouchableOpacity style={styles.addItemsBtn} onPress={onBack} activeOpacity={0.7}>
                            <Ionicons name="add" size={16} color="#008744" />
                            <Text style={styles.addItemsText}>Add items</Text>
                        </TouchableOpacity>
                    </View>

                    {items.map((item, index) => {
                        const isVeg = item.isVeg !== false;
                        return (
                            <View key={item.id}>
                                <View style={styles.itemRow}>
                                    {item.image ? (
                                        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                                            <Ionicons name="fast-food-outline" size={22} color="#94A3B8" />
                                        </View>
                                    )}
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <View style={styles.inlineRow}>
                                            <View style={[styles.vegBox, { borderColor: isVeg ? '#00A859' : '#EF4444' }]}>
                                                <View style={[styles.vegDot, { backgroundColor: isVeg ? '#00A859' : '#EF4444' }]} />
                                            </View>
                                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                                        </View>
                                        <Text style={styles.itemPrice}>
                                            {rupees(item.price)} <Text style={styles.mutedSmall}>each</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.stepper}>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => onUpdateQuantity?.(item.id, -1)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={15} color="#008744" />
                                        </TouchableOpacity>
                                        <Text style={styles.stepperQty}>{item.quantity}</Text>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => onUpdateQuantity?.(item.id, 1)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="add" size={15} color="#008744" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {index < items.length - 1 && <View style={styles.divider} />}
                            </View>
                        );
                    })}
                </View>

                {/* ── Bill ── */}
                <View style={styles.card}>
                    <View style={[styles.inlineRow, { marginBottom: 6 }]}>
                        <Ionicons name="receipt-outline" size={19} color="#0F172A" />
                        <Text style={styles.cardTitle}>Bill summary</Text>
                    </View>
                    {currentDraft ? (
                        <BillLines order={currentDraft} />
                    ) : (
                        <>
                            <BillRow
                                label={`Item total (${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'})`}
                                value={rupees(itemEstimate)}
                            />
                            <BillRow label="Delivery fee" value="At checkout" muted />
                            <Text style={styles.billNote}>
                                Final prices and fees are confirmed by the restaurant's live menu when you review the bill.
                            </Text>
                        </>
                    )}
                </View>

                {/* ── Payment ── */}
                <View style={styles.card}>
                    <View style={styles.inlineRow}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                            <MaterialCommunityIcons name="cash" size={20} color="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Pay on delivery</Text>
                            <Text style={styles.mutedText}>Cash or UPI to your delivery partner</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={20} color="#008744" />
                    </View>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
            </ScrollView>

            {/* ── Sticky checkout bar ── */}
            <View style={styles.bottomBar}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.smallLabel}>{currentDraft ? 'Total to pay' : 'Item total'}</Text>
                    <Text style={styles.bottomAmount}>
                        {rupees(currentDraft ? currentDraft.totalAmount : itemEstimate)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.checkoutBtn, (quoting || placing) && { opacity: 0.75 }]}
                    onPress={requestBill}
                    disabled={quoting || placing}
                    activeOpacity={0.88}
                >
                    {quoting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.checkoutText}>{address ? 'Review bill' : 'Add address'}</Text>
                            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <AddressSheet
                visible={showAddressSheet}
                initialAddress={address}
                onClose={() => setShowAddressSheet(false)}
                onSaved={(saved) => {
                    setAddress(saved);
                    setShowAddressSheet(false);
                }}
            />

            {/* ── Server bill + confirm ── */}
            <Modal
                visible={showBillSheet && !!currentDraft}
                transparent
                animationType="slide"
                onRequestClose={() => !placing && setShowBillSheet(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => !placing && setShowBillSheet(false)}
                    />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.sheetTitle}>Confirm your order</Text>
                            <TouchableOpacity
                                onPress={() => setShowBillSheet(false)}
                                disabled={placing}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {currentDraft ? (
                            <>
                                <Text style={styles.mutedText} numberOfLines={2}>
                                    {currentDraft.restaurantName || restaurantName} → {formatAddress(currentDraft.deliveryAddress)}
                                </Text>
                                <View style={{ marginTop: 12 }}>
                                    {currentDraft.items.map((it) => (
                                        <BillRow
                                            key={`${it.menuItemId}-${it.name}`}
                                            label={`${it.quantity} × ${it.name}`}
                                            value={rupees(it.totalPrice)}
                                        />
                                    ))}
                                    <View style={styles.divider} />
                                    <BillLines order={currentDraft} />
                                </View>
                                <View style={[styles.inlineRow, { marginTop: 10 }]}>
                                    <MaterialCommunityIcons name="cash" size={18} color="#D97706" />
                                    <Text style={styles.mutedText}>Pay on delivery (cash or UPI)</Text>
                                </View>
                            </>
                        ) : null}
                        {error ? (
                            <View style={[styles.errorBox, { marginHorizontal: 0 }]}>
                                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}
                        <TouchableOpacity
                            style={[styles.confirmBtn, placing && { opacity: 0.75 }]}
                            onPress={placeOrder}
                            disabled={placing}
                            activeOpacity={0.88}
                        >
                            {placing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.confirmText}>
                                        Place order • {rupees(currentDraft?.totalAmount)}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function Header({ onBack, subtitle }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={styles.headerTitle}>Review order</Text>
                {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            <View style={{ width: 38 }} />
        </View>
    );
}

function BillRow({ label, value, muted, strong }) {
    return (
        <View style={styles.billRow}>
            <Text style={[styles.billLabel, strong && styles.billStrong]} numberOfLines={1}>{label}</Text>
            <Text style={[styles.billValue, muted && styles.billMuted, strong && styles.billStrong]}>{value}</Text>
        </View>
    );
}

function BillLines({ order }) {
    return (
        <>
            <BillRow label="Item total" value={rupees(order.subtotal)} />
            <BillRow label="Delivery fee" value={rupees(order.deliveryFee)} />
            <View style={styles.divider} />
            <BillRow label="Total amount" value={rupees(order.totalAmount)} strong />
        </>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAF9' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 17, color: '#0F172A' },
    headerSubtitle: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#64748B', marginTop: 2 },

    scrollContent: { paddingTop: 14, paddingBottom: 130 },
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EEF2EF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#0F172A' },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    smallLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: '#64748B' },
    mutedText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: '#64748B', flexShrink: 1 },
    mutedSmall: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#94A3B8' },
    strongText: { fontFamily: 'PlusJakartaSans_700Bold', color: '#0F172A' },

    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#0F172A', marginTop: 2 },
    addressSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#64748B', marginTop: 2 },
    addressMissing: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#B45309', marginTop: 2 },
    pillBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        backgroundColor: '#F0FDF4',
    },
    pillBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: '#008744' },

    addItemsBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    addItemsText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#008744' },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    itemImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F1F5F9' },
    itemImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
    vegBox: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vegDot: { width: 6, height: 6, borderRadius: 3 },
    itemName: { flex: 1, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#0F172A' },
    itemPrice: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#0F172A' },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ECFDF5',
        borderRadius: 18,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    stepperBtn: { padding: 2 },
    stepperQty: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#0F172A', minWidth: 16, textAlign: 'center' },

    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 12 },
    billLabel: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13.5, color: '#475569' },
    billValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: '#0F172A' },
    billMuted: { color: '#94A3B8', fontFamily: 'PlusJakartaSans_600SemiBold' },
    billStrong: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5, color: '#0F172A' },
    billNote: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11.5, color: '#94A3B8', marginTop: 6, lineHeight: 16 },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 14,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 4,
    },
    errorText: { flex: 1, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12.5, color: '#B91C1C' },

    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10,
    },
    bottomAmount: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20, color: '#0F172A', marginTop: 2 },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#008744',
        borderRadius: 26,
        paddingHorizontal: 24,
        height: 52,
        minWidth: 170,
    },
    checkoutText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#FFFFFF' },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
    emptyIcon: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#0F172A' },
    emptyText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13.5, color: '#64748B', textAlign: 'center' },
    primaryBtn: {
        marginTop: 14,
        backgroundColor: '#008744',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 13,
    },
    primaryBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#FFFFFF' },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#E2E8F0' },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 34,
    },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
    sheetTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#0F172A' },
    confirmBtn: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#008744',
        borderRadius: 18,
        height: 54,
    },
    confirmText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5, color: '#FFFFFF' },
});
