import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Type } from '../theme/sellerTheme.js';
import { Button, Field } from '../components/ui.jsx';
import * as sellerApi from '../api/sellerApi.js';

export default function LoginScreen({ onLoggedIn, onCreateAccount }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canSubmit = identifier.trim().length >= 3 && password.length > 0 && !loading;

    const handleLogin = async () => {
        if (!canSubmit) return;
        setError('');
        setLoading(true);
        try {
            const user = await sellerApi.login(identifier, password);
            onLoggedIn(user);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.brandRow}>
                        <View style={styles.logo}>
                            <Ionicons name="storefront" size={26} color={Colors.primary} />
                        </View>
                        <Text style={styles.brand}>Dropp Seller</Text>
                    </View>

                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Log in to manage your store, orders and catalogue.</Text>

                    <View style={styles.form}>
                        <Field
                            label="Email or phone number"
                            value={identifier}
                            onChangeText={setIdentifier}
                            placeholder="you@store.com or 98765 43210"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="username"
                            returnKeyType="next"
                        />
                        <View>
                            <Field
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Your password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                textContentType="password"
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity
                                style={styles.eye}
                                onPress={() => setShowPassword((v) => !v)}
                                hitSlop={10}
                                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <Button title="Log in" onPress={handleLogin} loading={loading} disabled={!canSubmit} style={{ marginTop: Spacing.sm }} />
                    </View>

                    <TouchableOpacity style={styles.switchLink} onPress={onCreateAccount}>
                        <Text style={styles.switchText}>
                            New to Dropp? <Text style={styles.switchHighlight}>Create a seller account</Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingTop: 48, paddingBottom: Spacing.xxl },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 40 },
    logo: {
        width: 48,
        height: 48,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    title: { ...Type.title, fontSize: 28 },
    subtitle: { ...Type.caption, fontSize: 15, marginTop: 6, lineHeight: 21 },
    form: { marginTop: 32 },
    eye: { position: 'absolute', right: 14, top: 38 },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.dangerLight,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    errorText: { color: Colors.danger, fontSize: 13, fontWeight: '600', flex: 1 },
    switchLink: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
    switchText: { fontSize: 14, color: Colors.textSecondary },
    switchHighlight: { color: Colors.primary, fontWeight: '700' },
});
