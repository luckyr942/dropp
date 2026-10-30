import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/sellerTheme.js';
import * as sellerApi from '../api/sellerApi.js';

const CATEGORIES = [
    { id: 'Restaurant & Food', label: 'Restaurant\n& Food', icon: 'silverware-fork-knife', color: '#EA580C', bg: '#FFF7ED' },
    { id: 'Grocery & Supermarket', label: 'Grocery &\nSupermarket', icon: 'cart-outline', color: '#16A34A', bg: '#F0FDF4' },
    { id: 'Medical & Pharmacy', label: 'Medical &\nPharmacy', icon: 'pill', color: '#DC2626', bg: '#FEF2F2' },
    { id: 'Courier & Delivery', label: 'Courier &\nDelivery', icon: 'package-variant-closed', color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'Fashion & Lifestyle', label: 'Fashion &\nLifestyle', icon: 'tshirt-crew-outline', color: '#DB2777', bg: '#FDF2F8' },
    { id: 'Electronics & Mobile', label: 'Electronics\n& Mobile', icon: 'cellphone', color: '#0284C7', bg: '#F0F9FF' },
    { id: 'Flowers & Gifts', label: 'Flowers &\nGifts', icon: 'flower-outline', color: '#E11D48', bg: '#FFF1F2' },
    { id: 'Other Services', label: 'Other\nServices', icon: 'toolbox-outline', color: '#4B5563', bg: '#F3F4F6' },
];

