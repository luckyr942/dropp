import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Type } from '../../theme/sellerTheme.js';
import { Button, Chip, EmptyState, ErrorState, LoadingState, ScreenHeader, StatusBadge, useToast } from '../../components/ui.jsx';
import { formatCurrency, shortOrderId, timeAgo } from '../../utils/format.js';
import * as sellerApi from '../../api/sellerApi.js';

const FILTERS = [
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
];

const ONGOING = ['confirmed', 'accepted', 'driver_assigned', 'preparing', 'ready_for_pickup', 'out_for_delivery'];

const REJECT = { status: 'cancelled', label: 'Reject', variant: 'danger', confirm: true };
const CANCEL = { status: 'cancelled', label: 'Cancel order', variant: 'danger', confirm: true };

// Seller actions per current status (server validates every transition)
const ACTIONS = {
    confirmed: [{ status: 'accepted', label: 'Accept', variant: 'primary', icon: 'checkmark' }, REJECT],
    accepted: [{ status: 'preparing', label: 'Start preparing', variant: 'primary', icon: 'flame-outline' }, CANCEL],
    driver_assigned: [{ status: 'preparing', label: 'Start preparing', variant: 'primary', icon: 'flame-outline' }, CANCEL],
    preparing: [{ status: 'ready_for_pickup', label: 'Ready for pickup', variant: 'success', icon: 'bicycle-outline' }, CANCEL],
};

const EMPTY_COPY = {
    ongoing: { icon: 'receipt-outline', title: 'No active orders', message: 'New orders appear here instantly while your store is open.' },
    completed: { icon: 'checkmark-done-outline', title: 'No completed orders yet', message: 'Delivered orders will show up here.' },
    cancelled: { icon: 'close-circle-outline', title: 'No cancelled orders', message: 'Rejected or cancelled orders will show up here.' },
};

export default function OrdersTab({ merchantId, liveTick, onOrdersChanged }) {
    const toast = useToast();
    const [filter, setFilter] = useState('ongoing');
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState({}); // orderId → status being applied
    const [selectedId, setSelectedId] = useState(null);
    const requestSeq = useRef(0);

    const load = useCallback(
        async ({ mode = 'initial' } = {}) => {
            const seq = ++requestSeq.current;
            if (mode === 'initial') setLoading(true);
            if (mode === 'pull') setRefreshing(true);
            try {
                const data = await sellerApi.fetchOrders(merchantId, filter);
                if (seq !== requestSeq.current) return; // a newer request (e.g. filter change) won
                setOrders(data.items);
                setCounts(data.counts);
                setError('');
            } catch (err) {
                if (seq !== requestSeq.current) return;
                if (mode === 'initial') setError(err.message);
                else toast.show(err.message, 'error');
            } finally {
                if (seq === requestSeq.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [merchantId, filter, toast]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Live socket events → silent refetch
    const firstTick = useRef(liveTick);
    useEffect(() => {
        if (liveTick !== firstTick.current) load({ mode: 'silent' });
    }, [liveTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyStatus = async (order, action) => {
        const run = async () => {
            setPending((p) => ({ ...p, [order._id]: action.status }));
            try {
                const updated = await sellerApi.updateOrderStatus(merchantId, order._id, action.status);
                const stillHere = filter === 'ongoing' ? ONGOING.includes(updated.status) : false;
                setOrders((list) =>
                    stillHere ? list.map((o) => (o._id === updated._id ? updated : o)) : list.filter((o) => o._id !== updated._id)
                );
                if (!stillHere && selectedId === order._id) setSelectedId(null);
                toast.show(`${shortOrderId(order._id)} · ${successCopy(action.status)}`, 'success');
                onOrdersChanged?.();
                load({ mode: 'silent' }); // refresh bucket counts
            } catch (err) {
                toast.show(err.message, 'error');
                if (err.status === 409 || err.status === 404) load({ mode: 'silent' });
            } finally {
                setPending((p) => {
                    const { [order._id]: _drop, ...rest } = p;
                    return rest;
                });
            }
        };

        if (action.confirm) {
            Alert.alert(
                action.label,
                `${action.label} ${shortOrderId(order._id)}? The customer will be notified.`,
                [
                    { text: 'Keep order', style: 'cancel' },
                    { text: action.label, style: 'destructive', onPress: run },
                ]
            );
        } else {
            run();
        }
    };

    const selected = orders.find((o) => o._id === selectedId) || null;

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.headerWrap}>
                <ScreenHeader title="Orders" subtitle="Accept, prepare and hand over orders" />
                <View style={styles.filters}>
                    {FILTERS.map((f) => (
                        <Chip
                            key={f.id}
                            label={f.label}
                            selected={filter === f.id}
                            count={counts ? counts[f.id] ?? 0 : undefined}
                            onPress={() => setFilter(f.id)}
                        />
                    ))}
                </View>
            </View>

            {loading ? (
                <LoadingState label="Loading orders…" />
            ) : error ? (
                <ErrorState message={error} onRetry={() => load()} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(o) => o._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ mode: 'pull' })} tintColor={Colors.primary} />}
                    ListEmptyComponent={<EmptyState {...EMPTY_COPY[filter]} />}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            pendingStatus={pending[item._id]}
                            onOpen={() => setSelectedId(item._id)}
                            onAction={(a) => applyStatus(item, a)}
                        />
                    )}
                />
            )}

            <OrderDetailSheet
                order={selected}
                pendingStatus={selected ? pending[selected._id] : null}
                onClose={() => setSelectedId(null)}
                onAction={(a) => selected && applyStatus(selected, a)}
            />
        </View>
    );
}

