import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRideStore } from '../../../shared/store/rideStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const QUICK_PLACES = [
    { id: 'rajiv', label: 'Rajiv Chowk Metro', address: 'Connaught Place, Central Delhi', lat: 28.6328, lng: 77.2197, icon: 'business', color: '#FF3B30' },
    { id: 'dwarka', label: 'Dwarka Sector 21', address: 'Metro Station, Sector 21, New Delhi', lat: 28.5523, lng: 77.0583, icon: 'subway', color: '#00C96B' },
    { id: 'cybercity', label: 'Cyber City', address: 'DLF Phase 2, Gurugram', lat: 28.4950, lng: 77.0890, icon: 'briefcase', color: '#5B6AF0' },
    { id: 'airport', label: 'IGI Airport T3', address: 'Terminal 3, New Delhi', lat: 28.5562, lng: 77.1000, icon: 'airplane', color: '#FF6B35' },
];

const RECENT = [
    { id: 'r1', label: 'Dwarka Sector 21 Metro', address: 'Sector 21 Underpass, New Delhi', lat: 28.5427, lng: 77.0492, time: '10 mins ago' },
    { id: 'r2', label: 'Rajiv Chowk / CP', address: 'Connaught Place, New Delhi', lat: 28.6339, lng: 77.2199, time: '2 hrs ago' },
];

