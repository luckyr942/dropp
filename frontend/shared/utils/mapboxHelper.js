// Token is loaded from .env (EXPO_PUBLIC_MAPBOX_TOKEN) — never hardcode secrets here
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

/**
 * Extracts normalized location coordinates, main label, and full address
 */
export function extractLocationDetails(loc, fallbackLabel = 'Location') {
    if (!loc) {
        return { label: fallbackLabel, address: '', full: fallbackLabel, lat: null, lng: null };
    }
    if (typeof loc === 'string') {
        const parts = loc.split(',');
        const label = parts[0]?.trim() || fallbackLabel;
        const address = parts.slice(1).join(',').trim();
        return { label, address, full: loc, lat: null, lng: null };
    }
    const label = loc.label || loc.address?.split(',')[0] || fallbackLabel;
    const address = loc.address || loc.label || '';
    const full = loc.address ? `${label}, ${loc.address}` : label;
    return {
        label,
        address,
        full: loc.address || label,
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
    };
}

/**
 * Generates a Mapbox static image URL with the road route polyline & markers.
 * Downsamples coordinates to ~50 points to guarantee HTTP 200 and prevent HTTP 414 (URI Too Long).
 */
export function buildMapboxRouteUrl(geometry, pickup, destination, options = {}) {
    const pu = extractLocationDetails(pickup, 'Pickup');
    const dp = extractLocationDetails(destination, 'Destination');

    const pLng = pu.lng ?? 77.0492;
    const pLat = pu.lat ?? 28.5427;
    const dLng = dp.lng ?? 77.2199;
    const dLat = dp.lat ?? 28.6338;

    const padding = options.padding || '90,90,280,90';
    const width = options.width || 700;
    const height = options.height || 700;

    const coords = geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) {
        // Downsample to max 50 points to stay well under Mapbox URL limit
        const step = Math.max(1, Math.floor(coords.length / 50));
        const sampled = [];
        for (let i = 0; i < coords.length; i += step) {
            sampled.push([Number(coords[i][0].toFixed(5)), Number(coords[i][1].toFixed(5))]);
        }
        const last = coords[coords.length - 1];
        if (
            sampled.length === 0 ||
            sampled[sampled.length - 1][0] !== Number(last[0].toFixed(5)) ||
            sampled[sampled.length - 1][1] !== Number(last[1].toFixed(5))
        ) {
            sampled.push([Number(last[0].toFixed(5)), Number(last[1].toFixed(5))]);
        }

        const geojson = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        stroke: '#00C96B',
                        'stroke-width': 5,
                        'stroke-opacity': 0.95,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: sampled,
                    },
                },
                {
                    type: 'Feature',
                    properties: {
                        'marker-color': '00C96B',
                        'marker-size': 'small',
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [pLng, pLat],
                    },
                },
                {
                    type: 'Feature',
                    properties: {
                        'marker-color': 'FF3B30',
                        'marker-size': 'medium',
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [dLng, dLat],
                    },
                },
            ],
        };

        const enc = encodeURIComponent(JSON.stringify(geojson));
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/geojson(${enc})/auto/${width}x${height}@2x?padding=${padding}&access_token=${MAPBOX_TOKEN}`;
    }

    // Fallback: simple start & end pins
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s-a+00c96b(${pLng},${pLat}),pin-s-b+ff3b30(${dLng},${dLat})/auto/${width}x${height}@2x?padding=${padding}&access_token=${MAPBOX_TOKEN}`;
}

export default {
    MAPBOX_TOKEN,
    extractLocationDetails,
    buildMapboxRouteUrl,
};
