import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ScrollView,
    StyleSheet,
    Dimensions,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMenuForRestaurant } from '../data/restaurantMenus';
import { getMenuByRestaurant } from '../api/foodApi';

const { width, height } = Dimensions.get('window');

export default function RestaurantDetailsScreen({
    restaurant = {
        id: 'pizza-palace',
        name: 'Pizza Palace',
        cuisines: 'Pizza • Italian • Fast Food',
        rating: '4.8',
        reviews: '810',
        time: '25–35 min',
        offerPrimary: '15% OFF',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=85',
    },
    onBack,
    onViewCart,
    cart = {},
    onAddToCart,
    onRemoveFromCart,
}) {
    // 1. Resolve matching menu and categories based on the restaurant passed
    const restaurantKey = restaurant?.id || restaurant?.name || 'pizza-palace';
    const menuData = getMenuForRestaurant(restaurantKey);

    const [categories, setCategories] = useState(menuData.categories || ['All']);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isFav, setIsFav] = useState(false);
    const [menuItems, setMenuItems] = useState(menuData.items || []);
    const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);

    // If restaurant prop changes, dynamically switch the categories and dishes
    useEffect(() => {
        const freshMenu = getMenuForRestaurant(restaurant?.id || restaurant?.name);
        setCategories(freshMenu.categories || ['All']);
        setSelectedCategory('All');
        setMenuItems(freshMenu.items || []);

        const restId = restaurant?._id || restaurant?.id;
        if (restId && typeof restId === 'string' && restId.length === 24) {
            getMenuByRestaurant(restId)
                .then((backendMenu) => {
                    if (backendMenu?.items?.length) {
                        setCategories(backendMenu.categories);
                        setSelectedCategory(backendMenu.categories[0]);
                        setMenuItems(backendMenu.items);
                    }
                })
                .catch(() => {});
        }
    }, [restaurant?.id, restaurant?.name, restaurant?._id]);

    const filteredItems = menuItems.filter((item) => {
        if (!selectedCategory || selectedCategory === 'All') return true;
        return item.category === selectedCategory;
    });

    // Cart calculations
    const cartCount = Object.values(cart).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const cartTotal = Object.values(cart).reduce((sum, item) => sum + item.price * (item.quantity || 0), 0);

    const restaurantCuisines = Array.isArray(restaurant.cuisine)
        ? restaurant.cuisine.join(' • ')
        : restaurant.cuisines || restaurant.cuisine || 'Fast Food • Multi-Cuisine';

    // Count items per category
    const getCategoryCount = (cat) => {
        if (cat === 'All') return menuItems.length;
        return menuItems.filter((item) => item.category === cat).length;
    };

    return (
        <View style={styles.root}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
            >
                {/* ══════════════════════════════════════════════════════════════
                    1. HERO RESTAURANT BANNER (WITH TOP ACTIONS OVERLAY)
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.heroBox}>
                    <Image
                        source={{
                            uri:
                                restaurant.image ||
                                'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=85',
                        }}
                        style={styles.heroImg}
                        resizeMode="cover"
                    />

                    {/* Gradient Overlay for rich cinematic contrast */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                        locations={[0, 0.45, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />

                    {/* Top Action Buttons (Circular dark frosted buttons) */}
                    <SafeAreaView edges={['top']} style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.circleBtn}
                            onPress={onBack}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.topRightBtns}>
                            <TouchableOpacity
                                style={styles.circleBtn}
                                activeOpacity={0.8}
                                onPress={() => setIsMenuModalVisible(true)}
                            >
                                <Ionicons name="restaurant-outline" size={19} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.circleBtn}
                                onPress={() => setIsFav(!isFav)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={isFav ? 'heart' : 'heart-outline'}
                                    size={20}
                                    color={isFav ? '#EF4444' : '#FFFFFF'}
                                />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    {/* Restaurant Meta (Title, Cuisine, Ratings, Time, Offer) */}
                    <View style={styles.restaurantMeta}>
                        <Text style={styles.restTitle} numberOfLines={1}>
                            {restaurant.name || 'Pizza Palace'}
                        </Text>
                        <Text style={styles.restCuisine} numberOfLines={1}>
                            {restaurantCuisines}
                        </Text>

                        {/* Badges Row */}
                        <View style={styles.badgeRow}>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={styles.ratingText}>
                                    {restaurant.rating || '4.8'} ({restaurant.reviews || '810'})
                                </Text>
                            </View>

                            <View style={styles.etaBadge}>
                                <Ionicons name="bicycle" size={13} color="#FFFFFF" />
                                <Text style={styles.etaText}>
                                    {restaurant.time || '25–35 min'}
                                </Text>
                            </View>

                            <View style={styles.offerBadge}>
                                <Text style={styles.offerText}>
                                    {restaurant.offerPrimary || restaurant.offer || '15% OFF'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    2. HORIZONTAL CATEGORY PILLS (WITH "ALL" PILL FIRST)
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.categoriesContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.catChipsRow}
                    >
                        {/* Always offer "All" pill first */}
                        <TouchableOpacity
                            style={[
                                styles.catChip,
                                selectedCategory === 'All' && styles.catChipActive,
                            ]}
                            onPress={() => setSelectedCategory('All')}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    styles.catChipText,
                                    selectedCategory === 'All' && styles.catChipTextActive,
                                ]}
                            >
                                All ({menuItems.length})
                            </Text>
                        </TouchableOpacity>

                        {categories.map((cat) => {
                            if (cat === 'All') return null;
                            const active = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catChip, active && styles.catChipActive]}
                                    onPress={() => setSelectedCategory(cat)}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.catChipText,
                                            active && styles.catChipTextActive,
                                        ]}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ══════════════════════════════════════════════════════════════
                    3. MENU CARDS (Image Left, Info Center, Add/+ Right)
                ══════════════════════════════════════════════════════════════ */}
                <View style={styles.menuList}>
                    {filteredItems.map((item) => {
                        const cartItem = cart[item.id];
                        const qty = cartItem ? cartItem.quantity : 0;

                        return (
                            <View key={item.id} style={styles.dishCard}>
                                {/* Left: High-Res Rounded Thumbnail */}
                                <Image
                                    source={{ uri: item.image }}
                                    style={styles.dishImg}
                                    resizeMode="cover"
                                />

                                {/* Middle: Veg Dot, Title, Price, Description */}
                                <View style={styles.dishInfoCol}>
                                    {/* Veg / Non-Veg Indicator */}
                                    <View
                                        style={[
                                            styles.vegBox,
                                            { borderColor: item.isVeg ? '#00A859' : '#EF4444' },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.vegDot,
                                                {
                                                    backgroundColor: item.isVeg
                                                        ? '#00A859'
                                                        : '#EF4444',
                                                },
                                            ]}
                                        />
                                    </View>

                                    <Text style={styles.dishName}>{item.name}</Text>
                                    <Text style={styles.dishPrice}>₹{item.price}</Text>
                                    <Text style={styles.dishDesc} numberOfLines={2}>
                                        {item.desc}
                                    </Text>
                                </View>

                                {/* Right: + Add Pill or Stepper */}
                                <View style={styles.actionCol}>
                                    {qty === 0 ? (
                                        <TouchableOpacity
                                            style={styles.addPill}
                                            onPress={() => onAddToCart && onAddToCart(item)}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="add" size={16} color="#FFFFFF" />
                                            <Text style={styles.addPillText}>Add</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.stepperPill}>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    onRemoveFromCart && onRemoveFromCart(item.id)
                                                }
                                                style={styles.stepperTouch}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="remove" size={14} color="#008744" />
                                            </TouchableOpacity>

                                            <Text style={styles.stepperQtyText}>{qty}</Text>

                                            <TouchableOpacity
                                                onPress={() => onAddToCart && onAddToCart(item)}
                                                style={styles.stepperTouch}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <View style={styles.plusGreenCircle}>
                                                    <Ionicons name="add" size={13} color="#FFFFFF" />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* ══════════════════════════════════════════════════════════════
                4. FLOATING "MENU" FAB BUTTON (TAP TO OPEN FULL MENU CATEGORIES)
            ══════════════════════════════════════════════════════════════ */}
            <TouchableOpacity
                style={[
                    styles.floatingMenuFab,
                    cartCount > 0 && styles.floatingMenuFabAboveCart,
                ]}
                activeOpacity={0.88}
                onPress={() => setIsMenuModalVisible(true)}
            >
                <Ionicons name="restaurant" size={18} color="#FFFFFF" />
                <Text style={styles.floatingMenuFabText}>MENU</Text>
            </TouchableOpacity>

            {/* ══════════════════════════════════════════════════════════════
                5. FLOATING BOTTOM CART CAPSULE
            ══════════════════════════════════════════════════════════════ */}
            {cartCount > 0 && (
                <View style={styles.cartBarContainer}>
                    <View style={styles.cartBar}>
                        <View style={styles.cartLeftSection}>
                            <View style={styles.cartBagBox}>
                                <Ionicons name="bag-handle" size={24} color="#FFFFFF" />
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                                </View>
                            </View>
                            <View style={styles.cartPriceCol}>
                                <Text style={styles.cartItemCountLabel}>
                                    {cartCount} item{cartCount > 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.cartPriceLabel}>₹{cartTotal}</Text>
                            </View>
                        </View>

                        <View style={styles.cartVerticalDivider} />

                        <TouchableOpacity
                            style={styles.viewCartButton}
                            onPress={onViewCart}
                            activeOpacity={0.88}
                        >
                            <Text style={styles.viewCartBtnText}>View Cart</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ══════════════════════════════════════════════════════════════
                6. INTERACTIVE MENU MODAL SHEET
            ══════════════════════════════════════════════════════════════ */}
            <Modal
                visible={isMenuModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsMenuModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsMenuModalVisible(false)}
                >
                    <View style={styles.menuSheetCard}>
                        {/* Header */}
                        <View style={styles.menuSheetHeader}>
                            <View style={styles.menuSheetHeaderLeft}>
                                <Ionicons name="book-outline" size={20} color="#008744" />
                                <Text style={styles.menuSheetTitle}>Restaurant Menu</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsMenuModalVisible(false)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {/* All items option */}
                        <TouchableOpacity
                            style={[
                                styles.menuSheetRow,
                                selectedCategory === 'All' && styles.menuSheetRowActive,
                            ]}
                            onPress={() => {
                                setSelectedCategory('All');
                                setIsMenuModalVisible(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.menuSheetCatName,
                                    selectedCategory === 'All' && styles.menuSheetCatNameActive,
                                ]}
                            >
                                🍽️ All Dishes
                            </Text>
                            <View style={styles.menuSheetCountBadge}>
                                <Text style={styles.menuSheetCountText}>{menuItems.length}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Category list */}
                        {categories.map((cat) => {
                            if (cat === 'All') return null;
                            const isSelected = selectedCategory === cat;
                            const count = getCategoryCount(cat);

                            return (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.menuSheetRow,
                                        isSelected && styles.menuSheetRowActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedCategory(cat);
                                        setIsMenuModalVisible(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.menuSheetCatName,
                                            isSelected && styles.menuSheetCatNameActive,
                                        ]}
                                    >
                                        {cat}
                                    </Text>
                                    <View style={styles.menuSheetCountBadge}>
                                        <Text style={styles.menuSheetCountText}>{count}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F3FAF6',
    },
    scrollContent: {
        paddingBottom: 130,
    },

    // 1. Hero Box & Top Actions
    heroBox: {
        height: 290,
        position: 'relative',
        overflow: 'hidden',
    },
    heroImg: {
        width: '100%',
        height: '100%',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        zIndex: 10,
    },
    topRightBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(28, 28, 30, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    restaurantMeta: {
        position: 'absolute',
        bottom: 18,
        left: 18,
        right: 18,
    },
    restTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 28,
        color: '#FFFFFF',
        letterSpacing: -0.4,
    },
    restCuisine: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.82)',
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    ratingText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    etaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    etaText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    offerBadge: {
        backgroundColor: '#A7F3D0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    offerText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 12,
        color: '#065F46',
    },

    // 2. Category Chips Bar
    categoriesContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    catChipsRow: {
        paddingHorizontal: 16,
        gap: 10,
    },
    catChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    catChipActive: {
        backgroundColor: '#008744',
        borderColor: '#008744',
    },
    catChipText: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 13,
        color: '#64748B',
    },
    catChipTextActive: {
        fontFamily: 'PlusJakartaSans_700Bold',
        color: '#FFFFFF',
    },

    // 3. Menu List & Cards (Image Left, Text Center, Add Right)
    menuList: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 14,
    },
    dishCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E9F1ED',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
        gap: 12,
    },
    dishImg: {
        width: 100,
        height: 100,
        borderRadius: 18,
    },
    dishInfoCol: {
        flex: 1,
        gap: 3,
    },
    vegBox: {
        width: 14,
        height: 14,
        borderWidth: 1.5,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    vegDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dishName: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 15,
        color: '#0F172A',
        lineHeight: 19,
    },
    dishPrice: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#0F172A',
    },
    dishDesc: {
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 11,
        color: '#64748B',
        lineHeight: 15,
    },

    // Add + Pill & Stepper
    actionCol: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#008744',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 18,
        shadowColor: '#008744',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
        elevation: 3,
    },
    addPillText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 13,
        color: '#FFFFFF',
    },
    stepperPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 18,
        gap: 10,
    },
    stepperTouch: {
        padding: 4,
    },
    stepperQtyText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#0F172A',
    },
    plusGreenCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#008744',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 4. Floating MENU FAB Button
    floatingMenuFab: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#0F172A',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 9,
        zIndex: 40,
    },
    floatingMenuFabAboveCart: {
        bottom: 96,
    },
    floatingMenuFabText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 12,
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },

    // 5. Floating Bottom Cart Capsule
    cartBarContainer: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        zIndex: 50,
    },
    cartBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#042217',
        borderRadius: 36,
        paddingVertical: 10,
        paddingLeft: 18,
        paddingRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 10,
    },
    cartLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    cartBagBox: {
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#22C55E',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    cartBadgeText: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 10,
        color: '#042217',
    },
    cartPriceCol: {
        justifyContent: 'center',
    },
    cartItemCountLabel: {
        fontFamily: 'PlusJakartaSans_600SemiBold',
        fontSize: 12,
        color: '#FFFFFF',
    },
    cartPriceLabel: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 14,
        color: '#FFFFFF',
        marginTop: 1,
    },
    cartVerticalDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
    viewCartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#00A859',
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 26,
    },
    viewCartBtnText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#FFFFFF',
    },

    // 6. Menu Modal Sheet
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    menuSheetCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
        gap: 8,
    },
    menuSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 6,
    },
    menuSheetHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuSheetTitle: {
        fontFamily: 'PlusJakartaSans_800ExtraBold',
        fontSize: 17,
        color: '#0F172A',
    },
    closeBtn: {
        padding: 4,
    },
    menuSheetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    menuSheetRowActive: {
        backgroundColor: '#E8F5E9',
    },
    menuSheetCatName: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 14,
        color: '#334155',
    },
    menuSheetCatNameActive: {
        color: '#008744',
    },
    menuSheetCountBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12,
    },
    menuSheetCountText: {
        fontFamily: 'PlusJakartaSans_700Bold',
        fontSize: 12,
        color: '#64748B',
    },
});
