// Driver side of Dropp exposed over MCP: fleet, availability, live dispatch offers, and trip lifecycle.
import { z } from 'zod';
import { safe } from '../mcpResult.js';
import {
  listAllDrivers,
  getDriverById,
  setDriverOnline,
  setDriverOffline,
  acceptRide,
  updateTaskStatus,
} from '../../modules/drivers/driverService.js';
import { getAllPending } from '../../infrastructure/offerQueue.js';

const driverId = z.string().min(1).describe('Driver id from driver_list_fleet');

export function registerDriverTools(server) {
  server.registerTool(
    'driver_list_fleet',
    {
      title: 'List fleet',
      description: 'All driver partners with vehicle, online/busy state, enabled services (RIDE, FOOD, GROCERY, PARCEL) and today\'s earnings.',
      inputSchema: { onlineOnly: z.boolean().default(false) },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ onlineOnly }) => {
      const drivers = await listAllDrivers();
      const rows = drivers
        .filter((d) => !onlineOnly || d.isOnline)
        .map((d) => ({
          driverId: d._id?.toString(),
          name: d.name,
          vehicleType: d.vehicleType,
          vehicle: [d.vehicleModel, d.vehicleNumber].filter(Boolean).join(' • '),
          isOnline: Boolean(d.isOnline),
          isBusy: Boolean(d.isBusy),
          activeTaskId: d.activeTaskId || null,
          enabledServices: d.enabledServices,
          rating: d.rating,
          tripsToday: d.tripsToday,
          earningsToday: d.earningsToday,
        }));
      return { drivers: rows };
    })
  );

  server.registerTool(
    'driver_get_profile',
    {
      title: 'Driver profile',
      description: 'One driver\'s profile, current task and today\'s metrics.',
      inputSchema: { driverId },
      annotations: { readOnlyHint: true },
    },
    safe(async ({ driverId }) => {
      const driver = await getDriverById(driverId);
      if (!driver) throw new Error('Driver not found');
      return driver;
    })
  );

  server.registerTool(
    'driver_set_online',
    {
      title: 'Go online / offline',
      description: 'Toggle whether a driver receives dispatch offers.',
      inputSchema: { driverId, online: z.boolean() },
    },
    safe(({ driverId, online }) => (online ? setDriverOnline(driverId) : setDriverOffline(driverId)))
  );

  server.registerTool(
    'driver_list_offers',
    {
      title: 'Pending dispatch offers',
      description: 'Live ride, food, grocery and parcel offers waiting for a driver (offers expire after 90 seconds). Newest first.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safe(async () => ({ offers: getAllPending() }))
  );

  server.registerTool(
    'driver_accept_offer',
    {
      title: 'Accept offer',
      description: 'Driver accepts a dispatch offer (ride or delivery). The customer app instantly shows the driver, vehicle and OTP.',
      inputSchema: { driverId, offerId: z.string().min(1).describe('offerId from driver_list_offers') },
    },
    safe(({ driverId, offerId }) => acceptRide(offerId, driverId))
  );

  server.registerTool(
    'driver_update_trip',
    {
      title: 'Update trip status',
      description: 'Advance an accepted task: arrived → picked_up (trip started / order collected) → completed (ride done / order delivered). Completing credits the driver\'s earnings.',
      inputSchema: {
        driverId,
        taskId: z.string().min(1).describe('Ride or order id the driver accepted'),
        status: z.enum(['arrived', 'picked_up', 'completed']),
        otp: z.string().regex(/^\d{4}$/).optional().describe('Customer OTP when starting the trip'),
      },
    },
    safe(({ driverId, taskId, status, otp }) => updateTaskStatus(driverId, taskId, status, otp ?? null))
  );
}
