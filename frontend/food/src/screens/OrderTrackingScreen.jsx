import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    Linking,
    StatusBar,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LiveMap from '../../../shared/components/LiveMap';
import { API_BASE, getWsBase } from '../../../shared/utils/apiConfig';
import { getCustomerId } from '../../../shared/utils/authStorage';
import { getOrderById, getRestaurantById, cancelOrder } from '../api/foodApi';
import { loadDeliveryAddress, formatAddress } from '../utils/deliveryAddress';

const STEPS = [
    { key: 'confirmed', title: 'Confirmed' },
    { key: 'preparing', title: 'Preparing' },
    { key: 'out_for_delivery', title: 'On the way' },
    { key: 'delivered', title: 'Delivered' },
];

const STEP_BY_STATUS = {
    draft: -1,
    confirmed: 0,
    accepted: 1,
    preparing: 1,
    driver_assigned: 1,
    ready_for_pickup: 1,
    out_for_delivery: 2,
    delivered: 3,
};

const STATUS_TEXT = {
    draft: 'Order not placed yet',
    confirmed: 'Order placed. Waiting for the restaurant to accept.',
    accepted: 'The restaurant accepted your order.',
    preparing: 'The kitchen is preparing your food.',
    driver_assigned: 'A delivery partner has been assigned.',
    ready_for_pickup: 'Your food is packed and ready for pickup.',
    out_for_delivery: 'Your order is on the way.',
    delivered: 'Delivered. Enjoy your meal!',
    cancelled: 'This order was cancelled.',
};

const CANCELLABLE = ['confirmed', 'accepted'];
const TERMINAL = ['delivered', 'cancelled'];

