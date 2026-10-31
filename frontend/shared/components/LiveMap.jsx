// frontend/shared/components/LiveMap.jsx
// Real interactive map (react-native-maps; Apple Maps on iOS, Google on Android — both bundled in Expo Go).
// Draws pickup, drop, the route polyline and a live driver marker, and keeps them all in view.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// Accepts {lat,lng} | {latitude,longitude} | [lng,lat] and returns {latitude, longitude} or null
export function toLatLng(p) {
  if (!p) return null;
  if (Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1])) return { latitude: p[1], longitude: p[0] };
  const lat = Number(p.latitude ?? p.lat);
  const lng = Number(p.longitude ?? p.lng);
  return isNum(lat) && isNum(lng) ? { latitude: lat, longitude: lng } : null;
}

// GeoJSON LineString ({coordinates:[[lng,lat]...]}) or an array of points → [{latitude, longitude}]
export function routeToCoords(route) {
  const raw = Array.isArray(route) ? route : route?.coordinates;
  if (!Array.isArray(raw)) return [];
  return raw.map(toLatLng).filter(Boolean);
}

function Pin({ color, icon }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Ionicons name={icon} size={14} color="#FFFFFF" />
    </View>
  );
}

export default function LiveMap({
  pickup,
  drop,
  route,
  driver,
  pickupLabel = 'Pickup',
  dropLabel = 'Drop',
  driverIcon = 'car-sport',
  followDriver = false,
  edgePadding = { top: 80, right: 60, bottom: 80, left: 60 },
  style,
  children,
}) {
  const mapRef = useRef(null);
  const pickupPt = toLatLng(pickup);
  const dropPt = toLatLng(drop);
  const driverPt = toLatLng(driver);
  const routeCoords = useMemo(() => routeToCoords(route), [route]);

  const initialRegion = useMemo(() => {
    const c = driverPt || pickupPt || dropPt || { latitude: 28.4595, longitude: 77.0266 };
    return { ...c, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    // Only for the first render; afterwards fitToCoordinates keeps things in view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when the trip's points change (not on every driver tick unless following the driver)
  const fitKey = [pickupPt, dropPt, routeCoords.length]
    .map((p) => (p && p.latitude ? `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}` : String(p)))
    .join('|');
  useEffect(() => {
    const pts = [pickupPt, dropPt, driverPt, ...routeCoords].filter(Boolean);
    if (!mapRef.current || pts.length === 0) return;
    const t = setTimeout(() => {
      if (pts.length === 1) {
        mapRef.current?.animateToRegion({ ...pts[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
      } else {
        mapRef.current?.fitToCoordinates(pts, { edgePadding, animated: true });
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    if (followDriver && driverPt && mapRef.current) {
      mapRef.current.animateCamera({ center: driverPt }, { duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followDriver, driverPt?.latitude, driverPt?.longitude]);

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        {routeCoords.length > 1 && (
          <>
            <Polyline coordinates={routeCoords} strokeColor="rgba(0,168,89,0.25)" strokeWidth={9} />
            <Polyline coordinates={routeCoords} strokeColor="#00A859" strokeWidth={4} />
          </>
        )}
        {pickupPt && (
          <Marker coordinate={pickupPt} title={pickupLabel} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <Pin color="#00A859" icon="radio-button-on" />
          </Marker>
        )}
        {dropPt && (
          <Marker coordinate={dropPt} title={dropLabel} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <Pin color="#0F172A" icon="flag" />
          </Marker>
        )}
        {driverPt && (
          <Marker
            coordinate={driverPt}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={Number(driver?.bearing) || 0}
            tracksViewChanges={false}
          >
            <View style={styles.driver}>
              <Ionicons name={driverIcon} size={18} color="#FFFFFF" />
            </View>
          </Marker>
        )}
        {children}
      </MapView>
      {!pickupPt && !dropPt && !driverPt && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>Waiting for location…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#E8EEF2' },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  driver: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#00A859',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748B', fontWeight: '600' },
});
