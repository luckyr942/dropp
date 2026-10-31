import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing, Type, OrderStatusMeta } from '../theme/sellerTheme.js';

// ── Buttons ──────────────────────────────────────────────────────────

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, compact }) {
    const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
    const isDisabled = disabled || loading;
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            disabled={isDisabled}
            style={[
                styles.button,
                compact && styles.buttonCompact,
                { backgroundColor: v.bg, borderColor: v.border },
                variant === 'primary' && !isDisabled && Shadows.button,
                isDisabled && styles.buttonDisabled,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={v.fg} />
            ) : (
                <>
                    {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={v.fg} /> : null}
                    <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color: v.fg }]}>{title}</Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const BUTTON_VARIANTS = {
    primary: { bg: Colors.primary, fg: '#FFFFFF', border: Colors.primary },
    secondary: { bg: Colors.primaryLight, fg: Colors.primary, border: Colors.primaryBorder },
    outline: { bg: Colors.surface, fg: Colors.textPrimary, border: Colors.border },
    danger: { bg: Colors.dangerLight, fg: Colors.danger, border: '#FECACA' },
    success: { bg: Colors.success, fg: '#FFFFFF', border: Colors.success },
};

// ── Layout primitives ────────────────────────────────────────────────

export function Card({ children, style }) {
    return <View style={[styles.card, Shadows.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {action ? (
                <TouchableOpacity onPress={onAction} hitSlop={8}>
                    <Text style={styles.sectionAction}>{action}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

export function ScreenHeader({ title, subtitle, right }) {
    return (
        <View style={styles.screenHeader}>
            <View style={{ flex: 1 }}>
                <Text style={Type.title}>{title}</Text>
                {subtitle ? <Text style={[Type.caption, { marginTop: 2 }]}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

export function Field({ label, error, hint, style, ...inputProps }) {
    return (
        <View style={[{ marginBottom: Spacing.md }, style]}>
            {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={Colors.textMuted}
                {...inputProps}
                style={[styles.input, inputProps.multiline && styles.inputMultiline, error && styles.inputError]}
            />
            {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
        </View>
    );
}

export function Chip({ label, selected, onPress, count }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.chip, selected && styles.chipSelected]}
        >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
            {typeof count === 'number' ? (
                <View style={[styles.chipCount, selected && styles.chipCountSelected]}>
                    <Text style={[styles.chipCountText, selected && { color: Colors.primary }]}>{count}</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}

export function StatusBadge({ status }) {
    const meta = OrderStatusMeta[status] || { label: status, color: Colors.textSecondary, bg: Colors.surfaceSubtle };
    return (
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    );
}

// ── States ───────────────────────────────────────────────────────────

export function LoadingState({ label = 'Loading…' }) {
    return (
        <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Type.caption, { marginTop: Spacing.md }]}>{label}</Text>
        </View>
    );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction }) {
    return (
        <View style={styles.stateBox}>
            <View style={styles.stateIcon}>
                <Ionicons name={icon} size={28} color={Colors.primary} />
            </View>
            <Text style={styles.stateTitle}>{title}</Text>
            {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
            {actionLabel ? (
                <Button title={actionLabel} onPress={onAction} variant="secondary" compact style={{ marginTop: Spacing.lg }} />
            ) : null}
        </View>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <View style={styles.stateBox}>
            <View style={[styles.stateIcon, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="cloud-offline-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.stateTitle}>Something went wrong</Text>
            <Text style={styles.stateMessage}>{message}</Text>
            {onRetry ? (
                <Button title="Try again" onPress={onRetry} variant="outline" compact style={{ marginTop: Spacing.lg }} />
            ) : null}
        </View>
    );
}

// ── Toasts ───────────────────────────────────────────────────────────

const ToastContext = createContext({ show: () => {} });
export const useToast = () => useContext(ToastContext);

const TOAST_TONES = {
    info: { bg: Colors.textPrimary, icon: 'information-circle' },
    success: { bg: '#047857', icon: 'checkmark-circle' },
    error: { bg: '#B91C1C', icon: 'alert-circle' },
};

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const timer = useRef(null);

    const show = useCallback(
        (message, tone = 'info') => {
            if (!message) return;
            if (timer.current) clearTimeout(timer.current);
            setToast({ message: String(message), tone });
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
            timer.current = setTimeout(() => {
                Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
            }, tone === 'error' ? 4500 : 2800);
        },
        [opacity]
    );

    useEffect(() => () => timer.current && clearTimeout(timer.current), []);
    const value = useMemo(() => ({ show }), [show]);
    const tone = TOAST_TONES[toast?.tone] || TOAST_TONES.info;

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast ? (
                <Animated.View pointerEvents="none" style={[styles.toast, { backgroundColor: tone.bg, opacity }]}>
                    <Ionicons name={tone.icon} size={18} color="#FFFFFF" />
                    <Text style={styles.toastText}>{toast.message}</Text>
                </Animated.View>
            ) : null}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 52,
        borderRadius: Radius.md,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    buttonCompact: { height: 40, borderRadius: Radius.sm + 2, paddingHorizontal: Spacing.md },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { fontSize: 16, fontWeight: '700' },
    buttonTextCompact: { fontSize: 14 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.xxl,
        marginBottom: Spacing.md,
    },
    sectionTitle: { ...Type.heading },
    sectionAction: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        gap: Spacing.md,
    },
    fieldLabel: { ...Type.label, marginBottom: 6 },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: Colors.textPrimary,
    },
    inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
    inputError: { borderColor: Colors.danger },
    fieldError: { color: Colors.danger, fontSize: 12, marginTop: 4, fontWeight: '500' },
    fieldHint: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.pill,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    chipTextSelected: { color: '#FFFFFF' },
    chipCount: {
        minWidth: 20,
        paddingHorizontal: 5,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipCountSelected: { backgroundColor: '#FFFFFF' },
    chipCountText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: Spacing.xxl },
    stateIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    stateTitle: { ...Type.heading, textAlign: 'center' },
    stateMessage: { ...Type.caption, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    toast: {
        position: 'absolute',
        top: 60,
        left: Spacing.xl,
        right: Spacing.xl,
        borderRadius: Radius.md,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...Shadows.card,
        shadowOpacity: 0.2,
        elevation: 8,
    },
    toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
});
