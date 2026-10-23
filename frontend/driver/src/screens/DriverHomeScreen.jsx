import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/themeContext';
import RideOfferModal from './RideOfferModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
// On a physical phone set EXPO_PUBLIC_WS_URL=ws://<LAN-IP>:4000 in frontend/.env
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || API_BASE.replace(/^http/, 'ws');

const DRIVER_ID_KEY = '@dropp_driver_id';

export default function DriverHomeScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();

    // ── Driver Identity ────────────────────────────────────────────
    const [driverId, setDriverId] = useState(null);   // MongoDB _id from registration
    const [driverProfile, setDriverProfile] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    // ── Offer State ────────────────────────────────────────────────
    const [currentOffer, setCurrentOffer] = useState(null);
    const [showOffer, setShowOffer] = useState(false);
    const lastHandledOfferId = useRef(null);

    // ── Registration Modal ─────────────────────────────────────────
    const [showRegModal, setShowRegModal] = useState(false);
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regVehicleType, setRegVehicleType] = useState('cab_economy');
    const [regVehicleModel, setRegVehicleModel] = useState('');
    const [regVehicleNumber, setRegVehicleNumber] = useState('');
    const [registering, setRegistering] = useState(false);

    // Stats (local)
    const [earningsToday, setEarningsToday] = useState(0);
    const [tripsToday, setTripsToday] = useState(0);

    // ── 1. Load saved driverId on mount ───────────────────────────
    useEffect(() => {
        let isMounted = true;
        async function loadDriver() {
            try {
                const id = await AsyncStorage.getItem(DRIVER_ID_KEY);
                if (!isMounted) return;
                if (id) {
                    setDriverId(id);
                    try {
                        const res = await fetch(`${API_BASE}/api/drivers/${id}`);
                        const json = await res.json();
                        if (isMounted && json.success) setDriverProfile(json.data);
                    } catch (_) { }
                } else {
                    setShowRegModal(true);
                }
            } catch (err) {
                console.warn('[DriverApp] Could not load saved driverId:', err.message);
                if (isMounted) setShowRegModal(true);
            }
        }
        loadDriver();
        return () => { isMounted = false; };
    }, []);

    // ── 2. WebSocket listener ─────────────────────────────────────
    useEffect(() => {
        let ws;
        let pollInterval;
        let isMounted = true;

        function connect() {
            try {
                ws = new WebSocket(WS_URL);
                ws.onopen = () => { if (isMounted) setWsConnected(true); };
                ws.onclose = () => {
                    if (isMounted) {
                        setWsConnected(false);
                        setTimeout(connect, 3000);
                    }
                };
                ws.onerror = () => { if (isMounted) setWsConnected(false); };
                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (
                            msg.type === 'driver.incoming_offer' ||
                            msg.type === 'ORDER_CONFIRMED'
                        ) {
                            handleIncomingOffer(msg.data || msg);
                        }
                    } catch (err) {
                        console.warn('[DriverApp] WS parse error:', err.message);
                    }
                };
            } catch (err) {
                console.warn('[DriverApp] WS connect error:', err.message);
            }
        }

        connect();

        // Polling fallback — catches offers if WS drops
        pollInterval = setInterval(async () => {
            if (!isMounted || !isOnline) return;
            try {
                const res = await fetch(`${API_BASE}/api/rides/driver/latest-offer`);
                const json = await res.json();
                if (json.success && json.data?.offerId !== lastHandledOfferId.current) {
                    handleIncomingOffer(json.data);
                }
            } catch (_) { }
        }, 3000);

        return () => {
            isMounted = false;
            ws?.close();
            clearInterval(pollInterval);
        };
    }, [isOnline]);

    function handleIncomingOffer(raw) {
        if (!raw || !isOnline) return;  // ignore if driver is offline
        if (raw.offerId === lastHandledOfferId.current) return;
        lastHandledOfferId.current = raw.offerId;

        setCurrentOffer({
            offerId: raw.offerId || 'offer_' + Date.now(),
            rideId: raw.offerId,   // offerId IS the rideId in bookRide
            serviceType: raw.serviceType || 'RIDE',
            fare: raw.fare || '₹—',
            distance: raw.distance || '—',
            pickup: raw.pickup || '—',
            destination: raw.destination || '—',
            otp: raw.otp || '—',
            customerName: raw.customerName || 'Customer',
        });
        setShowOffer(true);
    }

    // ── Accept Offer ───────────────────────────────────────────────
    // Calls real backend: POST /api/drivers/:driverId/accept/:rideId
    // Backend updates the ride with real driver data and emits to customer
    const handleAcceptOffer = async (offer) => {
        setShowOffer(false);

        if (!driverId) {
            Alert.alert('Not Registered', 'Please register first.');
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE}/api/drivers/${driverId}/accept/${offer.rideId}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            );
            const json = await res.json();

            if (json.success) {
                setTripsToday((t) => t + 1);
                setEarningsToday((e) => e + (json.data?.ride?.fare || 0));
                Alert.alert('✅ Ride Accepted!', `Navigate to ${offer.pickup}`);
                if (onNavigate) onNavigate('DriverNav');
            } else {
                Alert.alert('Could Not Accept', json.error || 'The ride may have been cancelled.');
            }
        } catch (err) {
            console.error('[DriverApp] Accept error:', err.message);
            Alert.alert('Error', 'Connection error. Could not accept ride.');
        }
    };

    const handleDeclineOffer = () => {
        setShowOffer(false);
        setCurrentOffer(null);
    };

    // ── Online / Offline Toggle ────────────────────────────────────
    const handleToggleOnline = async () => {
        if (!driverId) {
            setShowRegModal(true);
            return;
        }
        const goingOnline = !isOnline;
        try {
            const endpoint = goingOnline ? 'online' : 'offline';
            await fetch(`${API_BASE}/api/drivers/${driverId}/${endpoint}`, {
                method: 'POST',
            });
            setIsOnline(goingOnline);
        } catch (err) {
            console.warn('[DriverApp] Toggle online error:', err.message);
            // Still update local state — server will sync on next call
            setIsOnline(goingOnline);
        }
    };

    // ── Register Driver ────────────────────────────────────────────
    const handleRegister = async () => {
        if (!regName.trim() || !regPhone.trim() || !regVehicleModel.trim() || !regVehicleNumber.trim()) {
            Alert.alert('Missing Fields', 'Fill in all fields to continue.');
            return;
        }
        setRegistering(true);
        try {
            const res = await fetch(`${API_BASE}/api/drivers/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: regName.trim(),
                    phone: regPhone.trim(),
                    vehicleType: regVehicleType,
                    vehicleModel: regVehicleModel.trim(),
                    vehicleNumber: regVehicleNumber.trim(),
                }),
            });
            const json = await res.json();
            if (json.success) {
                const id = json.data._id;
                try {
                    await AsyncStorage.setItem(DRIVER_ID_KEY, id);
                } catch (err) {
                    console.warn('[DriverApp] Could not persist driverId:', err.message);
                }
                setDriverId(id);
                setDriverProfile(json.data);
                setShowRegModal(false);
                Alert.alert('🎉 Welcome!', `Registered as ${json.data.name}. Tap GO ONLINE to start.`);
            } else {
                Alert.alert('Registration Failed', json.error || 'Try again.');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not reach the server. Check your connection.');
        } finally {
            setRegistering(false);
        }
    };

    const VEHICLE_TYPES = [
        { value: 'bike', label: '🏍️  Bike' },
        { value: 'auto', label: '🛺  Auto' },
        { value: 'cab_economy', label: '🚗  Cab (Economy)' },
        { value: 'cab_premium', label: '🚙  Cab (Premium)' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.inputSeparator }]}>
                <View style={styles.titleRow}>
                    <Ionicons name="car-sport" size={24} color={theme.primaryGreen} />
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        {driverProfile ? driverProfile.name : 'Dropp Partner'}
                    </Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: isOnline ? theme.tierCardActiveBg : theme.inputBg }]}>
                    <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.primaryGreen : '#94A3B8' }]} />
                    <Text style={[styles.statusText, { color: isOnline ? theme.primaryGreen : theme.textSecondary }]}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Driver Profile Card */}
                {driverProfile && (
                    <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="person-circle" size={40} color={theme.primaryGreen} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                                {driverProfile.name}
                            </Text>
                            <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
                                {driverProfile.vehicleModel} • {driverProfile.vehicleNumber}
                            </Text>
                            <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
                                ⭐ {driverProfile.rating?.toFixed(1)} • {driverProfile.totalTrips} trips
                            </Text>
                        </View>
                    </View>
                )}

                {/* Online / Offline Toggle */}
                <TouchableOpacity
                    style={[
                        styles.onlineToggleBtn,
                        {
                            backgroundColor: isOnline ? theme.surface : theme.primaryGreen,
                            borderColor: isOnline ? theme.primaryGreen : 'transparent',
                        },
                    ]}
                    onPress={handleToggleOnline}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name={isOnline ? 'power-outline' : 'power'}
                        size={38}
                        color={isOnline ? theme.primaryGreen : '#000000'}
                    />
                    <Text style={[styles.onlineBtnText, { color: isOnline ? theme.primaryGreen : '#000000' }]}>
                        {isOnline ? 'YOU ARE ONLINE • READY FOR DISPATCH' : 'GO ONLINE'}
                    </Text>
                    <Text style={[styles.onlineBtnSub, { color: isOnline ? theme.textSecondary : 'rgba(0,0,0,0.7)' }]}>
                        {wsConnected
                            ? '🟢 Live dispatch connected'
                            : '🔴 Connecting to dispatch server...'}
                    </Text>
                </TouchableOpacity>

                {/* Earnings Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.primaryGreen }]}>₹{earningsToday}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Earned Today</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.statValue, { color: theme.primaryGreen }]}>{tripsToday}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Trips Today</Text>
                    </View>
                </View>

                {/* Register / Edit Profile */}
                <TouchableOpacity
                    style={[styles.editProfileBtn, { backgroundColor: theme.surface }]}
                    onPress={() => setShowRegModal(true)}
                >
                    <Ionicons name="create-outline" size={18} color={theme.primaryGreen} />
                    <Text style={[styles.editProfileText, { color: theme.textPrimary }]}>
                        {driverProfile ? 'Edit Profile' : 'Register as Driver'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            {/* ── Incoming Offer Modal ── */}
            {showOffer && currentOffer && (
                <RideOfferModal
                    offer={currentOffer}
                    onAccept={handleAcceptOffer}
                    onDecline={handleDeclineOffer}
                />
            )}

            {/* ── Registration Modal ── */}
            <Modal visible={showRegModal} animationType="slide" transparent>
                <View style={styles.regOverlay}>
                    <View style={[styles.regCard, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.regTitle, { color: theme.textPrimary }]}>
                            {driverProfile ? 'Edit Profile' : 'Register as Dropp Partner'}
                        </Text>

                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.inputSeparator }]}
                            placeholder="Full Name"
                            placeholderTextColor={theme.textSecondary}
                            value={regName}
                            onChangeText={setRegName}
                        />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.inputSeparator }]}
                            placeholder="Phone Number"
                            placeholderTextColor={theme.textSecondary}
                            value={regPhone}
                            onChangeText={setRegPhone}
                            keyboardType="phone-pad"
                        />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.inputSeparator }]}
                            placeholder="Vehicle Model (e.g. Honda Activa)"
                            placeholderTextColor={theme.textSecondary}
                            value={regVehicleModel}
                            onChangeText={setRegVehicleModel}
                        />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.inputSeparator }]}
                            placeholder="Vehicle Number (e.g. DL 4S AB 1234)"
                            placeholderTextColor={theme.textSecondary}
                            value={regVehicleNumber}
                            onChangeText={(t) => setRegVehicleNumber(t.toUpperCase())}
                            autoCapitalize="characters"
                        />

                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Vehicle Type</Text>
                        <View style={styles.vehicleTypeRow}>
                            {VEHICLE_TYPES.map((vt) => (
                                <TouchableOpacity
                                    key={vt.value}
                                    style={[
                                        styles.vehicleTypeBtn,
                                        {
                                            backgroundColor: regVehicleType === vt.value
                                                ? theme.primaryGreen
                                                : theme.inputBg,
                                        },
                                    ]}
                                    onPress={() => setRegVehicleType(vt.value)}
                                >
                                    <Text style={{ color: regVehicleType === vt.value ? '#000' : theme.textPrimary, fontSize: 12, fontWeight: '700' }}>
                                        {vt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.regSubmitBtn, { backgroundColor: theme.primaryGreen }]}
                            onPress={handleRegister}
                            disabled={registering}
                        >
                            {registering
                                ? <ActivityIndicator color="#000" />
                                : <Text style={styles.regSubmitText}>Save & Continue</Text>
                            }
                        </TouchableOpacity>

                        {driverProfile && (
                            <TouchableOpacity onPress={() => setShowRegModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
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
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    scrollContent: { padding: 16, gap: 14 },
    profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
    profileName: { fontSize: 16, fontWeight: '800' },
    profileSub: { fontSize: 12, marginTop: 2 },
    onlineToggleBtn: { borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1.5 },
    onlineBtnText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    onlineBtnSub: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 28, fontWeight: '900' },
    statLabel: { fontSize: 11, fontWeight: '600' },
    editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 16 },
    editProfileText: { fontSize: 14, fontWeight: '700' },
    regOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: 16 },
    regCard: { borderRadius: 24, padding: 24, gap: 12 },
    regTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: '600' },
    inputLabel: { fontSize: 12, fontWeight: '700' },
    vehicleTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vehicleTypeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    regSubmitBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 4 },
    regSubmitText: { fontSize: 15, fontWeight: '900', color: '#000' },
});
