// Live Road Routing Engine (Supports Mapbox & OSRM) with Multi-City Geocoding

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
const MAPBOX_BASE_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';



export const KNOWN_LANDMARKS = {
  // Delhi-NCR
  'cyber hub': { lat: 28.4950, lng: 77.0878, address: 'DLF Cyber Hub, Gurugram' },
  'cyber city': { lat: 28.4960, lng: 77.0900, address: 'DLF Cyber City, Gurugram' },
  'sector 28': { lat: 28.4682, lng: 77.0847, address: 'Sector 28, Gurugram' },
  'huda city centre': { lat: 28.4595, lng: 77.0726, address: 'Millennium City Centre Metro, Gurugram' },
  'rajiv chowk': { lat: 28.6328, lng: 77.2197, address: 'Rajiv Chowk Metro, Connaught Place, New Delhi' },
  'connaught place': { lat: 28.6315, lng: 77.2167, address: 'Connaught Place, New Delhi' },
  'india gate': { lat: 28.6129, lng: 77.2295, address: 'India Gate, Rajpath, New Delhi' },
  'hauz khas': { lat: 28.5494, lng: 77.2001, address: 'Hauz Khas Village, New Delhi' },
  'saket': { lat: 28.5244, lng: 77.2185, address: 'Select Citywalk, Saket, New Delhi' },
  'igi airport': { lat: 28.5562, lng: 77.1000, address: 'Indira Gandhi International Airport, T3, New Delhi' },
  'noida sector 18': { lat: 28.5708, lng: 77.3260, address: 'Sector 18 Market, Atta Market, Noida' },

  // Bengaluru
  'indiranagar': { lat: 12.9784, lng: 77.6408, address: '100 Feet Road, Indiranagar, Bengaluru' },
  'koramangala': { lat: 12.9352, lng: 77.6245, address: 'Sony World Junction, Koramangala, Bengaluru' },
  'hsr layout': { lat: 12.9121, lng: 77.6446, address: 'HSR Layout Sector 1, Bengaluru' },
  'whitefield': { lat: 12.9698, lng: 77.7500, address: 'ITPL Main Road, Whitefield, Bengaluru' },
  'mg road bangalore': { lat: 12.9756, lng: 77.6066, address: 'Mahatma Gandhi Road, Bengaluru' },
  'electronic city': { lat: 12.8452, lng: 77.6602, address: 'Electronic City Phase 1, Bengaluru' },
  'manyata tech park': { lat: 13.0500, lng: 77.6200, address: 'Manyata Embassy Business Park, Bengaluru' },
  'marathahalli': { lat: 12.9591, lng: 77.6974, address: 'Marathahalli Bridge, Outer Ring Road, Bengaluru' },
  'bangalore airport': { lat: 13.1986, lng: 77.7066, address: 'Bengaluru Airport' },
  'bengaluru airport': { lat: 13.1986, lng: 77.7066, address: 'Bengaluru Airport' },
  'kempegowda airport': { lat: 13.1986, lng: 77.7066, address: 'Bengaluru Airport' },
  'bengaluru railway station': { lat: 12.9778, lng: 77.5707, address: 'Bengaluru Railway Station' },
  'bangalore railway station': { lat: 12.9778, lng: 77.5707, address: 'Bengaluru Railway Station' },
  'new delhi railway station': { lat: 28.6429, lng: 77.2195, address: 'New Delhi Railway Station' },
  'delhi airport': { lat: 28.5562, lng: 77.1000, address: 'Delhi Airport' },
  'new delhi airport': { lat: 28.5562, lng: 77.1000, address: 'Delhi Airport' },

  // Mumbai
  'bkc': { lat: 19.0657, lng: 77.8687, address: 'Bandra Kurla Complex (BKC), Mumbai' },
  'bandra': { lat: 19.0596, lng: 72.8295, address: 'Bandra West, Hill Road, Mumbai' },
  'bandra terminus': { lat: 19.0620, lng: 72.8410, address: 'Bandra Terminus, Mumbai' },
  'nariman point': { lat: 18.9260, lng: 72.8230, address: 'Nariman Point, Marine Drive, Mumbai' },
  'colaba': { lat: 18.9067, lng: 72.8147, address: 'Gateway of India, Colaba, Mumbai' },
  'marine drive': { lat: 18.9432, lng: 72.8230, address: 'Marine Drive Promenade, Mumbai' },
  'andheri': { lat: 19.1197, lng: 72.8464, address: 'Andheri West, Link Road, Mumbai' },
  'juhu': { lat: 19.0988, lng: 72.8264, address: 'Juhu Beach, Juhu Tara Road, Mumbai' },
  'powai': { lat: 19.1176, lng: 72.9060, address: 'Hiranandani Gardens, Powai, Mumbai' },
  'dadar': { lat: 19.0178, lng: 72.8478, address: 'Dadar TT Circle, Mumbai' },
  'mumbai airport': { lat: 19.0896, lng: 72.8656, address: 'Chhatrapati Shivaji Maharaj International Airport T2, Mumbai' },

  // Punjab & North India
  'lpu': { lat: 31.2536, lng: 75.7037, address: 'Lovely Professional University (LPU), Phagwara' },
  'lovely professional university': { lat: 31.2536, lng: 75.7037, address: 'LPU, Phagwara, Punjab' },
  'amritsar': { lat: 31.6340, lng: 74.8723, address: 'Amritsar, Punjab' },
  'golden temple': { lat: 31.6200, lng: 74.8765, address: 'Golden Temple, Amritsar' },
  'jalandhar': { lat: 31.3260, lng: 75.5762, address: 'Jalandhar, Punjab' },
  'phagwara': { lat: 31.2240, lng: 75.7708, address: 'Phagwara, Punjab' },
  'ludhiana': { lat: 30.9010, lng: 75.8573, address: 'Ludhiana, Punjab' },
  'chandigarh': { lat: 30.7333, lng: 76.7794, address: 'Chandigarh' },
  'delhi': { lat: 28.6139, lng: 77.2090, address: 'New Delhi' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, address: 'Gurugram' },
  'gurugram': { lat: 28.4595, lng: 77.0266, address: 'Gurugram' },
};

