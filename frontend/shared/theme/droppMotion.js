/**
 * Dropp Motion Design System Tokens & Timing Constants
 * Master Palette & Motion choreography for production animated splash & transitions
 */

export const DROPP_THEME = {
    // Brand Colors
    bgNearBlack: '#07110F',
    bgDarkForest: '#0B211A',
    bgSurfaceDark: '#0D2920',
    electricMint: '#42F5A1',
    mintSoft: '#22C55E',
    mintGlow: 'rgba(66, 245, 161, 0.35)',
    mintSubtle: 'rgba(66, 245, 161, 0.12)',
    cleanWhite: '#F8FAFC',
    mutedText: '#9DAFA6',
    borderMuted: 'rgba(255, 255, 255, 0.08)',
};

export const DROPP_MOTION = {
    // Choreography Timings (in ms)
    sceneA: {
        gridFadeIn: 320,
    },
    sceneB: {
        routeDraw: 650,
        lightTravel: 700,
    },
    sceneC: {
        logoFade: 550,
        logoScale: 600,
        glowPulse: 800,
    },
    sceneD: {
        serviceStagger: 90,
        serviceFade: 400,
    },
    sceneE: {
        settlePause: 250,
        exitFade: 380,
    },
};

export const SERVICE_ITEMS = [
    { id: 'rides', label: 'Rides', icon: 'car-sport', color: '#42F5A1', sub: 'Cabs & Autos' },
    { id: 'food', label: 'Food', icon: 'fast-food', color: '#FF7A45', sub: 'Cafes & Eats' },
    { id: 'delivery', label: 'Delivery', icon: 'cube', color: '#38BDF8', sub: 'Instant Courier' },
    { id: 'shop', label: 'Shop', icon: 'basket', color: '#A855F7', sub: 'Local Stores' },
];
