import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

const WEIGHT_TIERS = [
    { id: 'small', label: 'Small', sub: '< 1 kg', icon: 'cube-outline', price: 12.50 },
    { id: 'medium', label: 'Medium', sub: '1 - 5 kg', icon: 'archive-outline', price: 18.50 },
    { id: 'heavy', label: 'Heavy', sub: '> 5 kg', icon: 'car-sport-outline', price: 28.00 },
];

export default function PackageDetailsScreen({ onBack, onNavigate }) {
    const { theme, isDark } = useTheme();
    const { packageDetails, setPackageDetails, setRideStatus } = useRideStore();

    const [weight, setWeight] = useState(packageDetails.weightTier || 'medium');
    const [desc, setDesc] = useState(packageDetails.description || '');
    const [name, setName] = useState(packageDetails.recipientName || '');
    const [phone, setPhone] = useState(packageDetails.recipientPhone || '');
    const [requireOtp, setRequireOtp] = useState(packageDetails.requireOtp ?? true);

    const selectedTierObj = WEIGHT_TIERS.find((t) => t.id === weight) || WEIGHT_TIERS[1];

    const handleProceed = () => {
        setPackageDetails({
            weightTier: weight,
            description: desc,
            recipientName: name,
            recipientPhone: phone,
            requireOtp,
        });
        setRideStatus('SEARCHING');
        if (onNavigate) {
            onNavigate('FindingDriver');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.inputSeparator }]}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Package Details</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Weight Selection */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Parcel Weight</Text>
                <View style={styles.weightRow}>
                    {WEIGHT_TIERS.map((tier) => {
                        const active = tier.id === weight;
                        return (
                            <TouchableOpacity
                                key={tier.id}
                                style={[
                                    styles.weightCard,
                                    {
                                        backgroundColor: active ? theme.tierCardActiveBg : theme.surface,
                                        borderColor: active ? theme.primaryGreen : 'transparent',
                                    },
                                ]}
                                onPress={() => setWeight(tier.id)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={tier.icon}
                                    size={24}
                                    color={active ? theme.primaryGreen : theme.textSecondary}
                                />
                                <Text style={[styles.weightLabel, { color: theme.textPrimary }]}>{tier.label}</Text>
                                <Text style={[styles.weightSub, { color: theme.textSecondary }]}>{tier.sub}</Text>
                                <Text style={[styles.weightPrice, { color: theme.primaryGreen }]}>${tier.price.toFixed(2)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Package Description Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Parcel Contents / Notes</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                        <Ionicons name="document-text-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            placeholder="e.g. Documents, Laptop charger, Birthday gift"
                            placeholderTextColor={theme.placeholder}
                            value={desc}
                            onChangeText={setDesc}
                        />
                    </View>
                </View>

                {/* Recipient Details */}
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 12 }]}>Recipient Information</Text>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Recipient Name</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                        <Ionicons name="person-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            placeholder="Full Name"
                            placeholderTextColor={theme.placeholder}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Phone Number</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
                        <Ionicons name="call-outline" size={20} color={theme.placeholder} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary }]}
                            placeholder="+1 (555) 000-0000"
                            placeholderTextColor={theme.placeholder}
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                    </View>
                </View>

                {/* Security OTP Toggle */}
                <View style={[styles.otpRow, { backgroundColor: theme.surface }]}>
                    <View style={styles.otpTextCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="shield-checkmark" size={18} color={theme.primaryGreen} />
                            <Text style={[styles.otpTitle, { color: theme.textPrimary }]}>Recipient OTP Verification</Text>
                        </View>
                        <Text style={[styles.otpSub, { color: theme.textSecondary }]}>
                            Driver must verify 4-digit code with recipient before handing over.
                        </Text>
                    </View>
                    <Switch
                        value={requireOtp}
                        onValueChange={setRequireOtp}
                        trackColor={{ false: '#334155', true: '#166534' }}
                        thumbColor={requireOtp ? theme.primaryGreen : '#94A3B8'}
                    />
                </View>
            </ScrollView>

            {/* Bottom Fare & Confirm */}
            <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.inputSeparator }]}>
                <View style={styles.priceCol}>
                    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Estimated Total</Text>
                    <Text style={[styles.totalAmount, { color: theme.primaryGreen }]}>
                        ${selectedTierObj.price.toFixed(2)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: theme.primaryGreen }]}
                    onPress={handleProceed}
                    activeOpacity={0.8}
                >
                    <Text style={styles.confirmText}>Find Courier</Text>
                    <Ionicons name="arrow-forward" size={18} color="#000" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 110 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    weightRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    weightCard: {
        flex: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    weightLabel: { fontWeight: '700', fontSize: 13, marginTop: 6 },
    weightSub: { fontSize: 11, marginTop: 2 },
    weightPrice: { fontWeight: '800', fontSize: 13, marginTop: 6 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, fontWeight: '500' },
    otpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginTop: 8,
    },
    otpTextCol: { flex: 1, marginRight: 12 },
    otpTitle: { fontSize: 14, fontWeight: '700' },
    otpSub: { fontSize: 12, marginTop: 4, lineHeight: 16 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    priceCol: { justifyContent: 'center' },
    totalLabel: { fontSize: 12, fontWeight: '500' },
    totalAmount: { fontSize: 22, fontWeight: '800' },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        height: 48,
        borderRadius: 14,
        gap: 8,
    },
    confirmText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