// 1. Location to GPS (lat, lng) with Live Geocoding
export async function resolveLocation(point, label = 'Location') {
  if (!point) {
    return { lat: 28.4595, lng: 77.0266, address: `${label} (Default)` };
  }

  // Case A: Mobile GPS sent real coordinates
  if (typeof point === 'object' && point !== null) {
    const lat = Number(point.lat);
    const lng = Number(point.lng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      return {
        lat,
        lng,
        address:
          typeof point.address === 'string' && point.address.trim()
            ? point.address.trim()
            : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
    }
  }

  // Case B: User spoke or typed an address string
  if (typeof point === 'string') {
    const clean = point.toLowerCase().trim();

    // 1. Check known landmark dictionary (0ms)
    for (const [name, data] of Object.entries(KNOWN_LANDMARKS)) {
      if (clean.includes(name)) {
        return { ...data, address: data.address || point };
      }
    }

    // 2. Real-time Mapbox Geocoding lookup for ANY place in India
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      try {
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(point)}.json?access_token=${mapboxToken}&country=IN&limit=1`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(geoUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const feature = data.features?.[0];
          if (feature?.center) {
            const cleanFull = (feature.place_name || point)
              .replace(/,\s*\d{6}\b/g, '')
              .replace(/,\s*India\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            const friendlyName =
              point && point.length >= 3 && point.length <= 40
                ? point.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                : feature.text || cleanFull.split(',')[0].trim();
            return {
              lat: feature.center[1],
              lng: feature.center[0],
              address: friendlyName || cleanFull,
            };
          }
        }
      } catch (_) {}
    }

    // Fallback if not resolved
    return { lat: 28.4682, lng: 77.0847, address: point };
  }
  return { lat: 28.4595, lng: 77.0266, address: label };
}


// 2. haversineDistanceKm(lat1, lon1, lat2, lon2)
// Pure mathematical straight-line distance on earth with a 1.35x road curvature factor.
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c * 1.35).toFixed(2));
}


// 3. getRoute(pickupInput, dropInput)
// Fetches live routing and ETA using OSRM (fast, free), falls back to Mapbox if OSRM fails.
// Pickup and drop location

export async function getRoute(pickupInput, dropInput) {
    // Step 1: Normalize both pickup and drop inputs
    const pickup = await resolveLocation(pickupInput, 'Pickup');
    const drop = await resolveLocation(dropInput, 'Drop');
    // Step 2: Try Mapbox first if token is configured in .env
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
        try {
        const coords = `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`;
        const url = `${MAPBOX_BASE_URL}/${coords}?access_token=${mapboxToken}&overview=full&geometries=geojson&alternatives=false`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            const route = data.routes?.[0];
            if (route && Number.isFinite(route.distance) && Number.isFinite(route.duration)) {
            return {
                pickup,
                drop,
                distanceKm: Number((route.distance / 1000).toFixed(2)),
                durationMins: Math.ceil(route.duration / 60),
                geometry: route.geometry,
                provider: 'mapbox',
            };
            }
        }
        } catch (err) {
        console.warn('[routeService] Mapbox failed, trying OSRM:', err.message);
        }
    }

    // Step 3: Use live Open Source Routing Machine (OSRM)
    try {
        const coords = `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`;
        const url = `${OSRM_BASE_URL}/${coords}?overview=full&geometries=geojson`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0];
        if (route && Number.isFinite(route.distance) && Number.isFinite(route.duration)) {
            return {
            pickup,
            drop,
            distanceKm: Math.max(0.5, Number((route.distance / 1000).toFixed(2))),
            durationMins: Math.max(3, Math.ceil(route.duration / 60)),
            geometry: route.geometry,
            provider: 'osrm',
            };
        }
        }
    } catch (err) {
        console.warn('[routeService] OSRM network error, using fallback:', err.message);
    }
    // Step 4: Resilient Fallback (Never fail, always give a fare quote)
    const estKm = Math.max(1.0, haversineDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng));
    const estMins = Math.max(4, Math.ceil((estKm / 26) * 60)); // 26 km/h average Indian metro speed
    return {
        pickup,
        drop,
        distanceKm: estKm,
        durationMins: estMins,
        geometry: {
        type: 'LineString',
        coordinates: [
            [pickup.lng, pickup.lat],
            [drop.lng, drop.lat],
        ],
        },
        provider: 'haversine_fallback',
    };
}

