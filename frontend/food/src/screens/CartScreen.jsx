import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Alert,
    Image,
    Modal,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authenticatedFetch } from '../../../shared/utils/authenticatedFetch';
import { getCustomerId } from '../../../shared/utils/authStorage';

// ─── Dynamic Image Resolver for Real Food Items ─────────────────────────────
export const getItemImageSource = (item) => {
    // 1. Direct restaurant image URL (Unsplash or backend CDN)
    const rawImage = item?.image || item?.imageUrl || item?.photo;
    if (typeof rawImage === 'string' && rawImage.trim().startsWith('http')) {
        return { uri: rawImage.trim() };
    }
    // 2. Direct local asset require(...)
    if (typeof rawImage === 'number') {
        return rawImage;
    }

    // 3. Smart dish-name fallback mapping for realistic dynamic rendering
    const name = (item?.name || item?.category || '').toLowerCase();
    if (/coffee|brew|espresso|cappuccino|latte/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80' };
    }
    if (/chai|tea|masala chai/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80' };
    }
    if (/dosa|idli|vada|uttapam/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80' };
    }
    if (/biryani|rice|pulao/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' };
    }
    if (/pizza/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80' };
    }
    if (/burger/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80' };
    }
    if (/cake|dessert|lava|brownie|sweet|gulab/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80' };
    }
    if (/croissant|snack|bread|toast|sandwich/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80' };
    }
    if (/paneer|thali|curry|dal/i.test(name)) {
        return { uri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80' };
    }

    // Generic authentic gourmet dish fallback
    return { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80' };
};

export default function CartScreen({
    cart = {
        '1': {
            id: '1',
            name: 'Chocolate Lava Cake',
            price: 179,
            quantity: 4,
            isVeg: true,
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        },
    },
    restaurant = null,
    onBack,
    onPlaceOrder,
    onUpdateQuantity,
}) {
    // ─── State ──────────────────────────────────────────────────────────────
    const [couponApplied, setCouponApplied] = useState(true);
    const [discountAmount, setDiscountAmount] = useState(50);
    const [couponCode, setCouponCode] = useState('DROPP50');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [showPaymentSheet, setShowPaymentSheet] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('COD');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─── Customer identity (resolved from AsyncStorage on mount) ────────────
    const [customerId, setCustomerId] = useState(null);

    // ─── Delivery address (resolved once on mount) ───────────────────────────
    // For the demo we use a canonical address that travels with the customer ID.
    // When a real address management API exists, replace this with a fetch call.
    const deliveryAddress = {
        street: 'Sector 28, Golf Course Road',
        city: 'Gurugram',
        pincode: '122002',
        label: 'Home',
    };

    // Load the real customer ID on first render
    useEffect(() => {
        getCustomerId().then(setCustomerId).catch(() => {});
    }, []);

    // ─── Safe Computations ──────────────────────────────────────────────────
    const items = Object.values(cart || {}).filter((i) => i && i.quantity > 0);
    const totalItemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const itemTotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const deliveryPartnerFeeOriginal = 29;
    const taxesAndGst = 24;
    const finalDiscount = couponApplied ? discountAmount : 0;
    const totalToPay = Math.max(0, itemTotal + taxesAndGst - finalDiscount);

    // ─── Actions ────────────────────────────────────────────────────────────
    const handleAddItems = () => {
        if (onBack) onBack();
    };

    const handleConfirmPaymentAndOrder = async () => {
        if (isSubmitting) return;

        // ── Precondition guards ──────────────────────────────────────────────
        if (items.length === 0) {
            Alert.alert('Empty cart', 'Please add items before checking out.');
            return;
        }
        if (!restaurant?._id && !restaurant?.id) {
            Alert.alert(
                'Restaurant unavailable',
                'Please return to the restaurant and select your items again.'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            // ── Step 1: Create draft order ──────────────────────────────────
            // authenticatedFetch automatically attaches the real customerId
            // via x-customer-id header — the backend reads it as the caller.
            const draftJson = await authenticatedFetch('/api/orders/draft', {
                method: 'POST',
                body: JSON.stringify({
                    orderType: 'FOOD',
                    restaurantId: restaurant?._id || restaurant?.id,
                    restaurantName: restaurant?.name || '',
                    items: items.map((i) => ({
                        id: i.id,
                        name: i.name,
                        price: Number(i.price) || 0,
                        quantity: Number(i.quantity) || 1,
                        unitPrice: Number(i.price) || 0,
                        totalPrice: (Number(i.price) || 0) * (Number(i.quantity) || 1),
                        image: i.image || i.imageUrl || '',
                        isVeg: i.isVeg !== false,
                    })),
                    deliveryAddress,
                    paymentMethod: selectedPaymentMethod,
                    specialInstructions: specialInstructions.trim(),
                    couponCode: couponApplied ? couponCode : null,
                }),
            });

            if (!draftJson.success || !draftJson.data?._id) {
                throw new Error(draftJson.error || 'Server did not return a valid draft order.');
            }

            const draftOrder = draftJson.data;

            // ── Step 2: Confirm the order ──────────────────────────────────
            const confirmJson = await authenticatedFetch(
                `/api/orders/${draftOrder._id}/confirm`,
                { method: 'POST', body: JSON.stringify({}) }
            );

            const finalOrder = confirmJson.data || draftOrder;

            // ── Step 3: Navigate to tracking ─────────────────────────────
            setShowPaymentSheet(false);
            if (onPlaceOrder) {
                onPlaceOrder(finalOrder);
            }

        } catch (err) {
            // ⚠️ A failed request must NOT navigate forward.
            // Show the real error and stay on this screen.
            console.error('[CartScreen] Checkout failed:', err.message);
            Alert.alert(
                'Order failed',
                err.message || 'Something went wrong. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSubmitting(false);
        }
        // NOTE: There is intentionally no fallback navigation here.
        // If the request failed, the user stays on CartScreen and sees the error.
    };

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* ═════════════════════════════════════════════════════════════════
                1. TOP HEADER (Back Button + Title + Subtitle)
            ═════════════════════════════════════════════════════════════════ */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBack}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Review order</Text>
                    <Text style={styles.headerSubtitle}>
                        {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in your basket
                    </Text>
                </View>

                <View style={styles.headerRightSpacer} />
            </View>

            {/* ═════════════════════════════════════════════════════════════════
                2. 3-STEP PROGRESS STEPPER (Cart ✓ ─── Review ◎ ─── Payment ○)
            ═════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepperSection}>
                <View style={styles.stepperNodesRow}>
                    {/* Step 1: Cart (Completed) */}
                    <View style={styles.stepNodeCol}>
                        <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        </View>
                        <Text style={styles.stepLabelInactive}>Cart</Text>
                    </View>

                    {/* Connecting Line 1 */}
                    <View style={[styles.stepLine, styles.stepLineActive]} />

                    {/* Step 2: Review (Current Active) */}
                    <View style={styles.stepNodeCol}>
                        <View style={[styles.stepCircle, styles.stepCircleActiveRing]}>
                            <View style={styles.stepInnerDotActive} />
                        </View>
                        <Text style={styles.stepLabelActive}>Review</Text>
                    </View>

                    {/* Connecting Line 2 */}
                    <View style={styles.stepLine} />

                    {/* Step 3: Payment (Pending) */}
                    <View style={styles.stepNodeCol}>
                        <View style={[styles.stepCircle, styles.stepCirclePending]} />
                        <Text style={styles.stepLabelInactive}>Payment</Text>
                    </View>
                </View>
            </View>

            {/* ═════════════════════════════════════════════════════════════════
                3. MAIN SCROLLABLE CONTENT CARDS
            ═════════════════════════════════════════════════════════════════ */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── CARD A: DELIVERING TO ADDRESS & ETA ── */}
                <View style={styles.card}>
                    <View style={styles.addressRow}>
                        <View style={styles.addressIconCircle}>
                            <Ionicons name="home" size={20} color="#008744" />
                        </View>

                        <View style={styles.addressDetailsCol}>
                            <Text style={styles.addressLabelSmall}>Delivering to</Text>
                            <Text style={styles.addressMainTitle}>
                                {deliveryAddress.label} •{' '}
                                <Text style={styles.addressSubBold}>{deliveryAddress.street}</Text>
                            </Text>
                            <Text style={styles.addressSecondaryText}>
                                {deliveryAddress.city}, Haryana {deliveryAddress.pincode}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.changePillBtn} activeOpacity={0.75}>
                            <Text style={styles.changePillText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardInnerDivider} />

                    <View style={styles.deliveryEtaRow}>
                        <Ionicons name="time-outline" size={16} color="#64748B" />
                        <Text style={styles.deliveryEtaText}>
                            Delivery in <Text style={styles.deliveryEtaHighlight}>20 – 30 mins</Text>
                        </Text>
                    </View>
                </View>

                {/* ── CARD B: ORDER ITEMS LIST (DYNAMIC FROM REAL RESTAURANT) ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.cardHeaderTitleGroup}>
                            <Ionicons name="bag-handle-outline" size={19} color="#0F172A" />
                            <Text style={styles.cardHeaderTitle}>Order items ({items.length})</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addItemsBtn}
                            onPress={handleAddItems}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={16} color="#008744" />
                            <Text style={styles.addItemsBtnText}>Add items</Text>
                        </TouchableOpacity>
                    </View>

                    {items.length === 0 ? (
                        <View style={styles.emptyCartBox}>
                            <Ionicons name="cart-outline" size={44} color="#CBD5E1" />
                            <Text style={styles.emptyCartTitle}>Your basket is empty</Text>
                            <TouchableOpacity style={styles.browseMenuBtn} onPress={handleAddItems}>
                                <Text style={styles.browseMenuBtnText}>Explore Menu →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        items.map((item, index) => {
                            const isVeg = item.isVeg !== false;
                            const imageSource = getItemImageSource(item);

                            return (
                                <View key={item.id || `cart-item-${index}`}>
                                    <View style={styles.itemRow}>
                                        {/* Dynamic Dish Image */}
                                        <Image
                                            source={imageSource}
                                            style={styles.itemImage}
                                            resizeMode="cover"
                                        />

                                        {/* Item Info */}
                                        <View style={styles.itemDetailsCol}>
                                            <View style={styles.itemTitleRow}>
                                                {/* Veg / Non-Veg Indicator */}
                                                <View style={[styles.vegBadge, !isVeg && styles.nonVegBadge]}>
                                                    {isVeg ? (
                                                        <View style={styles.vegDot} />
                                                    ) : (
                                                        <View style={styles.nonVegTriangle} />
                                                    )}
                                                </View>

                                                <Text style={styles.itemNameText} numberOfLines={2}>
                                                    {item.name}
                                                </Text>
                                            </View>

                                            <Text style={styles.itemUnitPriceText}>
                                                ₹{item.price}{' '}
                                                <Text style={styles.itemEachSuffix}>each</Text>
                                            </Text>
                                        </View>

                                        {/* Stepper capsule [ -  4  + ] */}
                                        <View style={styles.stepperContainer}>
                                            <TouchableOpacity
                                                style={styles.stepperButton}
                                                onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, -1)}
                                                activeOpacity={0.65}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="remove" size={15} color="#008744" />
                                            </TouchableOpacity>

                                            <Text style={styles.stepperQtyText}>{item.quantity}</Text>

                                            <TouchableOpacity
                                                style={styles.stepperButton}
                                                onPress={() => onUpdateQuantity && onUpdateQuantity(item.id, 1)}
                                                activeOpacity={0.65}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="add" size={15} color="#008744" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {index < items.length - 1 && <View style={styles.itemDivider} />}
                                </View>
                            );
                        })
                    )}
                </View>

                {/* ── CARD C: SPECIAL INSTRUCTIONS ── */}
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => {
                        Alert.prompt
                            ? Alert.prompt(
                                'Special Instructions',
                                'E.g. Leave at door, extra napkins, less spicy...',
                                (text) => setSpecialInstructions(text || ''),
                                'plain-text',
                                specialInstructions
                            )
                            : null;
                    }}
                >
                    <View style={styles.specialInstructionsRow}>
                        <View style={styles.specialInstructionsLeft}>
                            <Ionicons name="document-text-outline" size={19} color="#0F172A" />
                            <View style={styles.specialInstructionsTexts}>
                                <Text style={styles.instructionsTitle}>
                                    Special instructions <Text style={styles.instructionsOptional}>(optional)</Text>
                                </Text>
                                <Text style={styles.instructionsPlaceholder} numberOfLines={1}>
                                    {specialInstructions || 'E.g. Leave at door, extra napkins, less spicy...'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {/* ── CARD D: OFFERS & DISCOUNTS ── */}
                <View style={styles.card}>
                    <View style={styles.offersHeaderRow}>
                        <View style={styles.offersHeaderLeft}>
                            <View style={styles.percentBadge}>
                                <Ionicons name="pricetag" size={14} color="#FFFFFF" />
                            </View>
                            <Text style={styles.cardSectionTitle}>Offers & discounts</Text>
                        </View>
                    </View>

                    {couponApplied ? (
                        <View style={styles.appliedPromoCard}>
                            <View style={styles.appliedPromoLeft}>
                                <View style={styles.appliedPromoIconBox}>
                                    <Ionicons name="receipt" size={16} color="#008744" />
                                </View>
                                <View style={styles.appliedPromoTextCol}>
                                    <Text style={styles.appliedCodeTitle}>{couponCode} applied</Text>
                                    <Text style={styles.appliedSavingsSub}>
                                        You saved <Text style={styles.boldGreen}>₹{discountAmount}</Text> on this order
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.changeCouponPill}
                                onPress={() => {
                                    setCouponApplied(false);
                                    Alert.alert('Coupon Removed', 'You can apply another promo code at checkout.');
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.changeCouponText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.applyCouponRow}
                            onPress={() => {
                                setCouponApplied(true);
                                setDiscountAmount(50);
                                setCouponCode('DROPP50');
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="gift-outline" size={18} color="#008744" />
                            <Text style={styles.applyCouponActionText}>Apply 'DROPP50' for ₹50 off</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── CARD E: BILL SUMMARY ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderTitleGroup}>
                        <Ionicons name="newspaper-outline" size={19} color="#0F172A" />
                        <Text style={styles.cardSectionTitle}>Bill summary</Text>
                    </View>

                    {/* Item Total */}
                    <View style={styles.billLineRow}>
                        <Text style={styles.billLineLabel}>
                            Item total ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
                        </Text>
                        <Text style={styles.billLineValue}>₹{itemTotal}</Text>
                    </View>

                    {/* Delivery Partner Fee */}
                    <View style={styles.billLineRow}>
                        <View style={styles.billLabelWithInfo}>
                            <Text style={styles.billLineLabel}>Delivery partner fee</Text>
                            <Ionicons name="information-circle-outline" size={15} color="#94A3B8" />
                        </View>
                        <View style={styles.deliveryFeeValueRow}>
                            <Text style={styles.strikethroughPrice}>₹{deliveryPartnerFeeOriginal}</Text>
                            <Text style={styles.freeGreenBadge}>FREE</Text>
                        </View>
                    </View>

                    {/* Platform & Taxes */}
                    <View style={styles.billLineRow}>
                        <View style={styles.billLabelWithInfo}>
                            <Text style={styles.billLineLabel}>Platform & taxes (GST)</Text>
                            <Ionicons name="information-circle-outline" size={15} color="#94A3B8" />
                        </View>
                        <Text style={styles.billLineValue}>₹{taxesAndGst}</Text>
                    </View>

                    {/* Coupon Savings */}
                    {couponApplied && (
                        <View style={styles.billLineRow}>
                            <Text style={styles.couponSavingsLabel}>Coupon savings</Text>
                            <Text style={styles.couponSavingsValue}>- ₹{discountAmount}</Text>
                        </View>
                    )}

                    <View style={styles.cardInnerDivider} />

                    {/* Total Amount */}
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>Total amount</Text>
                        <Text style={styles.grandTotalValue}>₹{totalToPay}</Text>
                    </View>

                    {/* Savings Green Pill Banner */}
                    {couponApplied && (
                        <View style={styles.savingsBanner}>
                            <Ionicons name="leaf" size={15} color="#008744" />
                            <Text style={styles.savingsBannerText}>
                                You are saving ₹{discountAmount} on this order!
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom Padding for Sticky Checkout Bar */}
                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ═════════════════════════════════════════════════════════════════
                4. STICKY BOTTOM CHECKOUT BAR
            ═════════════════════════════════════════════════════════════════ */}
            <View style={styles.bottomBarContainer}>
                <View style={styles.bottomBarRow}>
                    <View style={styles.totalPayCol}>
                        <Text style={styles.totalPayLabel}>Total to pay</Text>
                        <View style={styles.totalPayAmountRow}>
                            <Text style={styles.totalPayAmount}>₹{totalToPay}</Text>
                            <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.placeOrderBtn, isSubmitting && { opacity: 0.75 }]}
                        onPress={() => setShowPaymentSheet(true)}
                        disabled={isSubmitting || items.length === 0}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.placeOrderBtnText}>Place order</Text>
                        <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Trust Footer */}
                <View style={styles.trustFooterRow}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#008744" />
                    <Text style={styles.trustFooterText}>
                        Secure payment • UPI • Cards • Cash
                    </Text>
                </View>
            </View>

            {/* ═════════════════════════════════════════════════════════════════
                5. SELECT PAYMENT METHOD SHEET MODAL
            ═════════════════════════════════════════════════════════════════ */}
            <Modal
                visible={showPaymentSheet}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPaymentSheet(false)}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity
                        style={styles.modalDismissArea}
                        activeOpacity={1}
                        onPress={() => !isSubmitting && setShowPaymentSheet(false)}
                    />

                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetHandle} />

                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Select Payment Method</Text>
                            <TouchableOpacity
                                onPress={() => setShowPaymentSheet(false)}
                                disabled={isSubmitting}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={22} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* Payment Options */}
                        <View style={styles.paymentMethodsList}>
                            {/* UPI / GPay */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOptionCard,
                                    selectedPaymentMethod === 'UPI' && styles.paymentOptionSelected,
                                ]}
                                onPress={() => setSelectedPaymentMethod('UPI')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.paymentOptionLeft}>
                                    <View style={styles.paymentIconBox}>
                                        <Ionicons name="flash" size={18} color="#008744" />
                                    </View>
                                    <View>
                                        <Text style={styles.paymentMethodTitle}>UPI / Google Pay / PhonePe</Text>
                                        <Text style={styles.paymentMethodSub}>Instant payment with zero fees</Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={selectedPaymentMethod === 'UPI' ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={selectedPaymentMethod === 'UPI' ? '#008744' : '#CBD5E1'}
                                />
                            </TouchableOpacity>

                            {/* Dropp Pay Wallet */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOptionCard,
                                    selectedPaymentMethod === 'WALLET' && styles.paymentOptionSelected,
                                ]}
                                onPress={() => setSelectedPaymentMethod('WALLET')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.paymentOptionLeft}>
                                    <View style={styles.paymentIconBox}>
                                        <Ionicons name="wallet-outline" size={18} color="#0284C7" />
                                    </View>
                                    <View>
                                        <Text style={styles.paymentMethodTitle}>Dropp Pay Wallet (₹450)</Text>
                                        <Text style={styles.paymentMethodSub}>1-tap instant biometric checkout</Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={selectedPaymentMethod === 'WALLET' ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={selectedPaymentMethod === 'WALLET' ? '#008744' : '#CBD5E1'}
                                />
                            </TouchableOpacity>

                            {/* Credit / Debit Card */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOptionCard,
                                    selectedPaymentMethod === 'CARD' && styles.paymentOptionSelected,
                                ]}
                                onPress={() => setSelectedPaymentMethod('CARD')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.paymentOptionLeft}>
                                    <View style={styles.paymentIconBox}>
                                        <Ionicons name="card-outline" size={18} color="#7C3AED" />
                                    </View>
                                    <View>
                                        <Text style={styles.paymentMethodTitle}>Credit / Debit Card</Text>
                                        <Text style={styles.paymentMethodSub}>Visa, Mastercard, RuPay</Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={selectedPaymentMethod === 'CARD' ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={selectedPaymentMethod === 'CARD' ? '#008744' : '#CBD5E1'}
                                />
                            </TouchableOpacity>

                            {/* Cash on Delivery */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOptionCard,
                                    selectedPaymentMethod === 'COD' && styles.paymentOptionSelected,
                                ]}
                                onPress={() => setSelectedPaymentMethod('COD')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.paymentOptionLeft}>
                                    <View style={styles.paymentIconBox}>
                                        <MaterialCommunityIcons name="cash" size={19} color="#D97706" />
                                    </View>
                                    <View>
                                        <Text style={styles.paymentMethodTitle}>Cash on Delivery</Text>
                                        <Text style={styles.paymentMethodSub}>Pay cash or scan QR when delivered</Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={selectedPaymentMethod === 'COD' ? 'radio-button-on' : 'radio-button-off'}
                                    size={20}
                                    color={selectedPaymentMethod === 'COD' ? '#008744' : '#CBD5E1'}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Pay Button */}
                        <TouchableOpacity
                            style={[styles.confirmPayBtn, isSubmitting && { opacity: 0.75 }]}
                            onPress={handleConfirmPaymentAndOrder}
                            disabled={isSubmitting}
                            activeOpacity={0.88}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Text style={styles.confirmPayBtnText}>
                                        Pay ₹{totalToPay} & Confirm Order
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

