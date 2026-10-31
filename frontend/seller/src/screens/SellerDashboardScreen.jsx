import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/sellerTheme.js';
import { useToast } from '../components/ui.jsx';
import { useMerchantSocket } from '../hooks/useMerchantSocket.js';
import { shortOrderId, formatCurrency } from '../utils/format.js';
import * as sellerApi from '../api/sellerApi.js';
import HomeTab from './tabs/HomeTab.jsx';
import OrdersTab from './tabs/OrdersTab.jsx';
import ProductsTab from './tabs/ProductsTab.jsx';
import AnalyticsTab from './tabs/AnalyticsTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';
import SellerVoiceAssistant, { VoiceFab } from '../components/voice/SellerVoiceAssistant.jsx';

const TABS = [
    { id: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
    { id: 'Products', icon: 'grid-outline', activeIcon: 'grid' },
    { id: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
    { id: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function SellerDashboardScreen({ store: initialStore, user, onStoreUpdated, onLogout }) {
    const toast = useToast();
    const merchantId = initialStore._id;
    const [store, setStore] = useState(initialStore);
    const [activeTab, setActiveTab] = useState('Home');
    const [overview, setOverview] = useState(null);
    const [dashLoading, setDashLoading] = useState(true);
    const [dashRefreshing, setDashRefreshing] = useState(false);
    const [dashError, setDashError] = useState('');
    const [liveTick, setLiveTick] = useState(0); // bumps on live order events → tabs refetch silently
    const [newOrderCount, setNewOrderCount] = useState(0);
    const [addProductRequest, setAddProductRequest] = useState(0);
    const [voiceOpen, setVoiceOpen] = useState(false);
    const [voiceActions, setVoiceActions] = useState([]); // what Aura changed during this sheet session
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    const applyStore = useCallback(
        (next) => {
            if (!next) return;
            setStore(next);
            onStoreUpdated?.(next);
        },
        [onStoreUpdated]
    );

    const loadDashboard = useCallback(
        async ({ silent = false, pull = false } = {}) => {
            if (pull) setDashRefreshing(true);
            else if (!silent) setDashLoading(true);
            try {
                const data = await sellerApi.fetchDashboard(merchantId);
                setOverview(data.overview);
                applyStore(data.merchant);
                setDashError('');
            } catch (err) {
                if (!silent) setDashError(err.message);
                else if (pull) toast.show(err.message, 'error');
            } finally {
                setDashLoading(false);
                setDashRefreshing(false);
            }
        },
        [merchantId, applyStore, toast]
    );

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Debounce bursts of socket events into one refetch
    const refetchTimer = useRef(null);
    const scheduleLiveRefresh = useCallback(() => {
        clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => {
            setLiveTick((t) => t + 1);
            loadDashboard({ silent: true });
        }, 300);
    }, [loadDashboard]);
    useEffect(() => () => clearTimeout(refetchTimer.current), []);

    const liveStatus = useMerchantSocket(merchantId, (msg) => {
        if (msg.type === 'merchant.new_order') {
            toast.show(
                `New order ${shortOrderId(msg.data.orderId)} · ${formatCurrency(msg.data.totalAmount)}`,
                'success'
            );
            if (activeTabRef.current !== 'Orders') setNewOrderCount((n) => n + 1);
        }
        if (msg.type === 'merchant.voice_action' && msg.data?.message) {
            setVoiceActions((list) => [msg.data, ...list].slice(0, 20));
            toast.show(msg.data.message, 'success');
        }
        if (msg.type === 'merchant.store_updated' && msg.data) {
            setStore((prev) => ({ ...prev, isOpen: msg.data.isOpen, settings: { ...prev.settings, ...msg.data.settings } }));
        }
        scheduleLiveRefresh();
    });

    const goTo = (tab) => {
        if (tab === 'Orders') setNewOrderCount(0);
        setActiveTab(tab);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={{ flex: 1 }}>
                {activeTab === 'Home' && (
                    <HomeTab
                        store={store}
                        overview={overview}
                        loading={dashLoading}
                        error={dashError}
                        refreshing={dashRefreshing}
                        liveStatus={liveStatus}
                        onRefresh={() => loadDashboard({ pull: true })}
                        onRetry={() => loadDashboard()}
                        onNavigate={goTo}
                        onAddProduct={() => {
                            setAddProductRequest((n) => n + 1);
                            goTo('Products');
                        }}
                    />
                )}
                {activeTab === 'Orders' && (
                    <OrdersTab merchantId={merchantId} liveTick={liveTick} liveStatus={liveStatus} onOrdersChanged={() => loadDashboard({ silent: true })} />
                )}
                {activeTab === 'Products' && (
                    <ProductsTab
                        merchantId={merchantId}
                        storeCategory={store.category}
                        addProductRequest={addProductRequest}
                        liveTick={liveTick}
                        onCatalogueChanged={() => loadDashboard({ silent: true })}
                    />
                )}
                {activeTab === 'Analytics' && <AnalyticsTab merchantId={merchantId} liveTick={liveTick} />}
                {activeTab === 'Settings' && (
                    <SettingsTab store={store} user={user} onStoreUpdated={applyStore} onLogout={onLogout} />
                )}
            </View>

            <VoiceFab onPress={() => { setVoiceActions([]); setVoiceOpen(true); }} active={voiceOpen} />
            <SellerVoiceAssistant
                visible={voiceOpen}
                onClose={() => setVoiceOpen(false)}
                merchantId={merchantId}
                storeName={store.name}
                sellerName={user?.name}
                actions={voiceActions}
            />

            <View style={styles.bottomNav}>
                {TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    const badge = tab.id === 'Orders' && newOrderCount > 0 ? newOrderCount : 0;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.navTab}
                            onPress={() => goTo(tab.id)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                        >
                            <View>
                                <Ionicons
                                    name={active ? tab.activeIcon : tab.icon}
                                    size={22}
                                    color={active ? Colors.primary : Colors.textMuted}
                                />
                                {badge ? (
                                    <View style={styles.navBadge}>
                                        <Text style={styles.navBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.id}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 8,
        paddingBottom: 26,
    },
    navTab: { flex: 1, alignItems: 'center', gap: 3 },
    navLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    navLabelActive: { color: Colors.primary },
    navBadge: {
        position: 'absolute',
        top: -4,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: Colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    navBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