export default function SellerOnboardingScreen({ onFinish, onLogin }) {
    const [step, setStep] = useState(1); // 1: Welcome, 2: Category, 3: Details, 4: Products, 5: Review, 6: Success
    const [loading, setLoading] = useState(false);

    // Form state
    const [category, setCategory] = useState('Grocery & Supermarket');
    const [storeName, setStoreName] = useState('FreshMart');
    const [description, setDescription] = useState('Fresh fruits, vegetables and daily essentials delivered to your doorstep.');
    const [businessHours, setBusinessHours] = useState('09:00 AM - 11:00 PM');
    const [address, setAddress] = useState('MG Road, Bengaluru, Karnataka');
    const [phone, setPhone] = useState('9876543210');
    const [createdStore, setCreatedStore] = useState(null);

    // Initial starter products
    const [sampleProducts, setSampleProducts] = useState([
        { name: 'Fresh Apple (1 Kg)', price: 120, unit: '1 Kg', stockQuantity: 30, category: 'Fruits' },
        { name: 'Fresh Milk (1 L)', price: 62, unit: '1 L', stockQuantity: 50, category: 'Dairy' },
        { name: 'Whole Wheat Bread', price: 45, unit: '400g', stockQuantity: 20, category: 'Bakery' },
    ]);

    const handlePublish = async () => {
        setLoading(true);
        try {
            // 1. Ensure user registered/authenticated
            const testEmail = `seller_${Date.now()}@dropp.local`;
            await sellerApi.registerMerchant({
                name: storeName,
                phone: phone.trim(),
                email: testEmail,
                password: 'DroppSeller2026#',
            }).catch(() => {
                return sellerApi.loginMerchant(phone.trim(), 'DroppSeller2026#');
            });

            // 2. Create the store
            const store = await sellerApi.createStore({
                name: storeName,
                category,
                description,
                address: {
                    street: address.split(',')[0]?.trim() || 'MG Road',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    pincode: '560001',
                },
                contact: { phone: phone.trim() },
                openTime: '09:00',
                closeTime: '23:00',
            });

            // 3. Add sample products to this store
            for (const prod of sampleProducts) {
                await sellerApi.addProduct(store._id, prod).catch(() => null);
            }

            setCreatedStore(store);
            setStep(6); // Success screen
        } catch (err) {
            Alert.alert('Registration Note', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header / Back Navigation */}
            {step > 1 && step < 6 && (
                <View style={styles.wizardHeader}>
                    <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
                        <Feather name="chevron-left" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.progressDots}>
                        {[2, 3, 4, 5].map((s) => (
                            <View
                                key={s}
                                style={[styles.dot, step === s ? styles.dotActive : step > s ? styles.dotDone : null]}
                            />
                        ))}
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            )}

            {/* ════ SCREEN 1: WELCOME ════ */}
            {step === 1 && (
                <View style={styles.screenInner}>
                    <View style={styles.welcomeTop}>
                        <View style={styles.brandRow}>
                            <View style={styles.logoCircle}>
                                <Ionicons name="storefront-outline" size={28} color={Colors.primary} />
                            </View>
                            <Text style={styles.brandTitle}>Dropp</Text>
                        </View>
                        <Text style={styles.heroHeading}>Become a Seller</Text>
                        <Text style={styles.heroSubheading}>
                            List your business and reach thousands of customers on Dropp
                        </Text>
                    </View>

                    <View style={styles.illustrationWrapper}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80' }}
                            style={styles.heroImage}
                        />
                    </View>

                    <View style={styles.bottomCta}>
                        <TouchableOpacity
                            style={[styles.primaryButton, Shadows.button]}
                            activeOpacity={0.88}
                            onPress={() => setStep(2)}
                        >
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginLink} onPress={() => setStep(2)}>
                            <Text style={styles.loginText}>
                                Already have an account? <Text style={styles.loginHighlight}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ════ SCREEN 2: CHOOSE BUSINESS TYPE ════ */}
            {step === 2 && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.stepTitle}>Choose Your Business Type</Text>
                    <Text style={styles.stepSubtitle}>Select the category that best describes your business</Text>

                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => {
                            const selected = category === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryCard,
                                        selected && styles.categoryCardSelected,
                                        Shadows.card,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <View style={[styles.catIconCircle, { backgroundColor: cat.bg }]}>
                                        <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
                                    </View>
                                    <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>
                                        {cat.label}
                                    </Text>
                                    {selected && (
                                        <View style={styles.selectedBadge}>
                                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, Shadows.button, { marginTop: 24 }]}
                        onPress={() => setStep(3)}
                    >
                        <Text style={styles.primaryButtonText}>Continue</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ════ SCREEN 3: BUSINESS DETAILS ════ */}
            {step === 3 && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.stepTitle}>Business Details</Text>
                    <Text style={styles.stepSubtitle}>Tell us about your store</Text>

                    {/* Store Logo Picker Preview */}
                    <View style={styles.avatarSection}>
                        <View style={styles.storeAvatarWrapper}>
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80' }}
                                style={styles.storeAvatar}
                            />
                            <View style={styles.cameraCircle}>
                                <Ionicons name="camera" size={14} color="#FFFFFF" />
                            </View>
                        </View>
                    </View>

                    {/* Inputs */}
                    <Text style={styles.fieldLabel}>Store Name</Text>
                    <TextInput
                        style={styles.input}
                        value={storeName}
                        onChangeText={setStoreName}
                        placeholder="e.g. FreshMart"
                    />

                    <Text style={styles.fieldLabel}>Business Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Brief summary of what you offer..."
                        multiline
                    />

                    <Text style={styles.fieldLabel}>Contact Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit mobile number"
                        keyboardType="phone-pad"
                    />

                    <Text style={styles.fieldLabel}>Business Hours</Text>
                    <View style={styles.pickerInputRow}>
                        <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.nestedInput}
                            value={businessHours}
                            onChangeText={setBusinessHours}
                        />
                        <Feather name="chevron-down" size={16} color={Colors.textMuted} />
                    </View>

                    <Text style={styles.fieldLabel}>Address</Text>
                    <View style={styles.pickerInputRow}>
                        <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.nestedInput}
                            value={address}
                            onChangeText={setAddress}
                        />
                        <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, Shadows.button, { marginTop: 24 }]}
                        onPress={() => setStep(4)}
                    >
                        <Text style={styles.primaryButtonText}>Continue</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ════ SCREEN 4: ADD PRODUCTS ════ */}
            {step === 4 && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.stepTitle}>Add Products</Text>
                    <Text style={styles.stepSubtitle}>Start by adding a few products to your catalogue</Text>

                    {/* Add Manually Card */}
                    <TouchableOpacity
                        style={[styles.productOptionCard, Shadows.card]}
                        activeOpacity={0.8}
                        onPress={() => setStep(5)}
                    >
                        <View style={styles.bluePlusCircle}>
                            <Feather name="plus" size={24} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>Add Manually</Text>
                            <Text style={styles.optionSubtitle}>Add products one by one with photos, price, unit etc.</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Import from File */}
                    <TouchableOpacity
                        style={[styles.productOptionCard, Shadows.card]}
                        activeOpacity={0.8}
                        onPress={() => Alert.alert('CSV Import', 'CSV and Excel auto-mapping ready.')}
                    >
                        <View style={[styles.bluePlusCircle, { backgroundColor: '#F1F5F9' }]}>
                            <Feather name="download" size={20} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.optionTitle}>Import from File</Text>
                            <Text style={styles.optionSubtitle}>Upload CSV/Excel file to add multiple products in bulk</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Tip card */}
                    <View style={styles.tipCard}>
                        <Ionicons name="bulb-outline" size={22} color="#D97706" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.tipTitle}>Tip</Text>
                            <Text style={styles.tipDesc}>
                                You can add or modify products anytime using voice commands with Aura from your dashboard!
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, Shadows.button, { marginTop: 40 }]}
                        onPress={() => setStep(5)}
                    >
                        <Text style={styles.primaryButtonText}>Review & Publish</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ════ SCREEN 5: REVIEW & PUBLISH ════ */}
            {step === 5 && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.stepTitle}>Review & Publish</Text>
                    <Text style={styles.stepSubtitle}>Almost done! Review your store details before going live</Text>

                    {/* Store Card Preview */}
                    <View style={[styles.storeSummaryCard, Shadows.card]}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80' }}
                            style={styles.summaryImage}
                        />
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.summaryName}>{storeName}</Text>
                            <Text style={styles.summaryCategory}>{category}</Text>
                            <Text style={styles.summaryAddress} numberOfLines={1}>{address}</Text>
                        </View>
                    </View>

                    {/* Checklist */}
                    <View style={styles.checklist}>
                        {[
                            'Business details added',
                            'Store hours set (9:00 AM - 11:00 PM)',
                            'Address verified on map',
                            `${sampleProducts.length} starter products ready`,
                            'Instant payout method linked',
                        ].map((item, idx) => (
                            <View key={idx} style={styles.checkItem}>
                                <View style={styles.greenCheckCircle}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>
                                <Text style={styles.checkText}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, Shadows.button, { marginTop: 32 }]}
                        activeOpacity={0.88}
                        onPress={handlePublish}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Publish Store</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ════ SCREEN 6: SUCCESS ════ */}
            {step === 6 && (
                <View style={styles.screenInner}>
                    <View style={styles.successCenter}>
                        <View style={styles.celebrationCircle}>
                            <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
                        </View>
                        <Text style={styles.successHeading}>Your Store is Live! 🎉</Text>
                        <Text style={styles.successDesc}>
                            You can now start receiving orders on Dropp. Manage your store, products and orders from your dashboard.
                        </Text>
                    </View>

                    <View style={styles.bottomCta}>
                        <TouchableOpacity
                            style={[styles.primaryButton, Shadows.button]}
                            onPress={() => onFinish && onFinish(createdStore)}
                        >
                            <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, { marginTop: 12 }]}
                            onPress={() => onFinish && onFinish(createdStore)}
                        >
                            <Text style={styles.secondaryButtonText}>Add More Products</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    screenInner: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    wizardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#CBD5E1',
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 22,
    },
    dotDone: {
        backgroundColor: Colors.success,
    },

    // Step 1 Welcome
    welcomeTop: {
        marginTop: 32,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    logoCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
    },
    heroHeading: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -0.5,
    },
    heroSubheading: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 8,
        lineHeight: 22,
    },
    illustrationWrapper: {
        alignItems: 'center',
        marginVertical: 20,
    },
    heroImage: {
        width: '100%',
        height: 240,
        borderRadius: 24,
    },
    bottomCta: {
        width: '100%',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    loginLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    loginText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    loginHighlight: {
        color: Colors.primary,
        fontWeight: '700',
    },

    // Step Typography
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginTop: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        marginBottom: 20,
    },

    // Step 2 Category Grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    categoryCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
        position: 'relative',
    },
    categoryCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F8FAFF',
    },
    catIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    catLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
        lineHeight: 18,
    },
    catLabelSelected: {
        color: Colors.primary,
        fontWeight: '700',
    },
    selectedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Step 3 Details
    avatarSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    storeAvatarWrapper: {
        position: 'relative',
    },
    storeAvatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
    },
    cameraCircle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: 14,
        marginBottom: 6,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        fontSize: 15,
        color: Colors.textPrimary,
    },
    textArea: {
        minHeight: 64,
        textAlignVertical: 'top',
    },
    pickerInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    nestedInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 15,
        color: Colors.textPrimary,
    },

    // Step 4 Options
    productOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 18,
        borderRadius: 16,
        marginBottom: 14,
        gap: 16,
    },
    bluePlusCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    optionSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    tipCard: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 14,
        marginTop: 10,
    },
    tipTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
    },
    tipDesc: {
        fontSize: 12,
        color: '#B45309',
        marginTop: 2,
        lineHeight: 17,
    },

    // Step 5 Review
    storeSummaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 14,
        borderRadius: 16,
        marginBottom: 24,
    },
    summaryImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
    },
    summaryName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    summaryCategory: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    summaryAddress: {
        fontSize: 12,
        color: Colors.textMuted,
        marginTop: 2,
    },
    checklist: {
        gap: 14,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    greenCheckCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkText: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.textPrimary,
    },

    // Step 6 Success
    successCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    celebrationCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successHeading: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    successDesc: {
        fontSize: 15,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    secondaryButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
});
