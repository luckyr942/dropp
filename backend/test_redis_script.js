import { redisClient, redisGeo } from "./src/infrastructure/redis/redisindex.js";

async function runTest(){
    console.log('\n🚀 Starting Redis Geo & Concurrency Tests...\n');

    const driver_lucky = 'driver_a_lucky';
    const driver_kunal = 'driver_b_kunal';
    const driver_harsh = 'driver_c_harsh';

    const riderLng = 75.5760;
    const riderLat = 31.3250;


    try {
        //ingest location
        console.log('adding the driver location');
        await redisGeo.updateDriverLocation(driver_lucky, 75.5762, 31.3260);
        await redisGeo.updateDriverLocation(driver_kunal, 76.5850, 31.3300);
        await redisGeo.updateDriverLocation(driver_harsh, 78.7000, 31.5000)


        //2 query for finding nearby driver
        console.log('🔍 2. Searching for nearby drivers');
        const nearby = await redisGeo.findNearbyDrivers(riderLng,riderLat,5);
        console.log('Results:', nearby);
    } catch (err) {
        console.error('Error during the test:', err);
    }finally{
        await redisClient.quit();
    }
};
runTest();