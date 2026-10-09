import { create } from 'zustand';

const initialTripState = {
    pickupLocation: "",
    destination: "",
    selectedVehicleTier: "standard",
    fare: 18.50,
    serviceType: 'ride', // 'ride' | 'package' | 'food' | 'shop'
    rideStatus: 'IDLE', // 'IDLE' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ON_TRIP' | 'COMPLETED'
    deliveryOtp: '4821',

    packageDetails: {
        weightTier: 'medium',
        description: '',
        recipientName: '',
        recipientPhone: '',
        requireOtp: true,
    },
};

export const useRideStore = create((set) => ({
    ...initialTripState,

    // Driver assigned to trip
    driver: {
        name: 'Alex Johnson',
        vehicle: 'Toyota Camry Hybrid',
        plate: 'DL-01-AB-4821',
        rating: 4.9,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        etaMinutes: 4,
        seats: 4,
        tripsCount: 1240,
        phone: '+1 (555) 345-6789',
    },

    // Driver App Mode State
    isDriverOnline: false,
    driverEarningsToday: 185.40,
    driverTripsToday: 12,
    driverAcceptanceRate: 98,
    activeOffer: null,

    // Actions
    setPickupLocation: (loc) => set({ pickupLocation: loc }),
    setDestination: (dest) => set({ destination: dest }),
    setServiceType: (type) => set({ serviceType: type }),
    selectVehicle: (tier, price) => set({ selectedVehicleTier: tier, fare: price }),
    setRideStatus: (status) => set({ rideStatus: status }),
    setPackageDetails: (details) =>
        set((state) => ({ packageDetails: { ...state.packageDetails, ...details } })),
    toggleDriverOnline: () => set((state) => ({ isDriverOnline: !state.isDriverOnline })),
    setActiveOffer: (offer) => set({ activeOffer: offer }),
    clearLocations: () => set({ pickupLocation: "", destination: "" }),

    // Reset whole trip state when completed or cancelled
    resetTripState: () => set({
        ...initialTripState,
        pickupLocation: "",
        destination: "",
        rideStatus: 'IDLE',
        activeOffer: null,
    }),
}));
