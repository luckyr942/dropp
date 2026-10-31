import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    EMPTY_ADDRESS,
    saveDeliveryAddress,
    validateAddress,
    addressFromDeviceLocation,
} from '../utils/deliveryAddress';

const LABELS = ['Home', 'Work', 'Other'];

/**
 * Bottom sheet to enter / confirm the delivery address.
 * Saves to AsyncStorage and returns the saved address via onSaved.
 */
export default function AddressSheet({ visible, initialAddress, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_ADDRESS);
    const [error, setError] = useState(null);
    const [locating, setLocating] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setForm({ ...EMPTY_ADDRESS, ...(initialAddress || {}) });
            setError(null);
        }
    }, [visible, initialAddress]);

    const update = (key) => (value) => {
        setForm((f) => ({ ...f, [key]: value }));
        setError(null);
    };

    const useCurrentLocation = async () => {
        setLocating(true);
        setError(null);
        try {
            const found = await addressFromDeviceLocation();
            setForm((f) => ({
                ...f,
                street: found.street || f.street,
                city: found.city || f.city,
                pincode: found.pincode || f.pincode,
                lat: found.lat,
                lng: found.lng,
            }));
        } catch (err) {
            setError(err?.message || 'Could not read your location.');
        } finally {
            setLocating(false);
        }
    };

    const save = async () => {
        const problem = validateAddress(form);
        if (problem) {
            setError(problem);
            return;
        }
        setSaving(true);
        const saved = await saveDeliveryAddress(form);
        setSaving(false);
        onSaved?.(saved);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onClose} />
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>Delivery address</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.locateBtn}
                        onPress={useCurrentLocation}
                        disabled={locating}
                        activeOpacity={0.8}
                    >
                        {locating ? (
                            <ActivityIndicator size="small" color="#008744" />
                        ) : (
                            <Ionicons name="locate" size={18} color="#008744" />
                        )}
                        <Text style={styles.locateText}>
                            {locating ? 'Finding you…' : 'Use my current location'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.labelRow}>
                        {LABELS.map((l) => (
                            <TouchableOpacity
                                key={l}
                                style={[styles.labelChip, form.label === l && styles.labelChipActive]}
                                onPress={() => update('label')(l)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.labelChipText, form.label === l && styles.labelChipTextActive]}>
                                    {l}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>Flat / house, building & street</Text>
                    <TextInput
                        style={styles.input}
                        value={form.street}
                        onChangeText={update('street')}
                        placeholder="e.g. 12B, Green Residency, MG Road"
                        placeholderTextColor="#94A3B8"
                    />

                    <View style={styles.twoCol}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={form.city}
                                onChangeText={update('city')}
                                placeholder="City"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                        <View style={{ width: 120 }}>
                            <Text style={styles.fieldLabel}>Pincode</Text>
                            <TextInput
                                style={styles.input}
                                value={form.pincode}
                                onChangeText={update('pincode')}
                                placeholder="6 digits"
                                placeholderTextColor="#94A3B8"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                    </View>

                    {error ? (
                        <View style={styles.errorRow}>
                            <Ionicons name="alert-circle" size={15} color="#DC2626" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={save}
                        disabled={saving}
                        activeOpacity={0.88}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveText}>Save address</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    dismiss: { flex: 1 },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 34,
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#0F172A' },
    locateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ECFDF5',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    locateText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#008744' },
    labelRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    labelChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    labelChipActive: { backgroundColor: '#008744', borderColor: '#008744' },
    labelChipText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12.5, color: '#475569' },
    labelChipTextActive: { color: '#FFFFFF' },
    fieldLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: '#64748B', marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 9,
        fontFamily: 'PlusJakartaSans_500Medium',
        fontSize: 14,
        color: '#0F172A',
        marginBottom: 12,
    },
    twoCol: { flexDirection: 'row', gap: 10 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    errorText: { flex: 1, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, color: '#DC2626' },
    saveBtn: {
        backgroundColor: '#008744',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    saveText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: '#FFFFFF' },
});