// ─── STYLES (MATCHING SCREENSHOT WITH HIGH-PRECISION TOKENS) ─────────────────
const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#F8FAF9',
    },

    // 1. Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
    },
    headerSubtitle: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    headerRightSpacer: {
        width: 38,
    },

    // 2. Stepper
    stepperSection: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    stepperNodesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNodeCol: {
        alignItems: 'center',
        gap: 4,
    },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleCompleted: {
        backgroundColor: '#008744',
    },
    stepCircleActiveRing: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2.5,
        borderColor: '#008744',
    },
    stepInnerDotActive: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#008744',
    },
    stepCirclePending: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
        marginBottom: 16,
    },
    stepLineActive: {
        backgroundColor: '#008744',
    },
    stepLabelActive: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        color: '#008744',
    },
    stepLabelInactive: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#94A3B8',
    },

    // 3. Scroll Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
    },

    // Card Base
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDF2F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
        gap: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardHeaderTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardHeaderTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#0F172A',
    },
    cardSectionTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#0F172A',
    },
    cardInnerDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 2,
    },

    // Address Card
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    addressIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E8F6EF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressDetailsCol: {
        flex: 1,
        gap: 2,
    },
    addressLabelSmall: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
    addressMainTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    addressSubBold: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#0F172A',
    },
    addressSecondaryText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
    changePillBtn: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    changePillText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#0F172A',
    },
    deliveryEtaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deliveryEtaText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
    },
    deliveryEtaHighlight: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        color: '#008744',
    },

    // Items List
    addItemsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F6EF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    addItemsBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#008744',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    itemDetailsCol: {
        flex: 1,
        gap: 4,
    },
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vegBadge: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        borderColor: '#008744',
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nonVegBadge: {
        borderColor: '#DC2626',
    },
    vegDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#008744',
    },
    nonVegTriangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 3.5,
        borderRightWidth: 3.5,
        borderBottomWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#DC2626',
    },
    itemNameText: {
        flex: 1,
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    itemUnitPriceText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#0F172A',
    },
    itemEachSuffix: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#94A3B8',
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#F8FAFC',
        marginVertical: 8,
    },

    // Stepper
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FAF4',
        borderWidth: 1,
        borderColor: '#D4EFE0',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 10,
    },
    stepperButton: {
        padding: 2,
    },
    stepperQtyText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#008744',
        minWidth: 14,
        textAlign: 'center',
    },

    // Empty Cart
    emptyCartBox: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    emptyCartTitle: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#64748B',
    },
    browseMenuBtn: {
        backgroundColor: '#008744',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 6,
    },
    browseMenuBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#FFFFFF',
    },

    // Special Instructions
    specialInstructionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    specialInstructionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 8,
    },
    specialInstructionsTexts: {
        flex: 1,
        gap: 2,
    },
    instructionsTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    instructionsOptional: {
        fontFamily: 'PlusJakartaSans_500Medium',
        color: '#94A3B8',
        fontSize: 11,
    },
    instructionsPlaceholder: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#94A3B8',
    },

    // Offers & Discounts
    offersHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    offersHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    percentBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#008744',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appliedPromoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0FAF4',
        borderWidth: 1,
        borderColor: '#D4EFE0',
        padding: 12,
        borderRadius: 14,
    },
    appliedPromoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    appliedPromoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    appliedPromoTextCol: {
        gap: 2,
    },
    appliedCodeTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#065F46',
    },
    appliedSavingsSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#047857',
    },
    boldGreen: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        color: '#008744',
    },
    changeCouponPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D4EFE0',
    },
    changeCouponText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        color: '#0F172A',
    },
    applyCouponRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    applyCouponActionText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#008744',
    },

    // Bill Summary
    billLineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    billLabelWithInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    billLineLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#64748B',
    },
    billLineValue: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#0F172A',
    },
    deliveryFeeValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    strikethroughPrice: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 12,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    freeGreenBadge: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 12,
        color: '#008744',
    },
    couponSavingsLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#008744',
    },
    couponSavingsValue: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#008744',
    },
    grandTotalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    grandTotalLabel: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 16,
        color: '#0F172A',
    },
    grandTotalValue: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        color: '#0F172A',
    },
    savingsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8F6EF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 4,
    },
    savingsBannerText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 11,
        color: '#008744',
    },

    // 4. Sticky Bottom Bar
    bottomBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#EDF2F0',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 8,
        gap: 8,
    },
    bottomBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    totalPayCol: {
        gap: 2,
    },
    totalPayLabel: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },
    totalPayAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    totalPayAmount: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 20,
        color: '#0F172A',
    },
    placeOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#005C30',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        gap: 8,
    },
    placeOrderBtnText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#FFFFFF',
    },
    trustFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    trustFooterText: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
    },

    // 5. Payment Modal Sheet
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDismissArea: {
        flex: 1,
    },
    sheetContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 16,
    },
    sheetHandle: {
        width: 44,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#CBD5E1',
        alignSelf: 'center',
        marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
    },
    paymentMethodsList: {
        gap: 10,
    },
    paymentOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    paymentOptionSelected: {
        backgroundColor: '#F0FAF4',
        borderColor: '#008744',
    },
    paymentOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentMethodTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 13,
        color: '#0F172A',
    },
    paymentMethodSub: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    confirmPayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#008744',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 10,
        marginTop: 6,
    },
    confirmPayBtnText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#FFFFFF',
    },
});