import { create } from 'zustand';

const initialTripState = {
    pickupLocation: "",
    destination: "",
    selectedVehicleTier: "standard",
    fare: 18.50,
    serviceType: 'ride',
    rideStatus: 'IDLE',
    deliveryOtp: '4821',
    quoteId: null,
    rideId: null,          // MongoDB _id of the active Ride document
    customerId: null,      // real customer ID — used for WebSocket room
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
    setCustomerId: (id) => set({ customerId: id }),
    setRideId: (id) => set({ rideId: id }),
    clearLocations: () => set({ pickupLocation: "", destination: "" }),

    // Reset whole trip state when completed or cancelled
    resetTripState: () => set({
        ...initialTripState,
        customerId: useRideStore?.getState?.()?.customerId ?? null, // keep real user ID
        pickupLocation: "",
        destination: "",
        rideStatus: 'IDLE',
        rideId: null,
        activeOffer: null,
    }),
}));
