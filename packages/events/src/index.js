//crypto to give encryption/renadom values

import crypto from 'crypto';

// RabbitMQ Routing Key Namespaces for Domain Events

export const eventTypes = Object.freeze({
  // Ride Domain Events
  rideRequested: 'dropp.ride.requested',
  rideSearchingDriver: 'dropp.ride.searching_driver',
  rideDriverAssigned: 'dropp.ride.driver_assigned',
  rideDriverArrived: 'dropp.ride.driver_arrived',
  rideStarted: 'dropp.ride.started',
  rideInProgress: 'dropp.ride.in_progress',
  rideCompleted: 'dropp.ride.completed',
  ridePaymentPending: 'dropp.ride.payment_pending',
  ridePaymentCompleted: 'dropp.ride.payment_completed',
  rideCancelled: 'dropp.ride.cancelled',

  // Driver Domain Events
  driverOnline: 'dropp.driver.online',
  driverOffline: 'dropp.driver.offline',
  driverAvailable: 'dropp.driver.available',
  driverReserved: 'dropp.driver.reserved',
  driverOnTrip: 'dropp.driver.on_trip',
  driverLocationUpdated: 'dropp.driver.location_updated',

  // Payment Domain Events
  paymentCreated: 'dropp.payment.created',
  paymentProcessing: 'dropp.payment.processing',
  paymentSucceeded: 'dropp.payment.succeeded',
  paymentFailed: 'dropp.payment.failed',

});

/**
 * Generates a standardized Domain Event Envelope for RabbitMQ messages.
 * 
 * @param {string} eventType - Routing key string from eventTypes
 * @param {string} aggregateId - Primary ID of entity (rideId, driverId, paymentId)
 * @param {object} payload - Domain payload data
 * @param {number} [version=1] - Event schema iteration
 * @returns {object} Standard DomainEvent Envelope
 */

export function createDomainEvent(eventType, aggregateId, payload, version = 1){
    return{
        eventId: crypto.randomUUID(),
        eventType,
        aggregateId,
        occuredAt: new Date().toISOString(),
        version,
        payload,
    };
}