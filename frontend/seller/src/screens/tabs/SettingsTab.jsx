import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '../../theme/sellerTheme.js';
import { Button, Card, ScreenHeader, SectionHeader, useToast } from '../../components/ui.jsx';
import { formatAddress, formatTime24 } from '../../utils/format.js';
import * as sellerApi from '../../api/sellerApi.js';

export default function SettingsTab({ store, user, onStoreUpdated, onLogout }) {
    const toast = useToast();
    const [saving, setSaving] = useState(null); // key being saved
    const [optimistic, setOptimistic] = useState({}); // key → value while saving

    const value = (key) => {
        if (key in optimistic) return optimistic[key];
        if (key === 'isOpen') return Boolean(store.isOpen);
        return store.settings?.[key] !== false;
    };

    const save = async (key, next) => {
        setSaving(key);
        setOptimistic((o) => ({ ...o, [key]: next }));
        try {
            const body = key === 'isOpen' ? { isOpen: next } : { settings: { [key]: next } };
            const updated = await sellerApi.updateStore(store._id, body);
            onStoreUpdated(updated);
        } catch (err) {
            toast.show(`Could not save: ${err.message}`, 'error'); // switch snaps back to the server value
        } finally {
            setOptimistic((o) => {
                const { [key]: _drop, ...rest } = o;
                return rest;
            });
            setSaving(null);
        }
    };

    const confirmLogout = () =>
        Alert.alert('Log out?', 'You will need your email/phone and password to log in again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: onLogout },
        ]);

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ScreenHeader title="Settings" subtitle={store.name} />

            <Card style={{ paddingVertical: Spacing.sm }}>
                <SettingRow
                    icon="storefront-outline"
                    title="Store open"
                    subtitle="Show your store as open on Dropp"
                    value={value('isOpen')}
                    disabled={saving === 'isOpen'}
                    onChange={(v) => save('isOpen', v)}
                />
                <SettingRow
                    icon="receipt-outline"
                    title="Accepting orders"
                    subtitle="Pause to stop new orders temporarily"
                    value={value('acceptingOrders')}
                    disabled={saving === 'acceptingOrders'}
                    onChange={(v) => save('acceptingOrders', v)}
                    divider
                />
                <SettingRow
                    icon="mic-outline"
                    title="Aura voice front-desk"
                    subtitle="Let Aura answer stock & price questions by voice"
                    value={value('auraSupportEnabled')}
                    disabled={saving === 'auraSupportEnabled'}
                    onChange={(v) => save('auraSupportEnabled', v)}
                    divider
                />
            </Card>

            <SectionHeader title="Store details" />
            <Card>
                <InfoRow icon="pricetag-outline" label="Category" value={store.category} />
                <InfoRow icon="time-outline" label="Hours" value={`${formatTime24(store.openTime)} – ${formatTime24(store.closeTime)}`} />
                <InfoRow icon="call-outline" label="Phone" value={store.contact?.phone} />
                <InfoRow icon="location-outline" label="Address" value={formatAddress(store.address)} last />
            </Card>

            {user ? (
                <>
                    <SectionHeader title="Account" />
                    <Card>
                        <InfoRow icon="person-outline" label="Name" value={user.name} />
                        {user.email ? <InfoRow icon="mail-outline" label="Email" value={user.email} /> : null}
                        <InfoRow icon="phone-portrait-outline" label="Mobile" value={user.phone} last />
                    </Card>
                </>
            ) : null}

            <Button title="Log out" icon="log-out-outline" variant="danger" onPress={confirmLogout} style={{ marginTop: Spacing.xxl }} />
        </ScrollView>
    );
}

function SettingRow({ icon, title, subtitle, value, onChange, disabled, divider }) {
    return (
        <View style={[styles.settingRow, divider && styles.divider]}>
            <View style={styles.iconWrap}>
                <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSub}>{subtitle}</Text>
            </View>
            <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: Colors.primary, false: Colors.border }} />
        </View>
    );
}

function InfoRow({ icon, label, value, last }) {
    if (!value) return null;
    return (
        <View style={[styles.infoRow, !last && styles.infoDivider]}>
            <Ionicons name={icon} size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: Spacing.xl, paddingBottom: 48 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
    divider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: Radius.sm + 2,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingTitle: { ...Type.body, fontWeight: '700' },
    settingSub: { ...Type.caption, marginTop: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm + 2 },
    infoDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    infoLabel: { ...Type.caption, width: 72 },
    infoValue: { ...Type.body, flex: 1, textAlign: 'right' },
});
