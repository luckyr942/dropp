import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Type } from '../../theme/sellerTheme.js';
import { Card, ErrorState, LoadingState, SectionHeader } from '../../components/ui.jsx';
import { formatAddress, formatCurrency, formatTime24 } from '../../utils/format.js';

const LIVE_META = {
    live: { label: 'Live updates on', color: Colors.success },
    connecting: { label: 'Connecting…', color: Colors.warning },
    offline: { label: 'Live updates offline', color: Colors.textMuted },
};

export default function HomeTab({
    store,
    overview,
    loading,
    error,
    refreshing,
    liveStatus,
    onRefresh,
    onRetry,
    onNavigate,
    onAddProduct,
}) {
    const isOnline = Boolean(store.isOpen) && store.settings?.acceptingOrders !== false;
    const statusLabel = !store.isOpen ? 'Closed' : store.settings?.acceptingOrders === false ? 'Paused' : 'Online';
    const live = LIVE_META[liveStatus] || LIVE_META.offline;
    const o = overview || {};

    return (
        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>Dropp Seller</Text>
                    <Text style={styles.storeName} numberOfLines={1}>
                        {store.name}
                    </Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.statusPill, { backgroundColor: isOnline ? Colors.successLight : Colors.surfaceSubtle }]}>
                            <View style={[styles.dot, { backgroundColor: isOnline ? Colors.success : Colors.textMuted }]} />
                            <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.textSecondary }]}>{statusLabel}</Text>
                        </View>
                        <Text style={styles.hours}>
                            {formatTime24(store.openTime)} – {formatTime24(store.closeTime)}
                        </Text>
                    </View>
                    {formatAddress(store.address) ? (
                        <Text style={styles.address} numberOfLines={1}>
                            {formatAddress(store.address)}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View style={styles.liveRow}>
                <View style={[styles.liveDot, { backgroundColor: live.color }]} />
                <Text style={styles.liveText}>{live.label}</Text>
            </View>

            {loading && !overview ? (
                <LoadingState label="Loading today's numbers…" />
            ) : error && !overview ? (
                <ErrorState message={error} onRetry={onRetry} />
            ) : (
                <>
                    <SectionHeader title="Today" />
                    <View style={styles.statsRow}>
                        <StatCard label="Orders" value={String(o.ordersToday ?? 0)} icon="receipt-outline" tint={Colors.primary} />
                        <StatCard label="Revenue" value={formatCurrency(o.revenueToday ?? 0)} icon="cash-outline" tint={Colors.success} hint="Delivered" />
                        <StatCard
                            label="Rating"
                            value={o.rating != null ? `${Number(o.rating).toFixed(1)}★` : 'New'}
                            icon="star-outline"
                            tint={Colors.warning}
                            hint={o.ratingCount ? `${o.ratingCount} reviews` : 'No reviews yet'}
                        />
                    </View>

                    <TouchableOpacity activeOpacity={0.85} onPress={() => onNavigate('Orders')}>
                        <Card style={styles.activeCard}>
                            <View style={styles.activeIcon}>
                                <Ionicons name="flash" size={20} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.activeValue}>{o.activeOrders ?? 0} active orders</Text>
                                <Text style={styles.activeSub}>
                                    {(o.activeOrders ?? 0) > 0 ? 'Tap to accept and prepare them' : 'New orders will appear here instantly'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                        </Card>
                    </TouchableOpacity>

                    <SectionHeader title="Inventory" action="Manage" onAction={() => onNavigate('Products')} />
                    <View style={styles.statsRow}>
                        <StatCard label="Products" value={String(o.totalProducts ?? 0)} icon="cube-outline" tint={Colors.primary} />
                        <StatCard
                            label="Low stock"
                            value={String(o.lowStockCount ?? 0)}
                            icon="alert-circle-outline"
                            tint={Colors.warning}
                            highlight={(o.lowStockCount ?? 0) > 0}
                        />
                        <StatCard
                            label="Out of stock"
                            value={String(o.outOfStockCount ?? 0)}
                            icon="close-circle-outline"
                            tint={Colors.danger}
                            highlight={(o.outOfStockCount ?? 0) > 0}
                        />
                    </View>
                </>
            )}

            <SectionHeader title="Quick actions" />
            <View style={styles.actionsGrid}>
                {[
                    { label: 'Add product', icon: 'add-circle-outline', color: Colors.primary, onPress: onAddProduct },
                    { label: 'View orders', icon: 'receipt-outline', color: '#EC4899', onPress: () => onNavigate('Orders') },
                    { label: 'Catalogue', icon: 'grid-outline', color: '#10B981', onPress: () => onNavigate('Products') },
                    { label: 'Analytics', icon: 'stats-chart-outline', color: '#8B5CF6', onPress: () => onNavigate('Analytics') },
                ].map((a) => (
                    <TouchableOpacity key={a.label} style={[styles.actionCard, Shadows.card]} activeOpacity={0.85} onPress={a.onPress}>
                        <Ionicons name={a.icon} size={24} color={a.color} />
                        <Text style={styles.actionLabel}>{a.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

function StatCard({ label, value, icon, tint, hint, highlight }) {
    return (
        <View style={[styles.statCard, Shadows.card, highlight && { borderColor: tint }]}>
            <Ionicons name={icon} size={18} color={tint} />
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
            <Text style={styles.statLabel}>{label}</Text>
            {hint ? <Text style={styles.statHint} numberOfLines={1}>{hint}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: Spacing.md },
    eyebrow: { fontSize: 12, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
    storeName: { ...Type.title, marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '700' },
    hours: { ...Type.caption },
    address: { ...Type.caption, marginTop: 6 },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    statsRow: { flexDirection: 'row', gap: Spacing.md },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        minHeight: 108,
    },
    statValue: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm },
    statLabel: { ...Type.caption, fontWeight: '600', marginTop: 2 },
    statHint: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
    activeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
    activeIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeValue: { ...Type.heading, fontSize: 15 },
    activeSub: { ...Type.caption, marginTop: 2 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
    actionCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        gap: Spacing.sm,
    },
    actionLabel: { ...Type.body, fontWeight: '700' },
});
