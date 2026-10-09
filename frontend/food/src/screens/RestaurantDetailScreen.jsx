import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import FoodCartDrawer from '../components/FoodCartDrawer';

export default function RestaurantDetailScreen({ restaurant, onBack, onNavigate }) {
    const { theme, isDark } = useTheme();
    const [cart, setCart] = useState([]);
    const [showCartSheet, setShowCartSheet] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    if (!restaurant) return null;

    const handleAddToCart = (item) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const handleUpdateQuantity = (itemId, delta) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.id === itemId) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean)
        );
    };

    const handlePlaceOrder = () => {
        setShowCartSheet(false);
        setCart([]);
        alert('🎉 Food order successfully placed! A courier is heading to the restaurant.');
        if (onNavigate) {
            onNavigate('TripTracking');
        }
    };

    const menuCategories = ['All', ...new Set(restaurant.menu.map((m) => m.category))];

    const filteredMenu =
        selectedCategory === 'All'
            ? restaurant.menu
            : restaurant.menu.filter((m) => m.category === selectedCategory);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                {/* Hero Restaurant Image */}
                <View style={styles.heroWrapper}>
                    <Image source={{ uri: restaurant.image }} style={styles.heroImage} />
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.surface }]} onPress={onBack}>
                        <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>

                    {restaurant.discount && (
                        <View style={[styles.offerBadge, { backgroundColor: theme.primaryGreen }]}>
                            <Text style={styles.offerText}>🔥 {restaurant.discount}</Text>
                        </View>
                    )}
                </View>

                {/* Restaurant Details Header */}
                <View style={[styles.detailsCard, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.restName, { color: theme.textPrimary }]}>{restaurant.name}</Text>
                    <Text style={[styles.restCuisine, { color: theme.textSecondary }]}>{restaurant.cuisine}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaBadge}>
                            <Ionicons name="star" size={14} color={theme.starGold} />
                            <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{restaurant.rating}</Text>
                            <Text style={[styles.metaSub, { color: theme.textSecondary }]}>({restaurant.ratingCount})</Text>
                        </View>
                        <View style={styles.dotSeparator} />
                        <View style={styles.metaBadge}>
                            <Ionicons name="time-outline" size={14} color={theme.primaryGreen} />
                            <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{restaurant.deliveryTime}</Text>
                        </View>
                        <View style={styles.dotSeparator} />
                        <Text style={[styles.metaVal, { color: theme.textSecondary }]}>{restaurant.distance}</Text>
                    </View>
                </View>

                {/* Category Selector Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                    {menuCategories.map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.catPill,
                                    {
                                        backgroundColor: active ? theme.primaryGreen : theme.surface,
                                    },
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[styles.catText, { color: active ? '#000' : theme.textPrimary }]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Menu List */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Menu Items</Text>
                    {filteredMenu.map((item) => {
                        const cartItem = cart.find((i) => i.id === item.id);
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                            <View key={item.id} style={[styles.dishCard, { backgroundColor: theme.surface }]}>
                                <View style={styles.dishMeta}>
                                    <View style={[styles.vegBadge, { borderColor: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                                        <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' }]} />
                                    </View>
                                    <Text style={[styles.dishName, { color: theme.textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.dishPrice, { color: theme.primaryGreen }]}>${item.price.toFixed(2)}</Text>
                                    <Text style={[styles.dishDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                </View>

                                {/* Image & Add Button */}
                                <View style={styles.dishImageCol}>
                                    <Image source={{ uri: item.image }} style={styles.dishPhoto} />
                                    {qty === 0 ? (
                                        <TouchableOpacity
                                            style={[styles.addBtn, { backgroundColor: theme.surface, borderColor: theme.primaryGreen }]}
                                            onPress={() => handleAddToCart(item)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.addBtnText, { color: theme.primaryGreen }]}>ADD +</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[styles.stepperBox, { backgroundColor: theme.primaryGreen }]}>
                                            <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, -1)}>
                                                <Ionicons name="remove" size={14} color="#000" />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>{qty}</Text>
                                            <TouchableOpacity onPress={() => handleUpdateQuantity(item.id, 1)}>
                                                <Ionicons name="add" size={14} color="#000" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Cart Sheet Drawer */}
            <FoodCartDrawer
                visible={showCartSheet}
                cartItems={cart}
                restaurantName={restaurant.name}
                onClose={() => setShowCartSheet(!showCartSheet)}
                onUpdateQuantity={handleUpdateQuantity}
                onPlaceOrder={handlePlaceOrder}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroWrapper: { height: 220, position: 'relative' },
    heroImage: { width: '100%', height: '100%' },
    backBtn: {
        position: 'absolute',
        top: 44,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offerBadge: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    offerText: { color: '#000', fontWeight: '900', fontSize: 12 },
    detailsCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
    restName: { fontSize: 22, fontWeight: '900' },
    restCuisine: { fontSize: 13, marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaVal: { fontSize: 13, fontWeight: '800' },
    metaSub: { fontSize: 11 },
    dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#64748B' },
    catRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    catText: { fontWeight: '800', fontSize: 13 },
    menuSection: { paddingHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    dishCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        justifyContent: 'space-between',
    },
    dishMeta: { flex: 1, marginRight: 12 },
    vegBadge: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        marginBottom: 6,
    },
    vegDot: { width: 6, height: 6, borderRadius: 3 },
    dishName: { fontSize: 15, fontWeight: '800' },
    dishPrice: { fontSize: 15, fontWeight: '900', marginTop: 4 },
    dishDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
    dishImageCol: { width: 100, alignItems: 'center' },
    dishPhoto: { width: 100, height: 90, borderRadius: 16 },
    addBtn: {
        position: 'absolute',
        bottom: -10,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1.5,
        elevation: 4,
    },
    addBtnText: { fontWeight: '900', fontSize: 12 },
    stepperBox: {
        position: 'absolute',
        bottom: -10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 10,
        elevation: 4,
    },
    qtyText: { color: '#000', fontWeight: '900', fontSize: 13 },
});
