import { create } from 'zustand';

const initialTripState = {
    pickupLocation: "",
    destination: "",
    selectedVehicleTier: "standard",
    fare: 18.50,
    serviceType: 'ride', // 'ride' | 'package' | 'food' | 'shop'
    rideStatus: 'IDLE', // 'IDLE' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ON_TRIP' | 'COMPLETED'
    deliveryOtp: '4821',
    quoteId: null,
    distanceKm: null,
    durationMins: null,
    allFares: [],
    routeGeometry: null,

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

    // Driver assigned to trip — populated by backend on ride.driver_assigned event
    driver: {
        name: '',          // filled by backend
        vehicle: '',
        plate: '',
        rating: 5.0,
        avatar: null,
        etaMinutes: 4,
        seats: 4,
        tripsCount: 0,
        phone: '',
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
    setQuote: ({ quoteId, distanceKm, durationMins, fares, geometry }) => set({
        quoteId,
        distanceKm,
        durationMins,
        allFares: fares || [],
        routeGeometry: geometry || null,
    }),
    setDriver: (driverData) => set((state) => ({
        driver: { ...state.driver, ...driverData },
    })),
    setDeliveryOtp: (otp) => set({ deliveryOtp: otp }),
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
