import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Type } from '../theme/sellerTheme.js';
import { Button, Card, Field } from '../components/ui.jsx';
import { formatTime24 } from '../utils/format.js';
import * as sellerApi from '../api/sellerApi.js';

// Must match MERCHANT_CATEGORIES in backend/src/modules/merchants/merchantModel.js
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

const PHONE_RX = /^(\+91|91|0)?[6-9]\d{9}$/;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;
const PIN_RX = /^[1-9][0-9]{5}$/;
const cleanPhone = (p) => p.replace(/[\s-]/g, '');

/**
 * Seller onboarding.
 * - Not signed in: Welcome → Account (real /api/auth/register) → Category → Details → Review → Success
 * - Signed in without a store: Category → Details → Review → Success
 */
export default function SellerOnboardingScreen({ user, onFinish, onLogin, onLogout }) {
    const [account, setAccount] = useState(user || null);
    const steps = useMemo(
        () => (user ? ['category', 'details', 'review'] : ['welcome', 'account', 'category', 'details', 'review']),
        [user]
    );
    const [stepIndex, setStepIndex] = useState(0);
    const [done, setDone] = useState(null); // created store
    const step = done ? 'success' : steps[stepIndex];
    const progressSteps = steps.filter((s) => s !== 'welcome');

    // Account
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountErrors, setAccountErrors] = useState({});

    // Store
    const [category, setCategory] = useState(null);
    const [storeName, setStoreName] = useState('');
    const [description, setDescription] = useState('');
    const [storePhone, setStorePhone] = useState(user?.phone ? user.phone.replace(/^\+91/, '') : '');
    const [openTime, setOpenTime] = useState('');
    const [closeTime, setCloseTime] = useState('');
    const [street, setStreet] = useState('');
    const [area, setArea] = useState('');
    const [city, setCity] = useState('');
    const [stateName, setStateName] = useState('');
    const [pincode, setPincode] = useState('');
    const [detailErrors, setDetailErrors] = useState({});

    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const next = () => {
        setFormError('');
        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    };
    const back = () => {
        setFormError('');
        setStepIndex((i) => Math.max(i - 1, 0));
    };

    const submitAccount = async () => {
        const errs = {};
        if (name.trim().length < 2) errs.name = 'Enter your full name';
        if (!PHONE_RX.test(cleanPhone(phone))) errs.phone = 'Enter a valid 10-digit Indian mobile number';
        if (!EMAIL_RX.test(email.trim())) errs.email = 'Enter a valid email address';
        if (password.length < 8) errs.password = 'Use at least 8 characters';
        setAccountErrors(errs);
        if (Object.keys(errs).length) return;

        setLoading(true);
        setFormError('');
        try {
            const created = await sellerApi.register({ name, phone: cleanPhone(phone), email, password });
            setAccount(created);
            if (!storePhone) setStorePhone(cleanPhone(phone).slice(-10));
            next();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const submitDetails = () => {
        const errs = {};
        if (storeName.trim().length < 2) errs.storeName = 'Enter your store name';
        if (!PHONE_RX.test(cleanPhone(storePhone))) errs.storePhone = 'Enter a valid 10-digit mobile number';
        if (!TIME_RX.test(openTime)) errs.openTime = 'Use HH:mm, e.g. 09:00';
        if (!TIME_RX.test(closeTime)) errs.closeTime = 'Use HH:mm, e.g. 21:00';
        if (street.trim().length < 3) errs.street = 'Enter street / building';
        if (city.trim().length < 2) errs.city = 'Enter city';
        if (stateName.trim().length < 2) errs.stateName = 'Enter state';
        if (!PIN_RX.test(pincode.trim())) errs.pincode = 'Enter a valid 6-digit pincode';
        setDetailErrors(errs);
        if (!Object.keys(errs).length) next();
    };

    const publish = async () => {
        setLoading(true);
        setFormError('');
        try {
            const store = await sellerApi.createStore({
                name: storeName.trim(),
                category,
                ...(description.trim() ? { description: description.trim() } : {}),
                address: {
                    street: street.trim(),
                    ...(area.trim() ? { area: area.trim() } : {}),
                    city: city.trim(),
                    state: stateName.trim(),
                    pincode: pincode.trim(),
                },
                contact: { phone: cleanPhone(storePhone), ...(account?.email ? { email: account.email } : {}) },
                openTime,
                closeTime,
            });
            setDone(store);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const progressIndex = progressSteps.indexOf(step);
    const showHeader = step !== 'welcome' && step !== 'success';

    return (
        <SafeAreaView style={styles.container}>
            {showHeader && (
                <View style={styles.wizardHeader}>
                    {stepIndex > 0 && !(account && steps[stepIndex - 1] === 'account') ? (
                        <TouchableOpacity onPress={back} style={styles.backButton} hitSlop={8}>
                            <Feather name="chevron-left" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.backButton} />
                    )}
                    <View style={styles.progressDots}>
                        {progressSteps.map((s, i) => (
                            <View
                                key={s}
                                style={[styles.dot, i === progressIndex ? styles.dotActive : i < progressIndex ? styles.dotDone : null]}
                            />
                        ))}
                    </View>
                    {account && onLogout ? (
                        <TouchableOpacity onPress={onLogout} hitSlop={8} style={styles.headerLink}>
                            <Text style={styles.headerLinkText}>Log out</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.backButton} />
                    )}
                </View>
            )}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* ════ WELCOME ════ */}
                {step === 'welcome' && (
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
                                List your business and reach customers nearby on Dropp.
                            </Text>
                        </View>

                        <View style={styles.heroArt}>
                            {[
                                { icon: 'receipt-outline', text: 'Receive orders live' },
                                { icon: 'grid-outline', text: 'Manage your catalogue & stock' },
                                { icon: 'bar-chart-outline', text: 'Track sales every day' },
                            ].map((f) => (
                                <View key={f.text} style={styles.featureRow}>
                                    <View style={styles.featureIcon}>
                                        <Ionicons name={f.icon} size={20} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.featureText}>{f.text}</Text>
                                </View>
                            ))}
                        </View>

                        <View>
                            <Button title="Get started" icon="arrow-forward" onPress={next} />
                            <TouchableOpacity style={styles.loginLink} onPress={onLogin}>
                                <Text style={styles.loginText}>
                                    Already have an account? <Text style={styles.loginHighlight}>Log in</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ════ ACCOUNT ════ */}
                {step === 'account' && (
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <Text style={styles.stepTitle}>Create your account</Text>
                        <Text style={styles.stepSubtitle}>You'll use this to log in to Dropp Seller</Text>

                        <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" error={accountErrors.name} autoCapitalize="words" />
                        <Field
                            label="Mobile number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="10-digit mobile number"
                            keyboardType="phone-pad"
                            error={accountErrors.phone}
                        />
                        <Field
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@store.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            error={accountErrors.email}
                        />
                        <Field
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="At least 8 characters"
                            secureTextEntry
                            autoCapitalize="none"
                            textContentType="newPassword"
                            error={accountErrors.password}
                        />

                        {formError ? <ErrorBanner message={formError} /> : null}
                        <Button title="Create account" onPress={submitAccount} loading={loading} style={{ marginTop: Spacing.sm }} />
                        <TouchableOpacity style={styles.loginLink} onPress={onLogin}>
                            <Text style={styles.loginText}>
                                Already have an account? <Text style={styles.loginHighlight}>Log in</Text>
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}

                {/* ════ CATEGORY ════ */}
                {step === 'category' && (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.stepTitle}>Choose your business type</Text>
                        <Text style={styles.stepSubtitle}>
                            {account?.name ? `Hi ${account.name.split(' ')[0]}! ` : ''}Select the category that best describes your store
                        </Text>

                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => {
                                const selected = category === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.categoryCard, Shadows.card, selected && styles.categoryCardSelected]}
                                        activeOpacity={0.8}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <View style={[styles.catIconCircle, { backgroundColor: cat.bg }]}>
                                            <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
                                        </View>
                                        <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>{cat.label}</Text>
                                        {selected && (
                                            <View style={styles.selectedBadge}>
                                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Button title="Continue" onPress={next} disabled={!category} style={{ marginTop: Spacing.xxl }} />
                    </ScrollView>
                )}

                {/* ════ DETAILS ════ */}
                {step === 'details' && (
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <Text style={styles.stepTitle}>Business details</Text>
                        <Text style={styles.stepSubtitle}>Customers will see these on Dropp</Text>

                        <Field label="Store name" value={storeName} onChangeText={setStoreName} placeholder="e.g. Sharma General Store" error={detailErrors.storeName} />
                        <Field
                            label="Description (optional)"
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What do you sell?"
                            multiline
                            maxLength={500}
                        />
                        <Field
                            label="Store phone"
                            value={storePhone}
                            onChangeText={setStorePhone}
                            placeholder="10-digit mobile number"
                            keyboardType="phone-pad"
                            error={detailErrors.storePhone}
                        />

                        <Text style={styles.groupLabel}>Business hours (24-hour)</Text>
                        <View style={styles.row}>
                            <Field style={{ flex: 1 }} label="Opens" value={openTime} onChangeText={setOpenTime} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} error={detailErrors.openTime} />
                            <Field style={{ flex: 1 }} label="Closes" value={closeTime} onChangeText={setCloseTime} placeholder="21:00" keyboardType="numbers-and-punctuation" maxLength={5} error={detailErrors.closeTime} />
                        </View>

                        <Text style={styles.groupLabel}>Store address</Text>
                        <Field label="Street / building" value={street} onChangeText={setStreet} placeholder="Shop no., building, street" error={detailErrors.street} />
                        <Field label="Area / locality (optional)" value={area} onChangeText={setArea} placeholder="Locality" />
                        <View style={styles.row}>
                            <Field style={{ flex: 1 }} label="City" value={city} onChangeText={setCity} placeholder="City" error={detailErrors.city} />
                            <Field style={{ flex: 1 }} label="Pincode" value={pincode} onChangeText={setPincode} placeholder="6 digits" keyboardType="number-pad" maxLength={6} error={detailErrors.pincode} />
                        </View>
                        <Field label="State" value={stateName} onChangeText={setStateName} placeholder="State" error={detailErrors.stateName} />

                        <Button title="Continue" onPress={submitDetails} style={{ marginTop: Spacing.sm }} />
                    </ScrollView>
                )}

                {/* ════ REVIEW ════ */}
                {step === 'review' && (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Text style={styles.stepTitle}>Review & publish</Text>
                        <Text style={styles.stepSubtitle}>Check your store details before going live</Text>

                        <Card>
                            <View style={styles.summaryTop}>
                                <View style={styles.summaryIcon}>
                                    <MaterialCommunityIcons
                                        name={CATEGORIES.find((c) => c.id === category)?.icon || 'storefront-outline'}
                                        size={26}
                                        color={Colors.primary}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.summaryName}>{storeName}</Text>
                                    <Text style={styles.summaryCategory}>{category}</Text>
                                </View>
                            </View>
                            <SummaryRow icon="call-outline" text={cleanPhone(storePhone)} />
                            <SummaryRow icon="time-outline" text={`${formatTime24(openTime)} – ${formatTime24(closeTime)}`} />
                            <SummaryRow
                                icon="location-outline"
                                text={[street, area, city, stateName, pincode].map((s) => s.trim()).filter(Boolean).join(', ')}
                            />
                            {description.trim() ? <SummaryRow icon="document-text-outline" text={description.trim()} /> : null}
                        </Card>

                        <View style={styles.tipCard}>
                            <Ionicons name="bulb-outline" size={20} color="#D97706" />
                            <Text style={styles.tipDesc}>You can add products and edit settings from your dashboard after publishing.</Text>
                        </View>

                        {formError ? <ErrorBanner message={formError} /> : null}
                        <Button title="Publish store" onPress={publish} loading={loading} style={{ marginTop: Spacing.lg }} />
                    </ScrollView>
                )}

                {/* ════ SUCCESS ════ */}
                {step === 'success' && (
                    <View style={styles.screenInner}>
                        <View style={styles.successCenter}>
                            <View style={styles.celebrationCircle}>
                                <Ionicons name="checkmark-sharp" size={44} color="#FFFFFF" />
                            </View>
                            <Text style={styles.successHeading}>Your store is live!</Text>
                            <Text style={styles.successDesc}>
                                {done?.name} can now receive orders on Dropp. Add products from the dashboard to start selling.
                            </Text>
                        </View>
                        <Button title="Go to dashboard" onPress={() => onFinish(done)} />
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function SummaryRow({ icon, text }) {
    return (
        <View style={styles.summaryRow}>
            <Ionicons name={icon} size={16} color={Colors.textSecondary} />
            <Text style={styles.summaryText}>{text}</Text>
        </View>
    );
}

function ErrorBanner({ message }) {
    return (
        <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    screenInner: { flex: 1, paddingHorizontal: Spacing.xxl, justifyContent: 'space-between', paddingBottom: Spacing.xxl },
    scrollContent: { paddingHorizontal: Spacing.xxl, paddingBottom: 48 },
    wizardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    backButton: { width: 56, height: 40, justifyContent: 'center' },
    headerLink: { width: 56, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    headerLinkText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
    progressDots: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
    dotActive: { width: 24, backgroundColor: Colors.primary },
    dotDone: { backgroundColor: Colors.primaryBorder },

    welcomeTop: { paddingTop: 40 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
    logoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    heroHeading: { ...Type.title, fontSize: 32 },
    heroSubheading: { ...Type.caption, fontSize: 16, marginTop: 8, lineHeight: 23 },
    heroArt: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        gap: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.card,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: { ...Type.body, fontSize: 15 },
    loginLink: { marginTop: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.sm },
    loginText: { fontSize: 14, color: Colors.textSecondary },
    loginHighlight: { color: Colors.primary, fontWeight: '700' },

    stepTitle: { ...Type.title, marginTop: Spacing.sm },
    stepSubtitle: { ...Type.caption, fontSize: 14, marginTop: 4, marginBottom: Spacing.xxl },
    groupLabel: { ...Type.heading, fontSize: 15, marginTop: Spacing.md, marginBottom: Spacing.md },
    row: { flexDirection: 'row', gap: Spacing.md },

    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.md },
    categoryCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
    },
    categoryCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    catIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    catLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', lineHeight: 18 },
    catLabelSelected: { color: Colors.primary },
    selectedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    summaryIcon: {
        width: 52,
        height: 52,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryName: { ...Type.heading, fontSize: 18 },
    summaryCategory: { ...Type.caption, marginTop: 2 },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    summaryText: { ...Type.body, flex: 1, lineHeight: 20 },
    tipCard: {
        flexDirection: 'row',
        gap: Spacing.sm,
        alignItems: 'center',
        backgroundColor: Colors.warningLight,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginTop: Spacing.lg,
    },
    tipDesc: { fontSize: 13, color: '#92400E', flex: 1, lineHeight: 18 },
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

    successCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    celebrationCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: Colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xxl,
    },
    successHeading: { ...Type.title, textAlign: 'center' },
    successDesc: { ...Type.caption, fontSize: 15, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22, paddingHorizontal: Spacing.lg },
});
