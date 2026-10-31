import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Type } from '../../theme/sellerTheme.js';
import { Card, Chip, ErrorState, LoadingState, ScreenHeader, SectionHeader, useToast } from '../../components/ui.jsx';
import { formatCurrency, weekdayLabel } from '../../utils/format.js';
import * as sellerApi from '../../api/sellerApi.js';

const RANGES = [7, 14, 30];
const CHART_HEIGHT = 140;

export default function AnalyticsTab({ merchantId, liveTick }) {
    const toast = useToast();
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(
        async (mode = 'initial') => {
            if (mode === 'initial') setLoading(true);
            if (mode === 'pull') setRefreshing(true);
            try {
                setData(await sellerApi.fetchAnalytics(merchantId, days));
                setError('');
            } catch (err) {
                if (mode === 'initial') setError(err.message);
                else toast.show(err.message, 'error');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [merchantId, days, toast]
    );

    useEffect(() => {
        load();
    }, [load]);

    const firstTick = useRef(liveTick);
    useEffect(() => {
        if (liveTick !== firstTick.current) load('silent');
    }, [liveTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const t = data?.totals;

    return (
        <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('pull')} tintColor={Colors.primary} />}
        >
            <ScreenHeader title="Analytics" subtitle={`Last ${days} days · IST`} />
            <View style={styles.ranges}>
                {RANGES.map((r) => (
                    <Chip key={r} label={`${r} days`} selected={days === r} onPress={() => setDays(r)} />
                ))}
            </View>

            {loading ? (
                <LoadingState label="Crunching numbers…" />
            ) : error ? (
                <ErrorState message={error} onRetry={() => load()} />
            ) : (
                <>
                    <View style={styles.grid}>
                        <Metric label="Revenue" value={formatCurrency(t.revenue)} hint="Delivered orders" tint={Colors.success} />
                        <Metric label="Orders" value={String(t.orders)} hint="Placed, not cancelled" tint={Colors.primary} />
                        <Metric label="Order value" value={formatCurrency(t.bookedValue)} hint="Incl. in-progress" tint="#8B5CF6" />
                        <Metric label="Avg. order" value={formatCurrency(t.avgOrderValue)} hint={`${t.cancelled} cancelled`} tint={Colors.warning} />
                    </View>

                    <SectionHeader title="Orders per day" />
                    <BarChart series={data.series} valueKey="orders" color={Colors.primary} format={(v) => String(v)} />

                    <SectionHeader title="Revenue per day" />
                    <BarChart series={data.series} valueKey="revenue" color={Colors.success} format={formatCurrency} />

                    <Text style={styles.footnote}>
                        Revenue counts delivered orders only. Orders excludes drafts and cancelled orders.
                    </Text>
                </>
            )}
        </ScrollView>
    );
}

function Metric({ label, value, hint, tint }) {
    return (
        <View style={[styles.metric, Shadows.card]}>
            <View style={[styles.metricBar, { backgroundColor: tint }]} />
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricHint}>{hint}</Text>
        </View>
    );
}

function BarChart({ series, valueKey, color, format }) {
    const max = Math.max(0, ...series.map((d) => d[valueKey] || 0));
    const dense = series.length > 10;
    const peak = series.reduce((best, d) => ((d[valueKey] || 0) > (best?.[valueKey] || 0) ? d : best), null);

    return (
        <Card>
            {max === 0 ? (
                <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>No data in this period yet</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.chartPeak}>
                        Best day: {format(peak[valueKey])} on {weekdayLabel(peak.date)} {peak.date.slice(8, 10)}
                    </Text>
                    <View style={styles.chart}>
                        {series.map((d, i) => {
                            const v = d[valueKey] || 0;
                            const h = max ? Math.max(v > 0 ? 4 : 2, Math.round((v / max) * CHART_HEIGHT)) : 2;
                            const showLabel = !dense || i % Math.ceil(series.length / 7) === 0 || i === series.length - 1;
                            return (
                                <View key={d.date} style={styles.barCol}>
                                    {!dense && v > 0 ? <Text style={styles.barValue}>{valueKey === 'orders' ? v : ''}</Text> : null}
                                    <View style={[styles.bar, { height: h, backgroundColor: v > 0 ? color : Colors.border }]} />
                                    <Text style={styles.barLabel}>{showLabel ? (dense ? d.date.slice(8, 10) : weekdayLabel(d.date)) : ''}</Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    ranges: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md, marginTop: Spacing.sm },
    metric: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        overflow: 'hidden',
    },
    metricBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    metricValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    metricLabel: { ...Type.body, fontWeight: '700', marginTop: 4 },
    metricHint: { ...Type.caption, fontSize: 11, marginTop: 2 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 40, gap: 4 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    bar: { width: '70%', maxWidth: 28, borderRadius: 6 },
    barValue: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 3 },
    barLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, marginTop: 6, height: 14 },
    chartPeak: { ...Type.caption, marginBottom: Spacing.md },
    chartEmpty: { height: 100, alignItems: 'center', justifyContent: 'center' },
    chartEmptyText: { ...Type.caption },
    footnote: { ...Type.caption, fontSize: 11, marginTop: Spacing.lg, lineHeight: 16 },
});