const idOf = (v) => (v && typeof v === 'object' ? String(v._id || '') : v ? String(v) : '');
const rupees = (n) => `₹${Math.round(Number(n) || 0)}`;
const timeOf = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function OrderTrackingScreen({ orderId: orderIdProp, initialOrder: initialOrderProp = null, order: legacyOrder = null, onBack, onBrowse }) {
    // `order` is accepted for older callers; only a real backend _id is tracked
    const initialOrder = initialOrderProp || legacyOrder;
    const orderId = orderIdProp || idOf(legacyOrder?._id) || null;
    const [order, setOrder] = useState(initialOrder && idOf(initialOrder._id) === orderId ? initialOrder : null);
    const [loadState, setLoadState] = useState(orderId ? 'loading' : 'none'); // loading | ready | error | none
    const [loadError, setLoadError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [restaurant, setRestaurant] = useState(null);
    const [dropPoint, setDropPoint] = useState(null);
    const [driverPos, setDriverPos] = useState(null);
    const [arrivedAtPickup, setArrivedAtPickup] = useState(false);
    const [stepTimes, setStepTimes] = useState({});
    const [cancelling, setCancelling] = useState(false);
    const [wsLive, setWsLive] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(true);

    // Current assigned driver id, read inside the socket handler without re-subscribing
    const driverIdRef = useRef(null);
    driverIdRef.current = order?.driver?.driverId || null;

    // ── Load the real order document ────────────────────────────────
    const loadOrder = useCallback(async () => {
        if (!orderId) return;
        try {
            const fresh = await getOrderById(orderId);
            setOrder(fresh);
            setLoadState('ready');
            setLoadError(null);
        } catch (err) {
            setLoadError(err?.message || 'Could not load your order.');
            setLoadState((s) => (s === 'ready' ? 'ready' : 'error'));
        }
    }, [orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadOrder();
        setRefreshing(false);
    };

    // ── Restaurant location (pickup pin) ────────────────────────────
    const restaurantId = idOf(order?.restaurantId);
    useEffect(() => {
        if (!restaurantId) return;
        let alive = true;
        getRestaurantById(restaurantId)
            .then((r) => alive && setRestaurant(r))
            .catch(() => {});
        return () => { alive = false; };
    }, [restaurantId]);

    // ── Delivery pin: coordinates saved with the address on this device ──
    const dropStreet = order?.deliveryAddress?.street || '';
    useEffect(() => {
        let alive = true;
        loadDeliveryAddress().then((saved) => {
            if (!alive || !saved) return;
            if (saved.street === dropStreet && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
                setDropPoint({ lat: saved.lat, lng: saved.lng });
            }
        });
        return () => { alive = false; };
    }, [dropStreet]);

    // ── Seed the driver marker from the driver's last known position ──
    const assignedDriverId = order?.driver?.driverId || null;
    useEffect(() => {
        if (!assignedDriverId) return;
        let alive = true;
        fetch(`${API_BASE}/api/drivers/${assignedDriverId}`)
            .then((r) => r.json())
            .then((json) => {
                const loc = json?.data?.location;
                if (alive && loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
                    setDriverPos((prev) => prev || { lat: loc.lat, lng: loc.lng, bearing: loc.bearing || 0 });
                }
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [assignedDriverId]);

    // ── Live updates over WebSocket (one connection per order id) ────
    useEffect(() => {
        if (!orderId) return undefined;
        let ws = null;
        let closedByUs = false;
        let retryTimer = null;
        let attempt = 0;

        const markStep = (status, at) => {
            setStepTimes((prev) => (prev[status] ? prev : { ...prev, [status]: at || new Date().toISOString() }));
        };

        const applyStatus = (status, extra = {}, at) => {
            setOrder((prev) => (prev ? { ...prev, ...extra, status } : prev));
            markStep(status, at);
        };

        const handle = (msg) => {
            const { type, data = {}, at } = msg || {};
            if (type === 'driver.location_update') {
                if (driverIdRef.current && String(data.driverId) === String(driverIdRef.current)) {
                    setDriverPos({ lat: Number(data.lat), lng: Number(data.lng), bearing: Number(data.bearing) || 0 });
                }
                return;
            }
            if (String(data.orderId || '') !== String(orderId)) return;

            switch (type) {
                case 'ORDER_CONFIRMED':
                    applyStatus('confirmed', {}, at);
                    break;
                case 'ORDER_STATUS_UPDATE':
                    if (data.status) applyStatus(data.status, {}, at);
                    if (data.message) {
                        Speech.stop();
                        Speech.speak(data.message, { language: 'en-IN', rate: 0.94 });
                    }
                    break;
                case 'order.driver_confirmed':
                    applyStatus('driver_assigned', data.driver ? { driver: data.driver } : {}, at);
                    break;
                case 'order.driver_arrived_pickup':
                    setArrivedAtPickup(true);
                    if (data.driver) setOrder((prev) => (prev ? { ...prev, driver: { ...prev.driver, ...data.driver } } : prev));
                    break;
                case 'order.out_for_delivery':
                    applyStatus('out_for_delivery', {}, at);
                    break;
                case 'order.delivered':
                    applyStatus('delivered', {}, at);
                    break;
                case 'ORDER_CANCELLED':
                    applyStatus('cancelled', {}, at);
                    break;
                default:
                    return;
            }
            // Pull the full document so driver details/timestamps stay authoritative
            loadOrder();
        };

        const connect = async () => {
            const customerId = await getCustomerId();
            if (closedByUs) return;
            try {
                ws = new WebSocket(`${getWsBase()}?customerId=${encodeURIComponent(customerId)}`);
            } catch (_) {
                scheduleRetry();
                return;
            }
            ws.onopen = () => {
                attempt = 0;
                setWsLive(true);
            };
            ws.onmessage = (e) => {
                try {
                    handle(JSON.parse(e.data));
                } catch (_) {
                    // ignore malformed frames
                }
            };
            ws.onerror = () => {
                try { ws?.close(); } catch (_) { /* noop */ }
            };
            ws.onclose = () => {
                setWsLive(false);
                if (!closedByUs) scheduleRetry();
            };
        };

        const scheduleRetry = () => {
            attempt += 1;
            const delay = Math.min(30000, 2000 * 2 ** Math.min(attempt, 4));
            retryTimer = setTimeout(() => {
                // Catch up on anything missed while disconnected
                loadOrder();
                connect();
            }, delay);
        };

        connect();
        return () => {
            closedByUs = true;
            clearTimeout(retryTimer);
            try { ws?.close(); } catch (_) { /* noop */ }
        };
    }, [orderId, loadOrder]);

    // ── Cancel ──────────────────────────────────────────────────────
    const doCancel = async () => {
        setCancelling(true);
        try {
            const updated = await cancelOrder(orderId);
            setOrder((prev) => ({ ...(prev || {}), ...(updated || {}), status: 'cancelled' }));
        } catch (err) {
            Alert.alert('Could not cancel', err?.message || 'Please try again.');
            loadOrder();
        } finally {
            setCancelling(false);
        }
    };

    const confirmCancel = () => {
        Alert.alert('Cancel this order?', 'The restaurant will be notified right away.', [
            { text: 'Keep order', style: 'cancel' },
            { text: 'Cancel order', style: 'destructive', onPress: doCancel },
        ]);
    };

    // ── No order / loading / error ─────────────────────────────────
    if (!orderId) {
        return (
            <Shell onBack={onBack}>
                <StateView
                    icon="receipt-outline"
                    title="No active order"
                    text="Orders you place will show up here with live tracking."
                    actionLabel="Browse restaurants"
                    onAction={onBrowse || onBack}
                />
            </Shell>
        );
    }
    if (!order && loadState === 'loading') {
        return (
            <Shell onBack={onBack}>
                <View style={styles.centerFill}>
                    <ActivityIndicator size="large" color="#00A859" />
                    <Text style={styles.mutedText}>Loading your order…</Text>
                </View>
            </Shell>
        );
    }
    if (!order) {
        return (
            <Shell onBack={onBack}>
                <StateView
                    icon="cloud-offline-outline"
                    title="Couldn't load this order"
                    text={loadError}
                    actionLabel="Try again"
                    onAction={() => { setLoadState('loading'); loadOrder(); }}
                />
            </Shell>
        );
    }

    const status = order.status || 'confirmed';
    const isCancelled = status === 'cancelled';
    const stepIndex = STEP_BY_STATUS[status] ?? 0;
    const driver = order.driver?.driverId || order.driver?.name ? order.driver : null;
    const restaurantName = order.restaurantId?.name || order.restaurantName || restaurant?.name || 'Restaurant';
    const shortId = `#${String(order._id).slice(-6).toUpperCase()}`;

    let statusText = STATUS_TEXT[status] || `Status: ${String(status).replace(/_/g, ' ')}`;
    if (arrivedAtPickup && stepIndex === 1) statusText = `${driver?.name || 'Your delivery partner'} has reached the restaurant.`;
    else if (status === 'driver_assigned' && driver?.name) statusText = `${driver.name} is heading to the restaurant.`;

    // Estimated arrival from the restaurant's own delivery time
    const placedAt = order.confirmedAt || order.createdAt;
    const expectedBy = restaurant?.deliveryTimeMins && placedAt
        ? timeOf(new Date(new Date(placedAt).getTime() + restaurant.deliveryTimeMins * 60000))
        : null;
    const headerPill = isCancelled
        ? 'Cancelled'
        : status === 'delivered'
            ? 'Delivered'
            : expectedBy
                ? `Expected by ${expectedBy}`
                : 'Tracking live';

    const stepTime = (key, idx) => {
        if (idx > stepIndex) return null;
        if (key === 'confirmed') return timeOf(order.confirmedAt || order.createdAt);
        if (key === 'delivered' && status === 'delivered') return timeOf(stepTimes.delivered || order.updatedAt);
        const t = stepTimes[key] || (key === 'preparing' && (stepTimes.accepted || stepTimes.driver_assigned));
        return timeOf(t);
    };

    const pickup = restaurant?.location || null;
    const showMap = !isCancelled && status !== 'delivered' && (pickup || dropPoint || driverPos);

    return (
        <Shell
            onBack={onBack}
            center={
                <View style={[styles.etaPill, isCancelled && { backgroundColor: '#EF4444' }]}>
                    <View style={[styles.pillDot, wsLive && !TERMINAL.includes(status) && styles.pillDotLive]} />
                    <Text style={styles.etaPillText}>{headerPill}</Text>
                </View>
            }
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A859" />}
            >
                {showMap ? (
                    <View style={styles.mapCard}>
                        <LiveMap
                            style={styles.map}
                            pickup={pickup}
                            drop={dropPoint}
                            driver={driverPos}
                            driverIcon="bicycle"
                            pickupLabel={restaurantName}
                            dropLabel="Your address"
                        />
                        <View style={styles.mapBadge}>
                            <View style={[styles.pillDot, wsLive ? styles.pillDotLive : { backgroundColor: '#94A3B8' }]} />
                            <Text style={styles.mapBadgeText}>
                                {driverPos ? 'Live partner location' : wsLive ? 'Live updates on' : 'Reconnecting…'}
                            </Text>
                        </View>
                        {pickup?.approximate ? (
                            <Text style={styles.mapCaption}>Restaurant pin is approximate (from its pincode).</Text>
                        ) : null}
                    </View>
                ) : null}

                {/* Status + OTP */}
                <View style={[styles.card, isCancelled && styles.cancelledCard]}>
                    <View style={styles.inlineRow}>
                        <View style={[styles.statusIcon, isCancelled && { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons
                                name={isCancelled ? 'close' : status === 'delivered' ? 'checkmark-done' : 'restaurant'}
                                size={18}
                                color={isCancelled ? '#DC2626' : '#00A859'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitle}>{statusText}</Text>
                            <Text style={styles.mutedText}>{shortId} • {restaurantName}</Text>
                        </View>
                    </View>

                    {!isCancelled && status !== 'delivered' && order.deliveryOtp ? (
                        <View style={styles.otpBox}>
                            <View style={styles.inlineRow}>
                                <Ionicons name="shield-checkmark" size={18} color="#00C96B" />
                                <View>
                                    <Text style={styles.otpLabel}>DELIVERY OTP</Text>
                                    <Text style={styles.otpSub}>Share only with your delivery partner</Text>
                                </View>
                            </View>
                            <View style={styles.otpPill}>
                                <Text style={styles.otpDigits}>{order.deliveryOtp}</Text>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Timeline */}
                {!isCancelled && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Order status</Text>
                        <View style={styles.timelineRow}>
                            {STEPS.map((step, idx) => {
                                const done = idx <= stepIndex;
                                const active = idx === stepIndex && status !== 'delivered';
                                const t = stepTime(step.key, idx);
                                return (
                                    <View key={step.key} style={styles.timelineStep}>
                                        <View style={styles.stepIndicatorRow}>
                                            <View style={[styles.stepCircle, done && styles.stepCircleDone, active && styles.stepCircleActive]}>
                                                {done && !active ? (
                                                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                                ) : (
                                                    <View style={active ? styles.activeDot : styles.idleDot} />
                                                )}
                                            </View>
                                            {idx < STEPS.length - 1 && (
                                                <View style={[styles.stepLine, idx < stepIndex && styles.stepLineDone]} />
                                            )}
                                        </View>
                                        <Text style={[styles.stepTitle, done && styles.stepTitleDone]} numberOfLines={1}>
                                            {step.title}
                                        </Text>
                                        <Text style={styles.stepTime}>{t || (active ? 'Now' : ' ')}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Delivery partner (only when one is really assigned) */}
                {!isCancelled && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Delivery partner</Text>
                        {driver ? (
                            <View style={styles.driverRow}>
                                {typeof driver.avatar === 'string' && driver.avatar.startsWith('http') ? (
                                    <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
                                ) : (
                                    <View style={[styles.driverAvatar, styles.driverAvatarFallback]}>
                                        <Text style={styles.driverInitial}>{(driver.name || '?').charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <View style={styles.inlineRow}>
                                        <Text style={styles.driverName}>{driver.name || 'Delivery partner'}</Text>
                                        {driver.rating ? (
                                            <View style={styles.ratingBadge}>
                                                <Ionicons name="star" size={11} color="#F59E0B" />
                                                <Text style={styles.ratingText}>{Number(driver.rating).toFixed(1)}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {driver.vehicle ? <Text style={styles.mutedText}>{driver.vehicle}</Text> : null}
                                </View>
                                {driver.phone ? (
                                    <TouchableOpacity
                                        style={styles.callBtn}
                                        onPress={() => Linking.openURL(`tel:${driver.phone}`).catch(() => {})}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="call" size={16} color="#00A859" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : (
                            <View style={[styles.inlineRow, { marginTop: 10 }]}>
                                {status !== 'delivered' && <ActivityIndicator size="small" color="#00A859" />}
                                <Text style={styles.mutedText}>
                                    {status === 'delivered' ? 'Delivered by a Dropp partner.' : "We'll show your partner here once one is assigned."}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Summary */}
                <View style={styles.card}>
                    <TouchableOpacity style={styles.summaryHeader} onPress={() => setSummaryOpen(!summaryOpen)} activeOpacity={0.8}>
                        <View>
                            <Text style={styles.cardTitle}>Order summary</Text>
                            <Text style={styles.mutedText}>{shortId} • {timeOf(order.createdAt) || ''}</Text>
                        </View>
                        <Ionicons name={summaryOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#0F172A" />
                    </TouchableOpacity>
                    {summaryOpen && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                            {(order.items || []).map((item, i) => (
                                <View key={`${idOf(item.menuItemId)}-${i}`} style={styles.summaryRow}>
                                    <Text style={styles.summaryName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.summaryQty}>×{item.quantity}</Text>
                                    <Text style={styles.summaryPrice}>{rupees(item.totalPrice ?? item.unitPrice * item.quantity)}</Text>
                                </View>
                            ))}
                            <View style={styles.divider} />
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryName}>Item total</Text>
                                <Text style={styles.summaryPrice}>{rupees(order.subtotal)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryName}>Delivery fee</Text>
                                <Text style={styles.summaryPrice}>{rupees(order.deliveryFee)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.totalLabel}>{status === 'delivered' ? 'Total paid' : 'To pay on delivery'}</Text>
                                <Text style={styles.totalValue}>{rupees(order.totalAmount)}</Text>
                            </View>
                            {formatAddress(order.deliveryAddress) ? (
                                <View style={styles.addressBox}>
                                    <Ionicons name="location-outline" size={16} color="#00A859" />
                                    <Text style={styles.addressText} numberOfLines={2}>{formatAddress(order.deliveryAddress)}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}
                </View>

                {CANCELLABLE.includes(status) && (
                    <TouchableOpacity
                        style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
                        activeOpacity={0.8}
                        onPress={confirmCancel}
                        disabled={cancelling}
                    >
                        {cancelling ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                        )}
                        <Text style={styles.cancelText}>{cancelling ? 'Cancelling…' : 'Cancel order'}</Text>
                    </TouchableOpacity>
                )}

                {TERMINAL.includes(status) && (
                    <TouchableOpacity style={styles.primaryBtn} onPress={onBrowse || onBack} activeOpacity={0.88}>
                        <Text style={styles.primaryBtnText}>Order something else</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </Shell>
    );
}

function Shell({ onBack, center, children }) {
    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                {center || <Text style={styles.headerTitle}>Your order</Text>}
                <View style={{ width: 38 }} />
            </View>
            {children}
        </SafeAreaView>
    );
}

function StateView({ icon, title, text, actionLabel, onAction }) {
    return (
        <View style={styles.centerFill}>
            <View style={styles.stateIcon}>
                <Ionicons name={icon} size={36} color="#00A859" />
            </View>
            <Text style={styles.stateTitle}>{title}</Text>
            {text ? <Text style={[styles.mutedText, { textAlign: 'center' }]}>{text}</Text> : null}
            {actionLabel ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={onAction} activeOpacity={0.88}>
                    <Text style={styles.primaryBtnText}>{actionLabel}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF9F1' },
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
    headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#0F172A' },
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
    pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
    pillDotLive: { backgroundColor: '#4ADE80' },
    etaPillText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12.5, color: '#FFFFFF' },

    scroll: { padding: 16, paddingBottom: 48, gap: 14 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
    stateIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    stateTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#0F172A' },

    mapCard: {
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DCEFE3',
    },
    map: { height: 250 },
    mapBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(15,23,42,0.82)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
    },
    mapBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#FFFFFF' },
    mapCaption: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E7F0EA',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    cancelledCard: { borderColor: '#FECACA', backgroundColor: '#FFFBFB' },
    cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#0F172A' },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mutedText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: '#64748B', flexShrink: 1 },
    statusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14.5, color: '#0F172A', marginBottom: 2 },

    otpBox: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        padding: 12,
    },
    otpLabel: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11, color: '#047857', letterSpacing: 0.6 },
    otpSub: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#64748B' },
    otpPill: { backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    otpDigits: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#FFFFFF', letterSpacing: 4 },

    timelineRow: { flexDirection: 'row', marginTop: 14 },
    timelineStep: { flex: 1 },
    stepIndicatorRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleDone: { backgroundColor: '#00A859', borderColor: '#00A859' },
    stepCircleActive: { backgroundColor: '#FFFFFF', borderColor: '#00A859' },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00A859' },
    idleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
    stepLineDone: { backgroundColor: '#00A859' },
    stepTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5, color: '#94A3B8', marginTop: 8 },
    stepTitleDone: { color: '#0F172A', fontFamily: 'PlusJakartaSans_700Bold' },
    stepTime: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, color: '#64748B', marginTop: 2 },

    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    driverAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E2E8F0' },
    driverAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
    driverInitial: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#FFFFFF' },
    driverName: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#0F172A' },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    ratingText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#92400E' },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        alignItems: 'center',
        justifyContent: 'center',
    },

    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryName: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13.5, color: '#334155' },
    summaryQty: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12.5, color: '#64748B' },
    summaryPrice: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13.5, color: '#0F172A', minWidth: 56, textAlign: 'right' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
    totalLabel: { flex: 1, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14.5, color: '#0F172A' },
    totalValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15.5, color: '#0F172A' },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        marginTop: 6,
    },
    addressText: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: '#334155' },

    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FCA5A5',
        backgroundColor: '#FFF5F5',
    },
    cancelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#EF4444' },
    primaryBtn: {
        alignSelf: 'center',
        marginTop: 8,
        backgroundColor: '#00A859',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 13,
    },
    primaryBtnText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: '#FFFFFF' },
});