export default function LocationSearchScreen({ onBack, onNavigate }) {
    const { pickupLocation, destination, setPickupLocation, setDestination } = useRideStore();

    // Support both string or object stored previously
    const [pickupText, setPickupText] = useState(
        typeof pickupLocation === 'object' && pickupLocation !== null ? (pickupLocation.label || pickupLocation.address) : (pickupLocation || 'Your Location')
    );
    const [dropoffText, setDropoffText] = useState(
        typeof destination === 'object' && destination !== null ? (destination.label || destination.address) : (destination || '')
    );

    const [activeField, setActiveField] = useState('drop');
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const dropRef = useRef(null);
    const pickupRef = useRef(null);
    const debounceTimer = useRef(null);

    // Live search against Mapbox via backend /api/geocode/search with proximity
    useEffect(() => {
        if (!searchText || searchText.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            try {
                const userLng = (typeof pickupLocation === 'object' && pickupLocation?.lng) || 77.2090;
                const userLat = (typeof pickupLocation === 'object' && pickupLocation?.lat) || 28.6139;
                const res = await fetch(`${API_BASE}/api/geocode/search?q=${encodeURIComponent(searchText.trim())}&proximity=${userLng},${userLat}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setSearchResults(json.data);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                console.warn('[LocationScreen] Geocode error:', err.message);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimer.current);
    }, [searchText, pickupLocation]);

    const handleSelectLocation = (loc) => {
        // loc is { label, address, lat, lng }
        if (activeField === 'pickup') {
            setPickupText(loc.label);
            setPickupLocation(loc);
            setActiveField('drop');
            setSearchText('');
            setSearchResults([]);
            setTimeout(() => dropRef.current?.focus(), 150);
        } else {
            setDropoffText(loc.label);
            setDestination(loc);
            setSearchText('');
            setSearchResults([]);
            if (onNavigate) onNavigate('ConfirmLocation');
        }
    };

    const handleSwap = () => {
        const tmpText = pickupText;
        const tmpObj = pickupLocation;
        setPickupText(dropoffText || '');
        setDropoffText(tmpText);
        setPickupLocation(destination);
        setDestination(tmpObj);
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <SafeAreaView edges={['top']} style={s.topSafe}>
                {/* ── HEADER ── */}
                <View style={s.header}>
                    <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={20} color="#1A1D20" />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Set your locations</Text>
                </View>

                {/* ── INPUT CARD ── */}
                <View style={s.inputCard}>
                    <View style={s.indicators}>
                        <View style={s.greenDot} />
                        <View style={s.dash} />
                        <View style={s.dash} />
                        <View style={s.dash} />
                        <View style={s.redSquare} />
                    </View>

                    <View style={s.inputsCol}>
                        {/* Pickup Input */}
                        <View style={[s.inputWrap, activeField === 'pickup' && s.inputWrapActive]}>
                            <TextInput
                                ref={pickupRef}
                                style={s.textInput}
                                value={activeField === 'pickup' ? searchText : pickupText}
                                placeholder="Pickup location"
                                placeholderTextColor="#9BA3AF"
                                onFocus={() => {
                                    setActiveField('pickup');
                                    setSearchText(pickupText === 'Your Location' ? '' : pickupText);
                                }}
                                onChangeText={setSearchText}
                                returnKeyType="next"
                            />
                            {activeField === 'pickup' && searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <Ionicons name="close-circle" size={16} color="#9BA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={s.divider} />

                        {/* Dropoff Input */}
                        <View style={[s.inputWrap, activeField === 'drop' && s.inputWrapActive]}>
                            <TextInput
                                ref={dropRef}
                                style={s.textInput}
                                value={activeField === 'drop' ? searchText : dropoffText}
                                placeholder="Where to? (e.g. DLF Cyber, LPU Jalandhar)"
                                placeholderTextColor="#9BA3AF"
                                onFocus={() => {
                                    setActiveField('drop');
                                    setSearchText(dropoffText);
                                }}
                                onChangeText={setSearchText}
                                returnKeyType="search"
                            />
                            {activeField === 'drop' && searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText('')}>
                                    <Ionicons name="close-circle" size={16} color="#9BA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity style={s.swapBtn} onPress={handleSwap} activeOpacity={0.7}>
                        <Ionicons name="swap-vertical" size={18} color="#5B6AF0" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* ── RESULTS OR RECENT / QUICK ACCESS ── */}
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {isSearching && (
                    <View style={s.loadingRow}>
                        <ActivityIndicator size="small" color="#00C96B" />
                        <Text style={s.loadingText}>Searching places with Mapbox...</Text>
                    </View>
                )}

                {/* Live search results */}
                {searchResults.length > 0 ? (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>SEARCH RESULTS</Text>
                        {searchResults.map((place) => (
                            <TouchableOpacity
                                key={place.placeId}
                                style={s.resultRow}
                                activeOpacity={0.7}
                                onPress={() => handleSelectLocation(place)}
                            >
                                <View style={s.resultIconBox}>
                                    <Ionicons name="location-sharp" size={18} color="#00C96B" />
                                </View>
                                <View style={s.resultTextBox}>
                                    <Text style={s.resultLabel} numberOfLines={1}>{place.label}</Text>
                                    <Text style={s.resultSub} numberOfLines={1}>{place.address}</Text>
                                </View>
                                {place.city ? <Text style={s.resultCity}>{place.city}</Text> : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : searchText.trim().length > 1 && !isSearching ? (
                    <View style={s.emptyBox}>
                        <Ionicons name="search-outline" size={32} color="#CBD5E1" />
                        <Text style={s.emptyTitle}>No locations found</Text>
                        <Text style={s.emptySub}>Try searching with city or landmark name</Text>
                    </View>
                ) : (
                    <>
                        {/* Quick Access Tiles */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>QUICK ACCESS</Text>
                            <View style={s.quickGrid}>
                                {QUICK_PLACES.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={s.quickTile}
                                        activeOpacity={0.7}
                                        onPress={() => handleSelectLocation({ label: item.label, address: item.address, lat: item.lat, lng: item.lng })}
                                    >
                                        <View style={[s.quickIconCircle, { backgroundColor: item.color + '18' }]}>
                                            <Ionicons name={item.icon} size={20} color={item.color} />
                                        </View>
                                        <Text style={s.quickLabel}>{item.label}</Text>
                                        <Text style={s.quickSub} numberOfLines={1}>{item.address}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Recent Locations */}
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>RECENT LOCATIONS</Text>
                            {RECENT.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={s.recentRow}
                                    activeOpacity={0.7}
                                    onPress={() => handleSelectLocation({ label: item.label, address: item.address, lat: item.lat, lng: item.lng })}
                                >
                                    <View style={s.recentIconBox}>
                                        <Ionicons name="time-outline" size={18} color="#6C727F" />
                                    </View>
                                    <View style={s.resultTextBox}>
                                        <Text style={s.resultLabel}>{item.label}</Text>
                                        <Text style={s.resultSub}>{item.address}</Text>
                                    </View>
                                    <Text style={s.recentTime}>{item.time}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    topSafe: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D20' },
    inputCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    indicators: { alignItems: 'center', marginRight: 10, width: 14 },
    greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00C96B' },
    dash: { width: 2, height: 4, backgroundColor: '#CBD5E1', marginVertical: 2 },
    redSquare: { width: 8, height: 8, borderRadius: 2, backgroundColor: '#FF3B30' },
    inputsCol: { flex: 1 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    inputWrapActive: {},
    textInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1D20', paddingVertical: 4 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 6 },
    swapBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    scroll: { flex: 1 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
    loadingText: { marginLeft: 8, fontSize: 13, color: '#64748B', fontWeight: '500' },
    section: { paddingHorizontal: 16, paddingTop: 16 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10 },
    resultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    resultIconBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    resultTextBox: { flex: 1 },
    resultLabel: { fontSize: 14, fontWeight: '600', color: '#1A1D20', marginBottom: 2 },
    resultSub: { fontSize: 12, color: '#64748B' },
    resultCity: { fontSize: 11, fontWeight: '600', color: '#00C96B', marginLeft: 8 },
    emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginTop: 12 },
    emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    quickTile: { width: '48%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    quickIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickLabel: { fontSize: 13, fontWeight: '600', color: '#1A1D20' },
    quickSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    recentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    recentIconBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    recentTime: { fontSize: 11, color: '#94A3B8', marginLeft: 8 },
});
