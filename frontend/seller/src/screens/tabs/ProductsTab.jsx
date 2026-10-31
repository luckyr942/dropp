import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Type } from '../../theme/sellerTheme.js';
import { Button, Chip, EmptyState, ErrorState, Field, LoadingState, ScreenHeader, useToast } from '../../components/ui.jsx';
import { formatCurrency } from '../../utils/format.js';
import * as sellerApi from '../../api/sellerApi.js';

const LOW_STOCK_LEVEL = 5; // matches backend merchantService LOW_STOCK_LEVEL

// Suggested categories per store type; the seller can also type a custom one
const CATEGORY_SUGGESTIONS = {
    'Grocery & Supermarket': ['Fruits & Vegetables', 'Dairy & Eggs', 'Bakery', 'Staples', 'Snacks', 'Beverages', 'Household', 'Personal Care'],
    'Restaurant & Food': ['Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Desserts', 'Beverages'],
    'Medical & Pharmacy': ['Medicines', 'Wellness', 'Personal Care', 'Baby Care', 'Devices'],
    'Fashion & Lifestyle': ['Men', 'Women', 'Kids', 'Footwear', 'Accessories'],
    'Electronics & Mobile': ['Mobiles', 'Accessories', 'Audio', 'Chargers & Cables', 'Wearables'],
    'Flowers & Gifts': ['Bouquets', 'Plants', 'Cakes', 'Gift Hampers'],
    'Courier & Delivery': ['Documents', 'Parcels', 'Packaging'],
    'Other Services': ['Services', 'General'],
};

export default function ProductsTab({ merchantId, storeCategory, addProductRequest, onCatalogueChanged, liveTick }) {
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState({}); // productId → true while a request is in flight
    const [showAdd, setShowAdd] = useState(false);

    // Open the add sheet when Home's "Add product" was tapped
    const lastAddRequest = useRef(0);
    useEffect(() => {
        if (addProductRequest && addProductRequest !== lastAddRequest.current) {
            lastAddRequest.current = addProductRequest;
            setShowAdd(true);
        }
    }, [addProductRequest]);

    const load = useCallback(
        async (mode = 'initial') => {
            if (mode === 'initial') setLoading(true);
            if (mode === 'pull') setRefreshing(true);
            try {
                const data = await sellerApi.fetchProducts(merchantId, { limit: 100 });
                setProducts(data.items);
                setTotal(data.total);
                setError('');
            } catch (err) {
                if (mode === 'initial') setError(err.message);
                else toast.show(err.message, 'error');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [merchantId, toast]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Live changes (e.g. made by voice) refresh the list quietly
    useEffect(() => {
        if (liveTick) load('silent');
    }, [liveTick, load]);

    const replaceProduct = (updated) => setProducts((list) => list.map((p) => (p._id === updated._id ? updated : p)));

    const withBusy = async (productId, fn) => {
        setBusy((b) => ({ ...b, [productId]: true }));
        try {
            await fn();
        } finally {
            setBusy((b) => {
                const { [productId]: _drop, ...rest } = b;
                return rest;
            });
        }
    };

    const changeStock = (product, delta) => {
        if (busy[product._id]) return;
        if (delta < 0 && (product.stockQuantity || 0) <= 0) return;
        const previous = product;
        // Optimistic update, rolled back if the server rejects it
        replaceProduct({
            ...product,
            stockQuantity: Math.max(0, (product.stockQuantity || 0) + delta),
        });
        withBusy(product._id, async () => {
            try {
                const updated = await sellerApi.adjustProductStock(merchantId, product._id, delta);
                replaceProduct(updated);
                onCatalogueChanged?.();
            } catch (err) {
                replaceProduct(previous);
                toast.show(`Stock not updated: ${err.message}`, 'error');
            }
        });
    };

    const toggleAvailability = (product, value) => {
        if (busy[product._id]) return;
        const previous = product;
        const availability = value ? 'in_stock' : 'out_of_stock';
        replaceProduct({ ...product, availability });
        withBusy(product._id, async () => {
            try {
                const updated = await sellerApi.setProductAvailability(merchantId, product._id, availability);
                replaceProduct(updated);
                onCatalogueChanged?.();
            } catch (err) {
                replaceProduct(previous);
                toast.show(`Availability not updated: ${err.message}`, 'error');
            }
        });
    };

    const categories = useMemo(() => {
        const set = new Set(CATEGORY_SUGGESTIONS[storeCategory] || ['General']);
        products.forEach((p) => p.category && set.add(p.category));
        return [...set];
    }, [products, storeCategory]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }, [products, search]);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.headerWrap}>
                <ScreenHeader
                    title="Catalogue"
                    subtitle={loading ? ' ' : `${total} product${total === 1 ? '' : 's'}`}
                    right={<Button title="Add" icon="add" compact onPress={() => setShowAdd(true)} />}
                />
                {products.length > 0 ? (
                    <View style={styles.searchBox}>
                        <Feather name="search" size={16} color={Colors.textMuted} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search products or categories"
                            placeholderTextColor={Colors.textMuted}
                            style={styles.searchInput}
                            autoCorrect={false}
                        />
                        {search ? (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ) : null}
            </View>

            {loading ? (
                <LoadingState label="Loading catalogue…" />
            ) : error ? (
                <ErrorState message={error} onRetry={() => load()} />
            ) : (
                <FlatList
                    data={visible}
                    keyExtractor={(p) => p._id}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('pull')} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        search ? (
                            <EmptyState icon="search-outline" title="No matches" message={`Nothing in your catalogue matches "${search}".`} />
                        ) : (
                            <EmptyState
                                icon="cube-outline"
                                title="Your catalogue is empty"
                                message="Add your first product so customers can start ordering."
                                actionLabel="Add product"
                                onAction={() => setShowAdd(true)}
                            />
                        )
                    }
                    renderItem={({ item }) => (
                        <ProductRow
                            product={item}
                            busy={Boolean(busy[item._id])}
                            onStock={(d) => changeStock(item, d)}
                            onToggle={(v) => toggleAvailability(item, v)}
                        />
                    )}
                />
            )}

            <AddProductSheet
                visible={showAdd}
                categories={categories}
                onClose={() => setShowAdd(false)}
                onSave={async (payload) => {
                    const created = await sellerApi.addProduct(merchantId, payload);
                    setProducts((list) => [created, ...list]);
                    setTotal((t) => t + 1);
                    setShowAdd(false);
                    toast.show(`${created.name} added to your catalogue`, 'success');
                    onCatalogueChanged?.();
                }}
            />
        </View>
    );
}

