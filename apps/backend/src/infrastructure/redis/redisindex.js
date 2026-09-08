import Redis from 'ioredis';
import { config } from '../../config/config.js';

export const redisClient = new Redis(config.redisUrl);

redisClient.on('connect', () => {
    console.log('[Redis] Connected to instance:', config.redisUrl);
});

redisClient.on('error', () => {
    console.error('[Redis] Engine failure:', err.message);
});


//GeoSpatial Enginer && Concureency Lock Helpers
export const redisGeo ={

    //Add/Update driver live GPS in Redis Geo index
    async updateDriverLocation(driverId, longitude, latitude){
        return redisClient.geoadd('drivers:available',longitude,latitude,driverId);
    },

    // driver from active GEO search index when busy or offline
    async removeDriverLocation(driverId){
        return redisClient.zrem('drivers:available', driverId);
    }, //when accpet it automatically become offline

    // find nearest drivers for a ride request {Query}
    async findNearbyDrivers(longitude, latitude, radiusKm = 5){
        return redisClient.geosearch(
            'drivers:available',
            'FROMLONLAT',longitude,latitude,
            'BYRADIUS', radiusKm, 'km',
            'WITHCOORD',
            'WITHDIST',
            'ASC' //(Ascending)
        );
    },

    //now the race condition for the distributed lock for atomic assignment
    async driverLock(driverId, ttlSec = 10){
        const lockKey = `lock:driver:${driverId}`;
        const result = await redisClient.set(lockKey, 'locked', 'EX', ttlSec, 'NX');

        return result === 'OK';
    },


    //Release Driver lock
    async releaseDriverLock(driverId) {
        const lockKey = `locak:driver:${driverId}`;
        return redisClient.del(lockKey);
    },

};