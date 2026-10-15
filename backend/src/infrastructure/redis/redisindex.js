import Redis from 'ioredis';
import { config } from '../../config/config.js';

export const redisClient = new Redis(config.redisUrl);

redisClient.on('connect', () => {
    console.log('[Redis] Connected to instance:', config.redisUrl);
});

redisClient.on('error', (err) => {
    console.error('[Redis] Engine failure:', err.message);
});

export const redisGeo = {
    async updateDriverLocation(driverId, longitude, latitude) {
        return redisClient.geoadd(
            'drivers:available',
            longitude,
            latitude,
            driverId
        );
    },

    async removeDriverLocation(driverId) {
        return redisClient.zrem('drivers:available', driverId);
    },

    async findNearbyDrivers(longitude, latitude, radiusKm = 5) {
        return redisClient.geosearch(
            'drivers:available',
            'FROMLONLAT', longitude, latitude,
            'BYRADIUS', radiusKm, 'km',
            'WITHCOORD',
            'WITHDIST',
            'ASC'
        );
    },

    async driverLock(driverId, ttlSec = 10) {
        const lockKey = `lock:driver:${driverId}`;
        const result = await redisClient.set(
            lockKey,
            'locked',
            'EX',
            ttlSec,
            'NX'
        );

        return result === 'OK';
    },

    async releaseDriverLock(driverId) {
        const lockKey = `lock:driver:${driverId}`;
        return redisClient.del(lockKey);
    },
};