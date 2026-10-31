/**
 * deliveryAddress.js — the customer's saved delivery address.
 * Persisted on-device in AsyncStorage. Coordinates (when the user picked
 * "Use current location") are kept locally only, because the order schema
 * stores street/city/pincode; the tracking map reads them back from here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const KEY = 'dropp_delivery_address_v1';

export const EMPTY_ADDRESS = { label: 'Home', street: '', city: '', pincode: '', lat: null, lng: null };

export async function loadDeliveryAddress() {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && parsed.street ? { ...EMPTY_ADDRESS, ...parsed } : null;
    } catch (_) {
        return null;
    }
}

export async function saveDeliveryAddress(address) {
    const clean = {
        label: (address.label || 'Home').trim(),
        street: (address.street || '').trim(),
        city: (address.city || '').trim(),
        pincode: (address.pincode || '').trim(),
        lat: Number.isFinite(address.lat) ? address.lat : null,
        lng: Number.isFinite(address.lng) ? address.lng : null,
    };
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(clean));
    } catch (_) {
        // Storage unavailable: the address is still used for this order
    }
    return clean;
}

export async function clearDeliveryAddress() {
    try {
        await AsyncStorage.removeItem(KEY);
    } catch (_) {
        // ignore
    }
}

export function validateAddress(address) {
    if (!address?.street || address.street.trim().length < 5) return 'Enter your flat / house and street (at least 5 characters).';
    if (!address?.city || address.city.trim().length < 2) return 'Enter your city.';
    if (address.pincode && !/^\d{6}$/.test(address.pincode.trim())) return 'Pincode should be 6 digits.';
    return null;
}

export function formatAddress(address) {
    if (!address) return '';
    if (typeof address === 'string') return address;
    return [address.street, address.city, address.pincode].filter(Boolean).join(', ');
}

/**
 * Reads the device position and reverse-geocodes it into an address draft.
 * Throws with a readable message when permission is denied.
 */
export async function addressFromDeviceLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission was not granted.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    let place = null;
    try {
        [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    } catch (_) {
        place = null;
    }
    const street = [place?.name, place?.street, place?.district].filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(', ');
    return {
        street,
        city: place?.city || place?.subregion || '',
        pincode: place?.postalCode || '',
        lat: latitude,
        lng: longitude,
    };
}

/** Short "Area, City" label for headers, from the device location. Returns null if unavailable. */
export async function getDeviceAreaLabel() {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return null;
        const pos = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        if (!pos) return null;
        const [place] = await Location.reverseGeocodeAsync(pos.coords);
        const parts = [place?.district || place?.name, place?.city || place?.subregion].filter(Boolean);
        return parts.length ? parts.join(', ') : null;
    } catch (_) {
        return null;
    }
}