function ProductRow({ product, busy, onStock, onToggle }) {
    const discontinued = product.availability === 'discontinued';
    const inStock = product.availability === 'in_stock';
    const stock = product.stockQuantity ?? 0;
    const low = inStock && stock > 0 && stock <= LOW_STOCK_LEVEL;
    const hasDiscount = product.discountPrice != null && product.discountPrice < product.price;

    return (
        <View style={[styles.row, Shadows.card, !inStock && styles.rowMuted]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                    {product.name}
                </Text>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatCurrency(hasDiscount ? product.discountPrice : product.price)}</Text>
                    {hasDiscount ? <Text style={styles.strike}>{formatCurrency(product.price)}</Text> : null}
                    <Text style={styles.unit}>· {product.unit || '1 pc'}</Text>
                </View>
                <View style={styles.tagRow}>
                    <Text style={styles.category}>{product.category}</Text>
                    {discontinued ? (
                        <Tag text="Discontinued" color={Colors.textSecondary} bg={Colors.surfaceSubtle} />
                    ) : !inStock ? (
                        <Tag text="Out of stock" color={Colors.danger} bg={Colors.dangerLight} />
                    ) : low ? (
                        <Tag text="Low stock" color="#B45309" bg={Colors.warningLight} />
                    ) : null}
                </View>
            </View>

            <View style={styles.controls}>
                {!discontinued ? (
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{inStock ? 'Available' : 'Hidden'}</Text>
                        <Switch
                            value={inStock}
                            onValueChange={onToggle}
                            disabled={busy}
                            trackColor={{ true: Colors.primary, false: Colors.border }}
                            style={{ transform: [{ scale: 0.8 }] }}
                        />
                    </View>
                ) : null}
                <View style={[styles.stepper, discontinued && { opacity: 0.4 }]}>
                    <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => onStock(-1)}
                        disabled={busy || discontinued || stock <= 0}
                        accessibilityLabel={`Decrease stock of ${product.name}`}
                    >
                        <Feather name="minus" size={14} color={stock <= 0 ? Colors.textMuted : Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stock}>{stock}</Text>
                    <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => onStock(1)}
                        disabled={busy || discontinued}
                        accessibilityLabel={`Increase stock of ${product.name}`}
                    >
                        <Feather name="plus" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function Tag({ text, color, bg }) {
    return (
        <View style={[styles.tag, { backgroundColor: bg }]}>
            <Text style={[styles.tagText, { color }]}>{text}</Text>
        </View>
    );
}

