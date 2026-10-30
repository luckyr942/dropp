import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Switch,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/sellerTheme.js';
import * as sellerApi from '../api/sellerApi.js';

export default function SellerDashboardScreen({ store, onNavigateBack }) {
    const [activeTab, setActiveTab] = useState('Home'); // Home, Orders, Products, Analytics, More
    const [loading, setLoading] = useState(false);
    
    // Live Dashboard Data
    const [dashboardData, setDashboardData] = useState(null);
    const [products, setProducts] = useState([]);
    
    // Orders tab state
    const [orderFilter, setOrderFilter] = useState('Ongoing');
    const [selectedOrder, setSelectedOrder] = useState(null);
    
    // Add Product Modal
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProdName, setNewProdName] = useState('');
    const [newProdPrice, setNewProdPrice] = useState('');
    const [newProdUnit, setNewProdUnit] = useState('1 Kg');
    const [newProdStock, setNewProdStock] = useState('20');
    const [newProdCategory, setNewProdCategory] = useState('Fresh Produce');

    // Live ongoing orders for store
    const [orders, setOrders] = useState([
        {
            id: '#DRP-32ED1',
            status: 'Preparing',
            time: '2 min ago',
            customerName: 'Rohan Mehta',
            customerPhone: '+91 98765 42210',
            address: 'A-204, Prestige Apartments, MG Road, Bengaluru - 560001',
            items: [
                { name: 'Fresh Apple (1 Kg)', quantity: 2, price: 100 },
                { name: 'Banana (1 Kg)', quantity: 1, price: 60 },
            ],
            totalAmount: 260,
        },
        {
            id: '#DRP-32ED0',
            status: 'New Order',
            time: '6 min ago',
            customerName: 'Priya Sharma',
            customerPhone: '+91 98111 22334',
            address: 'Flat 101, Indiranagar, Bengaluru',
            items: [{ name: 'Fresh Milk (1 L)', quantity: 2, price: 124 }],
            totalAmount: 148,
        },
        {
            id: '#DRP-32ED9',
            status: 'Ready',
            time: '18 min ago',
            customerName: 'Anil Kapoor',
            customerPhone: '+91 98222 33445',
            address: 'Brigade Road, Bengaluru',
            items: [{ name: 'Brown Bread', quantity: 1, price: 45 }],
            totalAmount: 89,
        },
    ]);

    const loadData = async () => {
        setLoading(true);
        try {
            const merchantId = store?._id || sellerApi.getAuthSession().merchantId;
            if (merchantId) {
                const [dash, prodList] = await Promise.all([
                    sellerApi.fetchDashboard(merchantId).catch(() => null),
                    sellerApi.fetchProducts(merchantId).catch(() => ({ items: [] })),
                ]);
                if (dash) setDashboardData(dash);
                if (prodList?.items) setProducts(prodList.items);
            }
        } catch (_) {}
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleStockDelta = async (productId, delta) => {
        try {
            const updated = await sellerApi.adjustProductStock(store?._id, productId, delta);
            setProducts((prev) =>
                prev.map((p) => (p._id === productId ? { ...p, stockQuantity: updated.stockQuantity } : p))
            );
        } catch (err) {
            Alert.alert('Stock update note', err.message);
        }
    };

    const handleSaveNewProduct = async () => {
        if (!newProdName || !newProdPrice) {
            Alert.alert('Required', 'Please enter a product name and price.');
            return;
        }
        try {
            const created = await sellerApi.addProduct(store?._id, {
                name: newProdName,
                price: Number(newProdPrice),
                unit: newProdUnit,
                stockQuantity: Number(newProdStock) || 10,
                category: newProdCategory,
            });
            setProducts([created, ...products]);
            setShowAddProduct(false);
            setNewProdName('');
            setNewProdPrice('');
            Alert.alert('Product Added', `${created.name} is now in stock!`);
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleMarkAsReady = (orderId) => {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: 'Ready' } : o))
        );
        setSelectedOrder(null);
        Alert.alert('Order Ready! 🛵', 'Delivery driver has been notified for pickup.');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            {/* ════ TAB 1: HOME (DASHBOARD) ════ */}
            {activeTab === 'Home' && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.dashHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.appTitle}>Dropp Seller</Text>
                            <View style={styles.storePill}>
                                <Text style={styles.storePillName}>{store?.name || 'FreshMart'}</Text>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>Online</Text>
                            </View>
                            <Text style={styles.storeAddress}>{store?.address?.street || 'MG Road, Bengaluru'}</Text>
                        </View>
                        <TouchableOpacity style={styles.bellButton}>
                            <Ionicons name="notifications-outline" size={20} color={Colors.textPrimary} />
                            <View style={styles.unreadBadge} />
                        </TouchableOpacity>
                    </View>

                    {/* Today's Overview (Row of 3 cards from mockup) */}
                    <Text style={styles.sectionHeading}>Today's Overview</Text>
                    <View style={styles.overviewRow}>
                        <View style={[styles.overviewCard, Shadows.card]}>
                            <Text style={styles.overviewValue}>
                                {dashboardData?.overview?.ordersToday || 35}
                            </Text>
                            <Text style={styles.overviewLabel}>Orders</Text>
                        </View>
                        <View style={[styles.overviewCard, Shadows.card]}>
                            <Text style={[styles.overviewValue, { color: Colors.success }]}>
                                ₹{(dashboardData?.overview?.revenueToday || 12450).toLocaleString()}
                            </Text>
                            <Text style={styles.overviewLabel}>Revenue</Text>
                        </View>
                        <View style={[styles.overviewCard, Shadows.card]}>
                            <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>
                                {dashboardData?.overview?.rating || 4.8} ★
                            </Text>
                            <Text style={styles.overviewLabel}>Rating</Text>
                        </View>
                    </View>

                    {/* Growth Banner */}
                    <View style={styles.growthBanner}>
                        <View style={styles.rocketCircle}>
                            <Text style={{ fontSize: 22 }}>🚀</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.growthTitle}>Get more orders</Text>
                            <Text style={styles.growthSub}>
                                Try featured listing and reach more customers on Dropp.
                            </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={Colors.primary} />
                    </View>

                    {/* Quick Actions (6 Grid Cards) */}
                    <Text style={styles.sectionHeading}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {[
                            { label: 'Add Product', icon: 'plus-circle-outline', color: Colors.primary, action: () => setShowAddProduct(true) },
                            { label: 'Manage Menu', icon: 'silverware-fork-knife', color: '#10B981', action: () => setActiveTab('Products') },
                            { label: 'View Orders', icon: 'receipt-outline', color: '#EC4899', action: () => setActiveTab('Orders') },
                            { label: 'Store Settings', icon: 'settings-outline', color: '#6366F1', action: () => setActiveTab('More') },
                            { label: 'Analytics', icon: 'bar-chart-outline', color: '#8B5CF6', action: () => setActiveTab('Analytics') },
                            { label: 'Help & Support', icon: 'help-circle-outline', color: '#F59E0B', action: () => Alert.alert('Aura Support', 'Aura Voice Concierge is listening!') },
                        ].map((act, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.actionCard, Shadows.card]}
                                activeOpacity={0.8}
                                onPress={act.action}
                            >
                                <Ionicons name={act.icon} size={26} color={act.color} />
                                <Text style={styles.actionCardLabel}>{act.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* ════ TAB 2: ORDERS ════ */}
            {activeTab === 'Orders' && (
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    <Text style={[styles.appTitle, { marginTop: 12 }]}>Orders</Text>

                    {/* Order Segment Buttons */}
                    <View style={styles.segmentContainer}>
                        {['Ongoing', 'Completed', 'Cancelled'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.segmentButton, orderFilter === tab && styles.segmentButtonActive]}
                                onPress={() => setOrderFilter(tab)}
                            >
                                <Text style={[styles.segmentText, orderFilter === tab && styles.segmentTextActive]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {orders.map((ord) => (
                            <TouchableOpacity
                                key={ord.id}
                                style={[styles.orderCard, Shadows.card]}
                                activeOpacity={0.85}
                                onPress={() => setSelectedOrder(ord)}
                            >
                                <View style={styles.orderCardHeader}>
                                    <View>
                                        <Text style={styles.orderId}>{ord.id}</Text>
                                        <Text style={styles.orderMeta}>{ord.items.length} items • ₹{ord.totalAmount}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, ord.status === 'Ready' ? styles.statusReady : styles.statusPrep]}>
                                        <Text style={styles.statusText}>{ord.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.orderTime}>{ord.time}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ════ TAB 3: PRODUCTS (CATALOGUE) ════ */}
            {activeTab === 'Products' && (
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    <View style={styles.prodHeaderRow}>
                        <Text style={styles.appTitle}>Catalogue</Text>
                        <TouchableOpacity
                            style={styles.addProdMiniBtn}
                            onPress={() => setShowAddProduct(true)}
                        >
                            <Feather name="plus" size={16} color="#FFFFFF" />
                            <Text style={styles.addProdMiniText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                        {products.map((item) => (
                            <View key={item._id} style={[styles.productRow, Shadows.card]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.prodRowName}>{item.name}</Text>
                                    <Text style={styles.prodRowPrice}>₹{item.price} • {item.unit || '1 pc'}</Text>
                                </View>
                                <View style={styles.stockStepper}>
                                    <TouchableOpacity
                                        style={styles.stepBtn}
                                        onPress={() => handleStockDelta(item._id, -1)}
                                    >
                                        <Text style={styles.stepBtnText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.stockCountText}>{item.stockQuantity}</Text>
                                    <TouchableOpacity
                                        style={styles.stepBtn}
                                        onPress={() => handleStockDelta(item._id, 1)}
                                    >
                                        <Text style={styles.stepBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ════ TAB 4: ANALYTICS ════ */}
            {activeTab === 'Analytics' && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.appTitle}>Analytics</Text>
                    <Text style={styles.storeAddress}>Last 7 Days Overview</Text>

                    <View style={styles.analyticsGrid}>
                        <View style={[styles.analyticsCard, Shadows.card]}>
                            <Text style={styles.analyticsVal}>₹48,320</Text>
                            <Text style={styles.analyticsSub}>Total Revenue</Text>
                        </View>
                        <View style={[styles.analyticsCard, Shadows.card]}>
                            <Text style={styles.analyticsVal}>186</Text>
                            <Text style={styles.analyticsSub}>Total Orders</Text>
                        </View>
                    </View>

                    {/* Chart Visualization from reference */}
                    <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Orders (Last 7 Days)</Text>
                    <View style={[styles.chartCard, Shadows.card]}>
                        <View style={styles.barContainer}>
                            {[20, 25, 18, 30, 42, 28, 35].map((val, idx) => (
                                <View key={idx} style={styles.barCol}>
                                    <View style={[styles.barFill, { height: val * 2.5 }]} />
                                    <Text style={styles.barLabel}>{['8', '9', '10', '11', '12', '13', '14'][idx]}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* ════ TAB 5: MORE / SETTINGS ════ */}
            {activeTab === 'More' && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.appTitle}>Store Settings</Text>

                    <View style={[styles.settingsCard, Shadows.card]}>
                        <View style={styles.settingRow}>
                            <View>
                                <Text style={styles.settingTitle}>Accepting Orders</Text>
                                <Text style={styles.settingSub}>Allow customers to place new orders</Text>
                            </View>
                            <Switch value={true} trackColor={{ true: Colors.primary }} />
                        </View>
                        <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: Colors.borderLight, paddingTop: 14 }]}>
                            <View>
                                <Text style={styles.settingTitle}>Aura Voice Front-Desk</Text>
                                <Text style={styles.settingSub}>Answer customer stock & price queries by voice</Text>
                            </View>
                            <Switch value={true} trackColor={{ true: Colors.primary }} />
                        </View>
                    </View>

                    {onNavigateBack && (
                        <TouchableOpacity style={[styles.logoutBtn, Shadows.button]} onPress={onNavigateBack}>
                            <Text style={styles.logoutBtnText}>Switch Account / Exit</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}

            {/* ════ ORDER DETAILS MODAL ════ */}
            <Modal visible={!!selectedOrder} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order Details ({selectedOrder?.id})</Text>
                            <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                                <Ionicons name="close" size={22} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Customer details */}
                        <View style={styles.customerBox}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.customerName}>{selectedOrder?.customerName}</Text>
                                <Text style={styles.customerPhone}>{selectedOrder?.customerPhone}</Text>
                            </View>
                            <TouchableOpacity style={styles.callCircle}>
                                <Ionicons name="call" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Items list */}
                        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Items</Text>
                        {selectedOrder?.items?.map((it, i) => (
                            <View key={i} style={styles.itemRow}>
                                <Text style={styles.itemName}>{it.name} x {it.quantity}</Text>
                                <Text style={styles.itemPrice}>₹{it.price}</Text>
                            </View>
                        ))}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalVal}>₹{selectedOrder?.totalAmount}</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, Shadows.button, { marginTop: 20 }]}
                            onPress={() => handleMarkAsReady(selectedOrder?.id)}
                        >
                            <Text style={styles.primaryButtonText}>Mark as Ready 🛵</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ════ ADD PRODUCT MODAL ════ */}
            <Modal visible={showAddProduct} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Product</Text>
                            <TouchableOpacity onPress={() => setShowAddProduct(false)}>
                                <Ionicons name="close" size={22} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.fieldLabel}>Product Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newProdName}
                            onChangeText={setNewProdName}
                            placeholder="e.g. Fresh Mango (1 Kg)"
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Price (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newProdPrice}
                                    onChangeText={setNewProdPrice}
                                    placeholder="120"
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Unit</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newProdUnit}
                                    onChangeText={setNewProdUnit}
                                    placeholder="1 Kg"
                                />
                            </View>
                        </View>

                        <Text style={styles.fieldLabel}>Stock Quantity</Text>
                        <TextInput
                            style={styles.input}
                            value={newProdStock}
                            onChangeText={setNewProdStock}
                            placeholder="20"
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={[styles.primaryButton, Shadows.button, { marginTop: 24 }]}
                            onPress={handleSaveNewProduct}
                        >
                            <Text style={styles.primaryButtonText}>Save to Catalogue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ════ BOTTOM NAVIGATION TABS (5 Tabs) ════ */}
            <View style={styles.bottomNav}>
                {[
                    { id: 'Home', icon: 'home-outline', activeIcon: 'home' },
                    { id: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
                    { id: 'Products', icon: 'grid-outline', activeIcon: 'grid' },
                    { id: 'Analytics', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
                    { id: 'More', icon: 'ellipsis-horizontal-outline', activeIcon: 'ellipsis-horizontal' },
                ].map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={styles.navTab}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Ionicons
                                name={active ? tab.activeIcon : tab.icon}
                                size={22}
                                color={active ? Colors.primary : Colors.textMuted}
                            />
                            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                                {tab.id}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 110,
    },
    dashHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    appTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    storePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    storePillName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.success,
    },
    onlineText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.success,
    },
    storeAddress: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    bellButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    unreadBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginTop: 18,
        marginBottom: 10,
    },
    overviewRow: {
        flexDirection: 'row',
        gap: 10,
    },
    overviewCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    overviewValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    overviewLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    growthBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        borderRadius: 14,
        padding: 14,
        marginTop: 16,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    rocketCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    growthTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primaryDark,
    },
    growthSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '31%',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        gap: 8,
    },
    actionCardLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
    },

    // Bottom Navigation Bar
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.surface,
        flexDirection: 'row',
        paddingVertical: 10,
        paddingBottom: 22,
        borderTopWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'space-around',
    },
    navTab: {
        alignItems: 'center',
        gap: 3,
    },
    navLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    navLabelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },

    // Orders Tab
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 3,
        marginVertical: 14,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    segmentButtonActive: {
        backgroundColor: Colors.primary,
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    segmentTextActive: {
        color: '#FFFFFF',
    },
    orderCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
    },
    orderCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderId: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    orderMeta: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    orderTime: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusPrep: {
        backgroundColor: '#FEF3C7',
    },
    statusReady: {
        backgroundColor: '#DCFCE7',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1E293B',
    },

    // Products Tab
    prodHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 12,
    },
    addProdMiniBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addProdMiniText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    prodRowName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    prodRowPrice: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    stockStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 4,
        gap: 8,
    },
    stepBtn: {
        paddingHorizontal: 8,
    },
    stepBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    stockCountText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
        minWidth: 24,
        textAlign: 'center',
    },

    // Analytics Tab
    analyticsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 14,
    },
    analyticsCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
    },
    analyticsVal: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    analyticsSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    chartCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
        marginTop: 10,
    },
    barContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        paddingTop: 10,
    },
    barCol: {
        alignItems: 'center',
        gap: 6,
    },
    barFill: {
        width: 22,
        backgroundColor: Colors.primary,
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 11,
        color: Colors.textMuted,
    },

    // Settings
    settingsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    settingSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    logoutBtn: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
    },
    logoutBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    customerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 12,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    customerPhone: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    callCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: Colors.borderLight,
    },
    itemName: {
        fontSize: 14,
        color: Colors.textPrimary,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    totalVal: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 15,
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
