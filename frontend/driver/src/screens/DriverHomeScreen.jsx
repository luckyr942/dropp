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
import * as Location from 'expo-location';
import { useRideStore } from '../../../shared/store/rideStore';
import { API_BASE, WS_BASE } from '../../../shared/utils/apiConfig';

const DRIVER_ID_KEY = '@dropp_driver_id';
const DRIVER_PROFILE_KEY = '@dropp_driver_profile';

const SERVICE_OPTIONS = [
    { key: 'RIDE', label: '🚗 Rides' },
    { key: 'FOOD', label: '🍕 Food' },
    { key: 'GROCERY', label: '🥦 Groceries' },
    { key: 'PARCEL', label: '📦 Parcels' },
];

// Offers this driver already accepted/declined. Module scope so it survives the screen remounting
// when the driver comes back from navigation (a ref would reset and the old offer would pop up again).
const handledOffers = new Set();

// iOS simulators default to California; never publish that as a Dropp driver position
const isInServiceArea = (lat, lng) => lat > 6 && lat < 37.5 && lng > 68 && lng < 97.5;

export default function DriverHomeScreen({ onNavigate }) {
    const { theme, isDark } = useTheme();

    // Driver Identity
    const [driverId, setDriverId] = useState(null);
    const [driverProfile, setDriverProfile] = useState(null);
    const [isOnline, setIsOnline] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);

    // Multi-Service Capabilities
    const [enabledServices, setEnabledServices] = useState(['RIDE', 'FOOD', 'GROCERY', 'PARCEL']);

    // Offer State
    const [currentOffer, setCurrentOffer] = useState(null);
    const [showOffer, setShowOffer] = useState(false);
    // Refs so the long-lived socket handler always sees current values without reconnecting
    const currentOfferRef = useRef(null);
    const isOnlineRef = useRef(true);
    const enabledServicesRef = useRef(['RIDE', 'FOOD', 'GROCERY', 'PARCEL']);
    useEffect(() => { currentOfferRef.current = showOffer ? currentOffer : null; }, [currentOffer, showOffer]);
    useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
    useEffect(() => { enabledServicesRef.current = enabledServices; }, [enabledServices]);

    // Registration Modal
    const [showRegModal, setShowRegModal] = useState(false);
    const [regName, setRegName] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regVehicleType, setRegVehicleType] = useState('cab_economy');
    const [regVehicleModel, setRegVehicleModel] = useState('');
    const [regVehicleNumber, setRegVehicleNumber] = useState('');
    const [registering, setRegistering] = useState(false);

    // Switch Driver Profile Modal (for multi-simulator testing)
    const [showSwitchModal, setShowSwitchModal] = useState(false);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);

    // Stats
    const [earningsToday, setEarningsToday] = useState(0);
    const [tripsToday, setTripsToday] = useState(0);

    // 1. Load saved driver & sync metrics from MongoDB
    useEffect(() => {
        let isMounted = true;
        async function loadDriver() {
            try {
                // Auto-sync with fleet and prefer Pradeep Bose for hackathon pitch
                try {
                    const res = await fetch(`${API_BASE}/api/drivers`);
                    const json = await res.json();
                    if (json.success && json.data && json.data.length > 0) {
                        const pradeep = json.data.find((d) => d.name === 'Pradeep Bose') || json.data[0];
                        if (pradeep && isMounted) {
                            setDriverId(pradeep._id);
                            setDriverProfile(pradeep);
                            if (pradeep.enabledServices) setEnabledServices(pradeep.enabledServices);
                            setEarningsToday(Number(pradeep.earningsToday) || 840);
                            setTripsToday(Number(pradeep.tripsToday) || 3);
                            setIsOnline(true);
                            setShowRegModal(false);
                            await Promise.all([
                                AsyncStorage.setItem(DRIVER_ID_KEY, pradeep._id),
                                AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(pradeep)),
                            ]);
                            return;
                        }
                    }
                } catch (_) {}

                const [savedId, savedProfileStr] = await Promise.all([
                    AsyncStorage.getItem(DRIVER_ID_KEY),
                    AsyncStorage.getItem(DRIVER_PROFILE_KEY),
                ]);

                let activeId = savedId;
                if (savedProfileStr) {
                    try {
                        const parsed = JSON.parse(savedProfileStr);
                        if (isMounted) {
                            setDriverProfile(parsed);
                            if (parsed.enabledServices) setEnabledServices(parsed.enabledServices);
                            setEarningsToday(Number(parsed.earningsToday) || 0);
                            setTripsToday(Number(parsed.tripsToday) || 0);
                            if (!activeId) activeId = parsed._id;
                        }
                    } catch (_) {}
                }

                if (activeId) {
                    if (isMounted) {
                        setDriverId(activeId);
                        setIsOnline(true);
                        setShowRegModal(false);
                    }

                    // Background sync with MongoDB
                    try {
                        const res = await fetch(`${API_BASE}/api/drivers/${activeId}`);
                        if (res.status === 404) {
                            activeId = null;
                        } else {
                            const json = await res.json();
                            if (isMounted && json.success && json.data) {
                                setDriverProfile(json.data);
                                setIsOnline(true);
                                if (json.data.enabledServices) setEnabledServices(json.data.enabledServices);
                                setEarningsToday(Number(json.data.earningsToday) || 0);
                                setTripsToday(Number(json.data.tripsToday) || 0);
                                await AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(json.data));
                                return;
                            }
                        }
                    } catch (_) {
                        return;
                    }
                }

                // Auto-link to existing MongoDB fleet driver if local storage is blank
                try {
                    const res = await fetch(`${API_BASE}/api/drivers`);
                    const json = await res.json();
                    if (json.success && json.data && json.data.length > 0) {
                        const picked = json.data.find((d) => d.name === 'Pradeep Bose' || d.name === 'Rome' || d.name === 'Lucky') || json.data[0];
                        await Promise.all([
                            AsyncStorage.setItem(DRIVER_ID_KEY, picked._id),
                            AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(picked)),
                        ]);
                        if (isMounted) {
                            setDriverId(picked._id);
                            setDriverProfile(picked);
                            if (picked.enabledServices) setEnabledServices(picked.enabledServices);
                            setEarningsToday(Number(picked.earningsToday) || 0);
                            setTripsToday(Number(picked.tripsToday) || 0);
                            setIsOnline(true);
                            setShowRegModal(false);
                        }
                        return;
                    }
                } catch (_) {}

                if (isMounted && !activeId) {
                    setShowRegModal(true);
                }
            } catch (err) {
                console.warn('[DriverApp] Could not load driver:', err.message);
            }
        }
        loadDriver();
        return () => { isMounted = false; };
    }, []);

    // 2. Open Driver Picker to Switch Profiles across Simulators
    const handleOpenSwitchModal = async () => {
        setLoadingDrivers(true);
        setShowSwitchModal(true);
        try {
            const res = await fetch(`${API_BASE}/api/drivers`);
            const json = await res.json();
            if (json.success && json.data) {
                setAvailableDrivers(json.data);
            }
        } catch (err) {
            console.warn('[DriverApp] Could not fetch drivers list:', err.message);
        } finally {
            setLoadingDrivers(false);
        }
    };

    const handleSelectDriver = async (selected) => {
        setShowSwitchModal(false);
        setDriverId(selected._id);
        setDriverProfile(selected);
        if (selected.enabledServices) setEnabledServices(selected.enabledServices);
        setEarningsToday(Number(selected.earningsToday) || 0);
        setTripsToday(Number(selected.tripsToday) || 0);
        setIsOnline(true);

        await Promise.all([
            AsyncStorage.setItem(DRIVER_ID_KEY, selected._id),
            AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(selected)),
        ]);

        Alert.alert('✅ Profile Active', `Switched to ${selected.name} (${selected.vehicleType}).`);
    };

    // 2B. The server only dispatches to drivers it knows are online, so tell it
    useEffect(() => {
        if (!driverId || !isOnline) return;
        fetch(`${API_BASE}/api/drivers/${driverId}/online`, { method: 'POST' }).catch(() => {});
    }, [driverId, isOnline]);

    // 3. WebSocket listener with offer capability filtering
    useEffect(() => {
        let ws;
        let pollInterval;
        let isMounted = true;
        const wsRef = { connected: false };

        function connect() {
            try {
                const wsUrl = driverId ? `${WS_BASE}?driverId=${driverId}&role=driver` : WS_BASE;
                ws = new WebSocket(wsUrl);
                ws.onopen = () => { wsRef.connected = true; if (isMounted) setWsConnected(true); };
                ws.onclose = () => {
                    wsRef.connected = false;
                    if (isMounted) {
                        setWsConnected(false);
                        setTimeout(connect, 3000);
                    }
                };
                ws.onerror = () => { if (isMounted) setWsConnected(false); };
                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        const data = msg.data || msg;
                        if (msg.type === 'driver.incoming_offer') {
                            handleIncomingOffer(data);
                        } else if (msg.type === 'driver.offer_taken') {
                            // Someone else accepted it (or the customer cancelled): close our popup
                            handledOffers.add(data.offerId);
                            if (currentOfferRef.current?.offerId === data.offerId) {
                                setShowOffer(false);
                                setCurrentOffer(null);
                            }
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

        // Backup only: the socket delivers offers instantly; poll slowly in case it dropped
        pollInterval = setInterval(async () => {
            if (!isMounted || wsRef.connected) return;
            try {
                const res = await fetch(`${API_BASE}/api/rides/driver/latest-offer`);
                const json = await res.json();
                if (json.success && json.data?.offerId) handleIncomingOffer(json.data);
            } catch (_) {}
        }, 5000);

        return () => {
            isMounted = false;
            ws?.close();
            clearInterval(pollInterval);
        };
    }, [driverId]);

    // 4. Real-time GPS location push (every 4s when Online)
    useEffect(() => {
        if (!isOnline || !driverId) return;

        let intervalId = null;
        let isCancelled = false;

        const pushLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                if (isCancelled || !loc?.coords) return;
                if (!isInServiceArea(loc.coords.latitude, loc.coords.longitude)) return;

                await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: loc.coords.latitude,
                        lng: loc.coords.longitude,
                        bearing: loc.coords.heading ?? 0,
                    }),
                });
            } catch (_) {
                // Network blips are expected; the next tick retries
            }
        };

        pushLocation();
        intervalId = setInterval(pushLocation, 4000);

        return () => {
            isCancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [isOnline, driverId]);

    // Toggle Multi-Service Capabilities
    const handleToggleService = async (serviceKey) => {
        const updated = enabledServices.includes(serviceKey)
            ? enabledServices.filter((s) => s !== serviceKey)
            : [...enabledServices, serviceKey];

        if (updated.length === 0) {
            Alert.alert('Selection Required', 'You must keep at least one service active.');
            return;
        }

        setEnabledServices(updated);

        if (driverId) {
            try {
                await fetch(`${API_BASE}/api/drivers/${driverId}/services`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ services: updated }),
                });
            } catch (err) {
                console.warn('[DriverApp] Could not save services:', err.message);
            }
        }
    };

    function handleIncomingOffer(raw) {
        if (!raw?.offerId) return;
        if (handledOffers.has(raw.offerId) || currentOfferRef.current?.offerId === raw.offerId) return;
        if (!isOnlineRef.current) return;
        const enabledServices = enabledServicesRef.current;

        // Service Capability Check
        const sType = (raw.serviceType || '').toUpperCase();
        const isFood = sType.includes('FOOD');
        const isGrocery = sType.includes('GROCERY') || sType.includes('SHOP');
        const isParcel = sType.includes('PARCEL');
        const isRide = !isFood && !isGrocery && !isParcel;

        if (isFood && !enabledServices.includes('FOOD')) return;
        if (isGrocery && !enabledServices.includes('GROCERY')) return;
        if (isParcel && !enabledServices.includes('PARCEL')) return;
        if (isRide && !enabledServices.includes('RIDE')) return;

        setCurrentOffer({
            offerId: raw.offerId,
            rideId: raw.offerId,
            serviceType: raw.serviceType || 'RIDE',
            fare: raw.fare || '₹—',
            fareNumber: Number(raw.fareNumber) || null,
            distance: raw.distance || '—',
            pickup: typeof raw.pickup === 'object' ? (raw.pickup?.label || raw.pickup?.address || 'Pickup Location') : (raw.pickup || 'Pickup Location'),
            destination: typeof raw.destination === 'object' ? (raw.destination?.label || raw.destination?.address || 'Destination') : (raw.destination || 'Destination'),
            pickupCoords: typeof raw.pickup === 'object' ? raw.pickup : null,
            dropCoords: typeof raw.destination === 'object' ? raw.destination : null,
            routeGeometry: raw.routeGeometry || null,
            customerName: raw.customerName || null,
        });
        setShowOffer(true);
    }

    const handleAcceptOffer = async (offer) => {
        handledOffers.add(offer.offerId);
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
                // Earnings are credited by the server when the trip completes, not at accept time
                const acceptedRide = json.data?.ride || {};
                const pLoc = acceptedRide.pickupLocation || offer.pickupCoords || offer.pickup;
                const dLoc = acceptedRide.dropLocation || offer.dropCoords || offer.destination;

                useRideStore.getState().setServiceType(acceptedRide.serviceType || offer.serviceType || 'RIDE');
                useRideStore.getState().setPickupLocation(pLoc);
                useRideStore.getState().setDestination(dLoc);
                // The driver doesn't get the OTP; they ask the customer for it at pickup
                useRideStore.getState().setDeliveryOtp(null);
                useRideStore.getState().setRideId(acceptedRide._id || offer.rideId);
                if (acceptedRide.routeGeometry) {
                    if (typeof useRideStore.getState().setRoute === 'function') {
                        useRideStore.getState().setRoute(acceptedRide.routeGeometry, acceptedRide.distanceKm, acceptedRide.estimatedMins, [{ id: 'standard', fare: acceptedRide.fare }]);
                    } else if (typeof useRideStore.getState().setQuote === 'function') {
                        useRideStore.getState().setQuote({
                            geometry: acceptedRide.routeGeometry,
                            distanceKm: acceptedRide.distanceKm,
                            durationMins: acceptedRide.estimatedMins,
                            fares: [{ id: 'standard', fare: acceptedRide.fare }],
                        });
                    }
                }
                useRideStore.getState().selectVehicle('standard', acceptedRide.fare ?? offer.fareNumber ?? 0);

                if (onNavigate) onNavigate('DriverNav');
            } else {
                Alert.alert(
                    res.status === 409 ? 'Already Taken' : res.status === 410 ? 'Cancelled' : 'Could Not Accept',
                    json.error || 'The task may have been assigned or cancelled.'
                );
            }
        } catch (err) {
            console.error('[DriverApp] Accept error:', err.message);
            Alert.alert('Error', 'Connection error. Could not accept offer.');
        }
    };

    const handleDeclineOffer = () => {
        if (currentOffer?.offerId) handledOffers.add(currentOffer.offerId);
        setShowOffer(false);
        setCurrentOffer(null);
    };

    const handleToggleOnline = async () => {
        if (!driverId) {
            setShowRegModal(true);
            return;
        }
        const goingOnline = !isOnline;
        try {
            const endpoint = goingOnline ? 'online' : 'offline';
            await fetch(`${API_BASE}/api/drivers/${driverId}/${endpoint}`, { method: 'POST' });
            setIsOnline(goingOnline);
        } catch (err) {
            setIsOnline(goingOnline);
        }
    };

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
                    enabledServices,
                }),
            });
            const json = await res.json();
            if (json.success) {
                const id = json.data._id;
                await Promise.all([
                    AsyncStorage.setItem(DRIVER_ID_KEY, id),
                    AsyncStorage.setItem(DRIVER_PROFILE_KEY, JSON.stringify(json.data)),
                ]);
                setDriverId(id);
                setDriverProfile(json.data);
                setIsOnline(true);
                setShowRegModal(false);
                Alert.alert('🎉 Welcome!', `Registered as ${json.data.name}. You are now ONLINE.`);
            } else {
                Alert.alert('Registration Failed', json.error || 'Try again.');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not reach server. Check connection.');
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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

            {/* Header */}
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

                {/* Driver Profile Card with Switch Profile Button */}
                {driverProfile && (
                    <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="person-circle" size={42} color={theme.primaryGreen} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{driverProfile.name}</Text>
                            <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
                                {driverProfile.vehicleModel} • {driverProfile.vehicleNumber}
                            </Text>
                            <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
                                ⭐ {driverProfile.rating?.toFixed(1) || '5.0'} • {driverProfile.totalTrips || 0} total trips
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.switchProfileBtn, { backgroundColor: theme.inputBg, borderColor: theme.inputSeparator }]}
                            onPress={handleOpenSwitchModal}
                        >
                            <Ionicons name="swap-horizontal" size={16} color={theme.primaryGreen} />
                            <Text style={[styles.switchProfileText, { color: theme.textPrimary }]}>Switch</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Service Capability Switcher Pills */}
                <View style={[styles.serviceSelectionCard, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.serviceSelectionTitle, { color: theme.textPrimary }]}>
                        Active Work Services
                    </Text>
                    <Text style={[styles.serviceSelectionSub, { color: theme.textSecondary }]}>
                        Toggle services you want to accept right now
                    </Text>
                    <View style={styles.pillsRow}>
                        {SERVICE_OPTIONS.map((item) => {
                            const isSelected = enabledServices.includes(item.key);
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.servicePill,
                                        {
                                            backgroundColor: isSelected ? theme.primaryGreen : theme.inputBg,
                                            borderColor: isSelected ? theme.primaryGreen : theme.inputSeparator,
                                        },
                                    ]}
                                    onPress={() => handleToggleService(item.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.servicePillText, { color: isSelected ? '#000000' : theme.textPrimary }]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

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
                    <Ionicons name={isOnline ? 'power-outline' : 'power'} size={38} color={isOnline ? theme.primaryGreen : '#000000'} />
                    <Text style={[styles.onlineBtnText, { color: isOnline ? theme.primaryGreen : '#000000' }]}>
                        {isOnline ? 'YOU ARE ONLINE • READY FOR DISPATCH' : 'GO ONLINE'}
                    </Text>
                    <Text style={[styles.onlineBtnSub, { color: isOnline ? theme.textSecondary : 'rgba(0,0,0,0.7)' }]}>
                        {wsConnected ? '🟢 Live dispatch connected' : '🔴 Connecting to dispatch server...'}
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

                {/* Edit Profile Button */}
                <TouchableOpacity
                    style={[styles.editProfileBtn, { backgroundColor: theme.surface }]}
                    onPress={() => {
                        if (driverProfile) {
                            setRegName(driverProfile.name || '');
                            setRegPhone(driverProfile.phone || '');
                            setRegVehicleModel(driverProfile.vehicleModel || '');
                            setRegVehicleNumber(driverProfile.vehicleNumber || '');
                            setRegVehicleType(driverProfile.vehicleType || 'cab_economy');
                        }
                        setShowRegModal(true);
                    }}
                >
                    <Ionicons name="create-outline" size={18} color={theme.primaryGreen} />
                    <Text style={[styles.editProfileText, { color: theme.textPrimary }]}>
                        {driverProfile ? 'Edit Profile & Vehicle' : 'Register as Dropp Partner'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Incoming Offer Modal */}
            {showOffer && currentOffer && (
                <RideOfferModal
                    offer={currentOffer}
                    onAccept={handleAcceptOffer}
                    onDecline={handleDeclineOffer}
                />
            )}

            {/* ── Switch Driver Modal (Perfect for testing across 3 simulators) ── */}
            <Modal visible={showSwitchModal} animationType="slide" transparent>
                <View style={styles.regOverlay}>
                    <View style={[styles.regCard, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[styles.regTitle, { color: theme.textPrimary }]}>
                                Select Simulator Partner
                            </Text>
                            <TouchableOpacity onPress={() => setShowSwitchModal(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                            Choose which driver this simulator represents:
                        </Text>

                        {loadingDrivers ? (
                            <ActivityIndicator size="small" color={theme.primaryGreen} style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                                {availableDrivers.map((d) => {
                                    const isCurrent = d._id === driverId;
                                    const iconName = d.vehicleType === 'bike' ? 'bicycle' : d.vehicleType === 'auto' ? 'car' : 'car-sport';
                                    return (
                                        <TouchableOpacity
                                            key={d._id}
                                            style={[
                                                styles.driverOptionItem,
                                                {
                                                    backgroundColor: isCurrent ? theme.tierCardActiveBg : theme.inputBg,
                                                    borderColor: isCurrent ? theme.primaryGreen : theme.inputSeparator,
                                                },
                                            ]}
                                            onPress={() => handleSelectDriver(d)}
                                        >
                                            <Ionicons name={iconName} size={24} color={theme.primaryGreen} />
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.textPrimary }}>
                                                    {d.name} {isCurrent && '(Active)'}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                                                    {d.vehicleModel} • {d.vehicleNumber} ({d.vehicleType})
                                                </Text>
                                                <Text style={{ fontSize: 11, color: theme.primaryGreen, fontWeight: '700', marginTop: 2 }}>
                                                    Services: {d.enabledServices?.join(', ') || 'ALL'}
                                                </Text>
                                            </View>
                                            {isCurrent && <Ionicons name="checkmark-circle" size={20} color={theme.primaryGreen} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.regSubmitBtn, { backgroundColor: theme.primaryGreen, marginTop: 10 }]}
                            onPress={() => {
                                setShowSwitchModal(false);
                                setShowRegModal(true);
                            }}
                        >
                            <Text style={styles.regSubmitText}>+ Register New Simulator Driver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Registration Modal */}
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
                            placeholder="Vehicle Model (e.g. Maruti Dzire White)"
                            placeholderTextColor={theme.textSecondary}
                            value={regVehicleModel}
                            onChangeText={setRegVehicleModel}
                        />
                        <TextInput
                            style={[styles.input, { color: theme.textPrimary, borderColor: theme.inputSeparator }]}
                            placeholder="Vehicle Number (e.g. DL 01 AB 4001)"
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
                                            backgroundColor: regVehicleType === vt.value ? theme.primaryGreen : theme.inputBg,
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
                            {registering ? <ActivityIndicator color="#000" /> : <Text style={styles.regSubmitText}>Save & Go Online</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowRegModal(false)}
                            style={{ marginTop: 14, alignItems: 'center', padding: 8 }}
                        >
                            <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
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
    switchProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    switchProfileText: { fontSize: 12, fontWeight: '700' },
    driverOptionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1 },
    serviceSelectionCard: { padding: 16, borderRadius: 16, gap: 8 },
    serviceSelectionTitle: { fontSize: 15, fontWeight: '800' },
    serviceSelectionSub: { fontSize: 12, marginBottom: 4 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    servicePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    servicePillText: { fontSize: 13, fontWeight: '700' },
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