function AddProductSheet({ visible, categories, onClose, onSave }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('');
    const [stock, setStock] = useState('');
    const [category, setCategory] = useState(null);
    const [customCategory, setCustomCategory] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (visible) {
            setName('');
            setPrice('');
            setUnit('');
            setStock('');
            setCategory(null);
            setCustomCategory('');
            setErrors({});
            setFormError('');
        }
    }, [visible]);

    const save = async () => {
        const errs = {};
        const finalCategory = category === '__custom' ? customCategory.trim() : category;
        if (name.trim().length < 2) errs.name = 'Enter a product name';
        if (!(Number(price) >= 0) || price.trim() === '') errs.price = 'Enter a valid price';
        if (!/^\d+$/.test(stock.trim())) errs.stock = 'Enter a whole number';
        if (!finalCategory || finalCategory.length < 2) errs.category = 'Pick or type a category';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        setSaving(true);
        setFormError('');
        try {
            await onSave({
                name: name.trim(),
                price: Number(price),
                stockQuantity: Number(stock),
                category: finalCategory,
                ...(unit.trim() ? { unit: unit.trim() } : {}),
            });
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.grabber} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Add product</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10}>
                            <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. Basmati Rice 1kg" error={errors.name} />
                        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                            <Field style={{ flex: 1 }} label="Price (₹)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" error={errors.price} />
                            <Field style={{ flex: 1 }} label="Unit (optional)" value={unit} onChangeText={setUnit} placeholder="1 kg, 500 ml…" />
                        </View>
                        <Field label="Stock quantity" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" error={errors.stock} />

                        <Text style={styles.fieldLabel}>Category</Text>
                        <View style={styles.categoryWrap}>
                            {categories.map((c) => (
                                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
                            ))}
                            <Chip label="+ Other" selected={category === '__custom'} onPress={() => setCategory('__custom')} />
                        </View>
                        {category === '__custom' ? (
                            <Field value={customCategory} onChangeText={setCustomCategory} placeholder="Type a category" style={{ marginTop: Spacing.sm }} />
                        ) : null}
                        {errors.category ? <Text style={styles.errorInline}>{errors.category}</Text> : null}

                        {formError ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                                <Text style={styles.errorText}>{formError}</Text>
                            </View>
                        ) : null}
                    </ScrollView>
                    <Button title="Save to catalogue" onPress={save} loading={saving} style={{ marginTop: Spacing.lg }} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    headerWrap: { paddingHorizontal: Spacing.xl },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: 40, flexGrow: 1 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.md + 2,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        gap: Spacing.md,
    },
    rowMuted: { backgroundColor: '#FCFDFE' },
    name: { ...Type.body, fontWeight: '700', fontSize: 15 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
    price: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
    strike: { fontSize: 12, color: Colors.textMuted, textDecorationLine: 'line-through' },
    unit: { ...Type.caption },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    category: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
    tagText: { fontSize: 10, fontWeight: '700' },
    controls: { alignItems: 'flex-end', gap: 6 },
    switchRow: { flexDirection: 'row', alignItems: 'center' },
    switchLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.sm + 2,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    stock: { minWidth: 30, textAlign: 'center', fontSize: 14, fontWeight: '800', color: Colors.primary },
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Radius.xl + 4,
        borderTopRightRadius: Radius.xl + 4,
        paddingHorizontal: Spacing.xl,
        paddingBottom: 36,
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginVertical: Spacing.sm },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    sheetTitle: { ...Type.heading, fontSize: 19 },
    fieldLabel: { ...Type.label, marginBottom: 8 },
    categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    errorInline: { color: Colors.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.dangerLight,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginTop: Spacing.md,
    },
    errorText: { color: Colors.danger, fontSize: 13, fontWeight: '600', flex: 1 },
});
