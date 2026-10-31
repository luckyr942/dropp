/**
 * Dropp Seller — Merchant & Store Manager App (Expo port 8084)
 * Flow: restore session → Login → (no stores ? Onboarding : Dashboard)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen.jsx';
import SellerOnboardingScreen from './src/screens/SellerOnboardingScreen.jsx';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen.jsx';
import { Button, ToastProvider } from './src/components/ui.jsx';
import { Colors, Spacing, Type } from './src/theme/sellerTheme.js';
import * as sellerApi from './src/api/sellerApi.js';

export default function App() {
    const [fontsLoaded] = useFonts({
        ...Ionicons.font,
        ...Feather.font,
        ...MaterialCommunityIcons.font,
    });
    // Checking | Login | Onboarding | Dashboard | Error
    const [screen, setScreen] = useState('Checking');
    const [user, setUser] = useState(null);
    const [store, setStore] = useState(null);
    const [bootError, setBootError] = useState('');

    const loadStores = useCallback(async (currentUser) => {
        setScreen('Checking');
        setBootError('');
        try {
            const stores = await sellerApi.fetchMyStores();
            if (stores.length > 0) {
                setStore(stores[0]);
                setScreen('Dashboard');
            } else {
                setStore(null);
                setScreen('Onboarding');
            }
        } catch (err) {
            if (err.status === 401 || err.status === 403) {
                await sellerApi.logout();
                setUser(null);
                setScreen('Login');
                return;
            }
            setUser(currentUser);
            setBootError(err.message);
            setScreen('Error');
        }
    }, []);

    useEffect(() => {
        (async () => {
            const saved = await sellerApi.restoreSession();
            if (!saved) {
                setScreen('Login');
                return;
            }
            setUser(saved);
            loadStores(saved);
        })();
    }, [loadStores]);

    // Refresh token expired/revoked anywhere in the app → back to login
    useEffect(
        () =>
            sellerApi.onSessionExpired(() => {
                setUser(null);
                setStore(null);
                setScreen('Login');
            }),
        []
    );

    const handleLogout = useCallback(async () => {
        await sellerApi.logout();
        setUser(null);
        setStore(null);
        setScreen('Login');
    }, []);

    if (!fontsLoaded || screen === 'Checking') {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <ToastProvider>
                <View style={styles.root}>
                    {screen === 'Login' && (
                        <LoginScreen
                            onLoggedIn={(u) => {
                                setUser(u);
                                loadStores(u);
                            }}
                            onCreateAccount={() => {
                                setUser(null);
                                setScreen('Onboarding');
                            }}
                        />
                    )}
                    {screen === 'Onboarding' && (
                        <SellerOnboardingScreen
                            user={user}
                            onLogin={() => setScreen('Login')}
                            onLogout={handleLogout}
                            onFinish={(createdStore) => {
                                setUser(sellerApi.getCurrentUser());
                                setStore(createdStore);
                                setScreen('Dashboard');
                            }}
                        />
                    )}
                    {screen === 'Dashboard' && store && (
                        <SellerDashboardScreen
                            key={store._id}
                            store={store}
                            user={user}
                            onStoreUpdated={setStore}
                            onLogout={handleLogout}
                        />
                    )}
                    {screen === 'Error' && (
                        <View style={styles.center}>
                            <Text style={Type.heading}>Couldn't load your store</Text>
                            <Text style={styles.errorText}>{bootError}</Text>
                            <Button title="Try again" onPress={() => loadStores(user)} style={styles.errorButton} />
                            <Button title="Log out" variant="outline" onPress={handleLogout} style={styles.errorButton} />
                        </View>
                    )}
                </View>
            </ToastProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    errorText: { ...Type.caption, fontSize: 14, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg },
    errorButton: { alignSelf: 'stretch', marginTop: Spacing.md },
});