function successCopy(status) {
    switch (status) {
        case 'accepted':
            return 'accepted';
        case 'preparing':
            return 'preparing';
        case 'ready_for_pickup':
            return 'ready for pickup';
        case 'cancelled':
            return 'cancelled';
        default:
            return status;
    }
}

function itemsSummary(items) {
    const count = items.reduce((n, i) => n + (i.quantity || 0), 0);
    return `${count} item${count === 1 ? '' : 's'}`;
}

function OrderCard({ order, pendingStatus, onOpen, onAction }) {
    const actions = ACTIONS[order.status] || [];
    const primary = actions.filter((a) => a.variant !== 'danger');
    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onOpen} style={[styles.card, Shadows.card, order.status === 'confirmed' && styles.cardNew]}>
            <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>{shortOrderId(order._id)}</Text>
                    <Text style={styles.orderMeta}>
                        {itemsSummary(order.items)} · {formatCurrency(order.totalAmount)} · {timeAgo(order.createdAt || order.confirmedAt)}
                    </Text>
                </View>
                <StatusBadge status={order.status} />
            </View>
            <Text style={styles.itemsPreview} numberOfLines={2}>
                {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </Text>
            {primary.length ? (
                <View style={styles.cardActions}>
                    {order.status === 'confirmed' ? (
                        <Button
                            title="Reject"
                            variant="danger"
                            compact
                            style={{ flex: 1 }}
                            loading={pendingStatus === 'cancelled'}
                            disabled={Boolean(pendingStatus)}
                            onPress={() => onAction(REJECT)}
                        />
                    ) : null}
                    {primary.map((a) => (
                        <Button
                            key={a.status}
                            title={a.label}
                            icon={a.icon}
                            variant={a.variant}
                            compact
                            style={{ flex: order.status === 'confirmed' ? 1.4 : 1 }}
                            loading={pendingStatus === a.status}
                            disabled={Boolean(pendingStatus)}
                            onPress={() => onAction(a)}
                        />
                    ))}
                </View>
            ) : order.status === 'ready_for_pickup' ? (
                <View style={styles.waitingRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.waitingText}>Waiting for the delivery partner to pick up</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}

function OrderDetailSheet({ order, pendingStatus, onClose, onAction }) {
    const actions = order ? ACTIONS[order.status] || [] : [];
    const driverPhone = order?.driver?.phone;
    const addr = order?.deliveryAddress || {};
    const addressText = [addr.street, addr.city, addr.pincode].filter(Boolean).join(', ');

    const callDriver = async () => {
        const url = `tel:${driverPhone}`;
        try {
            if (await Linking.canOpenURL(url)) await Linking.openURL(url);
            else Alert.alert('Cannot place call', `Calling is not supported on this device. Driver: ${driverPhone}`);
        } catch (err) {
            Alert.alert('Cannot place call', err.message);
        }
    };

    return (
        <Modal visible={Boolean(order)} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                {order ? (
                    <View style={styles.sheet}>
                        <View style={styles.grabber} />
                        <View style={styles.sheetHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetTitle}>Order {shortOrderId(order._id)}</Text>
                                <Text style={styles.orderMeta}>
                                    {timeAgo(order.createdAt || order.confirmedAt)} · {order.paymentMethod === 'cash_on_delivery' ? 'Cash on delivery' : order.paymentMethod}
                                </Text>
                            </View>
                            <StatusBadge status={order.status} />
                            <TouchableOpacity onPress={onClose} hitSlop={10} style={{ marginLeft: Spacing.md }}>
                                <Ionicons name="close" size={22} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.blockLabel}>Items</Text>
                            {order.items.map((it, i) => (
                                <View key={`${it.name}-${i}`} style={styles.itemRow}>
                                    <Text style={styles.itemQty}>{it.quantity}×</Text>
                                    <Text style={styles.itemName}>{it.name}</Text>
                                    <Text style={styles.itemPrice}>{formatCurrency(it.totalPrice ?? it.unitPrice * it.quantity)}</Text>
                                </View>
                            ))}
                            <View style={styles.divider} />
                            <SummaryLine label="Subtotal" value={formatCurrency(order.subtotal)} />
                            <SummaryLine label="Delivery fee" value={formatCurrency(order.deliveryFee)} />
                            <SummaryLine label="Total" value={formatCurrency(order.totalAmount)} bold />

                            {addressText ? (
                                <>
                                    <Text style={styles.blockLabel}>Deliver to</Text>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                                        <Text style={styles.infoText}>{addressText}</Text>
                                    </View>
                                </>
                            ) : null}

                            {order.notes ? (
                                <>
                                    <Text style={styles.blockLabel}>Notes</Text>
                                    <Text style={styles.infoText}>{order.notes}</Text>
                                </>
                            ) : null}

                            {order.driver ? (
                                <>
                                    <Text style={styles.blockLabel}>Delivery partner</Text>
                                    <View style={styles.driverBox}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.driverName}>{order.driver.name || 'Assigned driver'}</Text>
                                            {order.driver.vehicle ? <Text style={styles.orderMeta}>{order.driver.vehicle}</Text> : null}
                                        </View>
                                        {driverPhone ? (
                                            <TouchableOpacity style={styles.callCircle} onPress={callDriver} accessibilityLabel="Call delivery partner">
                                                <Ionicons name="call" size={16} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </>
                            ) : null}
                        </ScrollView>

                        {actions.length ? (
                            <View style={styles.sheetActions}>
                                {actions.map((a) => (
                                    <Button
                                        key={a.status}
                                        title={a.label}
                                        icon={a.icon}
                                        variant={a.variant}
                                        style={{ flex: a.variant === 'danger' ? 1 : 1.4 }}
                                        loading={pendingStatus === a.status}
                                        disabled={Boolean(pendingStatus)}
                                        onPress={() => onAction(a)}
                                    />
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>
        </Modal>
    );
}

function SummaryLine({ label, value, bold }) {
    return (
        <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>{label}</Text>
            <Text style={[styles.summaryValue, bold && styles.summaryBold]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrap: { paddingHorizontal: Spacing.xl },
    filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: 40, flexGrow: 1 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    cardNew: { borderColor: Colors.primaryBorder, borderLeftWidth: 4, borderLeftColor: Colors.primary },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    orderId: { ...Type.heading, fontSize: 16 },
    orderMeta: { ...Type.caption, marginTop: 3 },
    itemsPreview: { ...Type.body, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
    cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
    waitingText: { ...Type.caption },
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Radius.xl + 4,
        borderTopRightRadius: Radius.xl + 4,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 36,
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginVertical: Spacing.sm },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    sheetTitle: { ...Type.heading, fontSize: 19 },
    blockLabel: { ...Type.label, marginTop: Spacing.lg, marginBottom: Spacing.sm, textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: Spacing.sm },
    itemQty: { width: 28, fontSize: 14, fontWeight: '700', color: Colors.primary },
    itemName: { flex: 1, ...Type.body },
    itemPrice: { ...Type.body, fontWeight: '700' },
    divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
    summaryLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    summaryLabel: { ...Type.caption, fontSize: 14 },
    summaryValue: { ...Type.body },
    summaryBold: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
    infoRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    infoText: { ...Type.body, flex: 1, lineHeight: 20 },
    driverBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceSubtle,
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
    driverName: { ...Type.body, fontWeight: '700' },
    callCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
});
