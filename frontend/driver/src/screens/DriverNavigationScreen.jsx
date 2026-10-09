import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import { useRideStore } from '../../../shared/store/rideStore';

export default function DriverNavigationScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();
    const { deliveryOtp } = useRideStore();
    const [step, setStep] = useState('PICKUP'); // 'PICKUP' | 'EN_ROUTE' | 'VERIFY_OTP'
    const [enteredOtp, setEnteredOtp] = useState('');
    const [otpError, setOtpError] = useState(false);

    const handleNextStep = () => {
        if (step === 'PICKUP') {
            setStep('EN_ROUTE');
        } else if (step === 'EN_ROUTE') {
            setStep('VERIFY_OTP');
        } else if (step === 'VERIFY_OTP') {
            if (enteredOtp === deliveryOtp || enteredOtp === '4821') {
                alert('Trip & Delivery Successfully Verified!');
                if (onNavigate) onNavigate('DriverHome');
            } else {
                setOtpError(true);
            }
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Turn-by-Turn GPS Banner */}
            <View style={[styles.gpsHeader, { backgroundColor: theme.primaryGreen }]}>
                <View style={styles.gpsRow}>
                    <Ionicons name="arrow-turn-sharp-right" size={36} color="#000" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.gpsDistance}>In 200 meters</Text>
                        <Text style={styles.gpsStreet}>Turn right onto MG Road Express</Text>
                    </View>
                </View>
            </View>

            {/* Map Canvas Mockup */}
            <View style={styles.mapContainer}>
                <View style={[styles.routePath, { borderColor: theme.primaryGreen }]} />
                <View style={[styles.driverDot, { backgroundColor: theme.primaryGreen }]}>
                    <Ionicons name="navigate" size={20} color="#000" />
                </View>
            </View>

            {/* Driver Control Bottom Sheet */}
            <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
                <View style={styles.sheetHeader}>
                    <View>
                        <Text style={[styles.stageTitle, { color: theme.textPrimary }]}>
                            {step === 'PICKUP' ? 'Navigating to Pickup' : step === 'EN_ROUTE' ? 'In Transit to Destination' : 'Verify Delivery Security OTP'}
                        </Text>
                        <Text style={[styles.stageSub, { color: theme.textSecondary }]}>
                            {step === 'PICKUP' ? 'Customer: Sarah Connor • Package < 2kg' : step === 'EN_ROUTE' ? 'Destination: Green Park Main' : 'Ask recipient for 4-digit code'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: theme.inputBg }]}
                        onPress={() => alert('Calling Customer...')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="call" size={20} color={theme.primaryGreen} />
                    </TouchableOpacity>
                </View>

                {/* OTP Input Field when verifying delivery */}
                {step === 'VERIFY_OTP' && (
                    <View style={styles.otpBox}>
                        <Text style={[styles.otpInputLabel, { color: theme.textPrimary }]}>Enter Recipient's 4-Digit OTP</Text>
                        <TextInput
                            style={[
                                styles.otpInput,
                                {
                                    backgroundColor: theme.inputBg,
                                    color: theme.textPrimary,
                                    borderColor: otpError ? '#EF4444' : theme.primaryGreen,
                                },
                            ]}
                            placeholder="e.g. 4821"
                            placeholderTextColor={theme.placeholder}
                            keyboardType="number-pad"
                            maxLength={4}
                            value={enteredOtp}
                            onChangeText={(text) => {
                                setEnteredOtp(text);
                                setOtpError(false);
                            }}
                        />
                        {otpError && (
                            <Text style={styles.errorText}>Invalid OTP code. Please retry (Hint: 4821)</Text>
                        )}
                    </View>
                )}

                {/* Primary Action Button */}
                <TouchableOpacity
                    style={[styles.primaryCta, { backgroundColor: theme.primaryGreen }]}
                    onPress={handleNextStep}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryCtaText}>
                        {step === 'PICKUP' ? 'Arrived at Pickup' : step === 'EN_ROUTE' ? 'Arrived at Dropoff' : 'Complete Delivery'}
                    </Text>
                    <Ionicons name="checkmark-done" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gpsHeader: {
        padding: 16,
        paddingTop: 12,
        elevation: 6,
    },
    gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    gpsDistance: { color: '#000', fontSize: 13, fontWeight: '800' },
    gpsStreet: { color: '#000', fontSize: 18, fontWeight: '900' },
    mapContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    routePath: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 4,
        borderStyle: 'dashed',
    },
    driverDot: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
    },
    bottomSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 30,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    stageTitle: { fontSize: 18, fontWeight: '800' },
    stageSub: { fontSize: 12, marginTop: 2 },
    callBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpBox: { marginBottom: 16 },
    otpInputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
    otpInput: {
        height: 52,
        borderRadius: 14,
        borderWidth: 2,
        paddingHorizontal: 16,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 8,
        textAlign: 'center',
    },
    errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    primaryCta: {
        flexDirection: 'row',
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryCtaText: { color: '#000', fontWeight: '900', fontSize: 16 },
});
