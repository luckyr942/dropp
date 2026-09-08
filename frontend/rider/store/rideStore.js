import { create } from 'zustand';

export const useRideStore = create((set) =>({
    pickupLocation: "",
    destination: "",
    selectedVehicleTier: "standard",
    fare: 10,
    serviceType: 'driver',  // 'driver' | 'package'
    rideStatus: 'IDLE',  // 'IDLE' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'ON_TRIP' | 'COMPLETED'

    driver: {
        name: 'Ucok Behel',
        vehicle: 'Honda CRV',
        plate: 'AB6299ZG',
        rating: 4.9,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        etaMinutes: 3,
        seats: 4,
        tripsCount: 482,
        safetyRating: 98,
    },

    setPickupLocation: (loc) => set({ pickupLocation: loc }),
    setDestination: (dest) => set({ destination: dest }),
    setServiceType: (type) => set({ serviceType: type }),
    selectVehicle: (tier, price) => set({ selectedVehicleTier: tier, fare: price }),
    setRideStatus: (status) => set({ rideStatus: status }),
    //setDriver: (driver) => set({ driver: driver }),

}));