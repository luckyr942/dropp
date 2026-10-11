import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMenuForRestaurant } from '../data/restaurantMenus';

export default function RestaurantDetailsScreen({
    restaurant = {
        id: 'daily-grind',
        name: 'The Daily Grind',
        cuisines: 'Café • Coffee • Snacks',
        rating: '4.8',
        reviews: '2.1K',
        time: '15–25 min',
        offerPrimary: '15% OFF',
        image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=700&auto=format&fit=crop&q=85',
    },
    onBack,
    onViewCart,
    cart = {},
    onAddToCart,
    onRemoveFromCart,
}) {
    // 1. Dynamically retrieve menu and categories for whichever restaurant was tapped
    const restaurantMenu = getMenuForRestaurant(restaurant?.id);
    const categories = restaurantMenu.categories;
    const allItems = restaurantMenu.items;

    const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'All');
    const [isFav, setIsFav] = useState(false);
    const [customiseItem, setCustomiseItem] = useState(null);
    const [selectedSize, setSelectedSize] = useState('Regular');
    const [selectedMilk, setSelectedMilk] = useState('Whole Milk');

    const filteredItems =
        selectedCategory === 'All' || selectedCategory === 'Recommended'
            ? allItems
            : allItems.filter((i) => i.category === selectedCategory);

    // Cart calculations
    const cartCount = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);

    const handleAddClick = (item) => {
        if (item.hasCustomisations) {
            setCustomiseItem(item);
        } else {
            onAddToCart && onAddToCart(item);
        }
    };

    const handleConfirmCustomisation = () => {
        if (customiseItem) {
            const extra = selectedSize === 'Large (+₹40)' ? 40 : 0;
            onAddToCart &&
                onAddToCart({
                    ...customiseItem,
                    name: `${customiseItem.name} (${selectedSize}, ${selectedMilk})`,
                    price: customiseItem.price + extra,
                });
            setCustomiseItem(null);
        }
    };

    const restaurantCuisines = restaurant.cuisines || restaurant.cuisine || 'Café & Bites';
    const restaurantEta = restaurant.time || restaurant.eta || '20–30 min';
    const restaurantOffer = restaurant.offerPrimary || restaurant.badge || '15% OFF';

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* 1. Header Hero Banner */}
                <View style={styles.heroBox}>
                    <Image source={{ uri: restaurant.image }} style={styles.heroImg} resizeMode="cover" />
                    <View style={styles.heroGradient} />

                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.circleBtn} onPress={onBack} activeOpacity={0.8}>
                            <Ionicons name="arrow-back" size={20} color="#0F172A" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.circleBtn} onPress={() => setIsFav(!isFav)} activeOpacity={0.8}>
                            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#EF4444' : '#0F172A'} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.restaurantMeta}>
                        <Text style={styles.restTitle} numberOfLines={1}>{restaurant.name}</Text>
                        <Text style={styles.restCuisine} numberOfLines={1}>{restaurantCuisines}</Text>
                        <View style={styles.badgeRow}>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={11} color="#F59E0B" />
                                <Text style={styles.ratingText}>
                                    {restaurant.rating} {restaurant.reviews ? `(${restaurant.reviews})` : ''}
                                </Text>
                            </View>
                            <Text style={styles.badgeDot}>•</Text>
                            <Text style={styles.etaText}>{restaurantEta}</Text>
                            {restaurantOffer && (
                                <>
                                    <Text style={styles.badgeDot}>•</Text>
                                    <View style={styles.offerBadge}>
                                        <Text style={styles.offerText}>{restaurantOffer}</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </View>

                {/* 2. Dynamic Sticky Category Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
                    {categories.map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.catChip, active && styles.catChipActive]}
                                onPress={() => setSelectedCategory(cat)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* 3. Menu Items List */}
                <View style={styles.menuList}>
                    {filteredItems.map((item) => {
                        const cartItem = cart[item.id];
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                            <View key={item.id} style={styles.menuRow}>
                                <View style={styles.itemInfo}>
                                    <View style={styles.vegBox}>
                                        <View style={[styles.vegDot, { backgroundColor: item.isVeg ? '#00A859' : '#EF4444' }]} />
                                    </View>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                                    <Text style={styles.itemDesc} numberOfLines={2}>{item.desc}</Text>
                                    {item.hasCustomisations && (
                                        <Text style={styles.customText}>Customisable</Text>
                                    )}
                                </View>

                                <View style={styles.itemImgCol}>
                                    <Image source={{ uri: item.image }} style={styles.itemImg} resizeMode="cover" />
                                    {qty === 0 ? (
                                        <TouchableOpacity style={styles.addBtn} onPress={() => handleAddClick(item)} activeOpacity={0.85}>
                                            <Text style={styles.addBtnText}>ADD +</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.stepper}>
                                            <TouchableOpacity onPress={() => onRemoveFromCart && onRemoveFromCart(item.id)}>
                                                <Ionicons name="remove" size={14} color="#FFFFFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.stepperQty}>{qty}</Text>
                                            <TouchableOpacity onPress={() => onAddToCart && onAddToCart(item)}>
                                                <Ionicons name="add" size={14} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* 4. Bottom Sticky Cart Bar */}
            {cartCount > 0 && (
                <View style={styles.cartBarWrapper}>
                    <TouchableOpacity style={styles.cartBar} onPress={onViewCart} activeOpacity={0.9}>
                        <View style={styles.cartLeft}>
                            <Ionicons name="bag-handle" size={20} color="#FFFFFF" />
                            <Text style={styles.cartCountText}>{cartCount} Items · ₹{cartTotal}</Text>
                        </View>
                        <Text style={styles.cartRightText}>View Cart →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 5. Customisation Modal */}
            <Modal visible={!!customiseItem} animationType="slide" transparent onRequestClose={() => setCustomiseItem(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{customiseItem?.name}</Text>
                                <Text style={styles.modalPrice}>Base Price: ₹{customiseItem?.price}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setCustomiseItem(null)} style={styles.modalClose}>
                                <Ionicons name="close" size={20} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        {/* Options: Size */}
                        <Text style={styles.optTitle}>Choose Size</Text>
                        {['Regular', 'Large (+₹40)'].map((size) => (
                            <TouchableOpacity key={size} style={styles.optRow} onPress={() => setSelectedSize(size)}>
                                <Text style={styles.optLabel}>{size}</Text>
                                <Ionicons name={selectedSize === size ? 'radio-button-on' : 'radio-button-off'} size={18} color="#00A859" />
                            </TouchableOpacity>
                        ))}

                        {/* Options: Milk / Sauce */}
                        <Text style={[styles.optTitle, { marginTop: 14 }]}>Custom Choice</Text>
                        {['Whole Milk / Standard', 'Oat Milk (+₹30)', 'Almond Milk (+₹30)'].map((opt) => (
                            <TouchableOpacity key={opt} style={styles.optRow} onPress={() => setSelectedMilk(opt)}>
                                <Text style={styles.optLabel}>{opt}</Text>
                                <Ionicons name={selectedMilk === opt ? 'radio-button-on' : 'radio-button-off'} size={18} color="#00A859" />
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmCustomisation}>
                            <Text style={styles.confirmBtnText}>Add Item to Cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF9F1' },
    scroll: { paddingBottom: 100 },
    heroBox: { height: 230, position: 'relative', overflow: 'hidden' },
    heroImg: { width: '100%', height: '100%' },
    heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.42)' },
    topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
    circleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3 },
    restaurantMeta: { position: 'absolute', bottom: 16, left: 16, right: 16 },
    restTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#FFFFFF' },
    restCuisine: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#E2E8F0', marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    ratingText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#0F172A' },
    badgeDot: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
    etaText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: '#FFFFFF' },
    offerBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    offerText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 10, color: '#047857' },
    catChipsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    catChipActive: { backgroundColor: '#00A859', borderColor: '#00A859' },
    catChipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: '#64748B' },
    catChipTextActive: { fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },
    menuList: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
    menuRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E8EEE9', gap: 12 },
    itemInfo: { flex: 1, gap: 3 },
    vegBox: { width: 14, height: 14, borderWidth: 1.5, borderColor: '#00A859', alignItems: 'center', justifyContent: 'center', borderRadius: 2, marginBottom: 2 },
    vegDot: { width: 6, height: 6, borderRadius: 3 },
    itemName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#0F172A' },
    itemPrice: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#0F172A' },
    itemDesc: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: '#64748B', lineHeight: 15 },
    customText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, color: '#00A859', marginTop: 4 },
    itemImgCol: { width: 95, alignItems: 'center', position: 'relative' },
    itemImg: { width: 95, height: 90, borderRadius: 14 },
    addBtn: { position: 'absolute', bottom: -8, backgroundColor: '#00A859', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, elevation: 2 },
    addBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#FFFFFF' },
    stepper: { position: 'absolute', bottom: -8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00A859', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 8, elevation: 2 },
    stepperQty: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: '#FFFFFF' },
    cartBarWrapper: { position: 'absolute', bottom: 14, left: 16, right: 16 },
    cartBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#00A859', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 20, elevation: 6 },
    cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cartCountText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#FFFFFF' },
    cartRightText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: '#FFFFFF' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: '#0F172A' },
    modalPrice: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: '#64748B' },
    modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    optTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: '#0F172A', marginTop: 6 },
    optRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    optLabel: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: '#334155' },
    confirmBtn: { backgroundColor: '#00A859', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 14 },
    confirmBtnText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#FFFFFF' },
});




