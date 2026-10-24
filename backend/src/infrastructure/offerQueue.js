//suports multiple simultaneous ride booking
// Dropp Offer Queue — supports multiple simultaneous ride bookings
// Each booking gets its own slot. Drivers poll and get the latest pending offer.
// Replace with Redis pub/sub for production multi-server deployment.

const queue = new Map()
const OFFER_TTL_MS = 90_000;

export function pushOffer(offer){
    if(!offer?.offerId) return;
    queue.set(offer.offerId, {
        ...offer,
        pushedAt: Date.now(),
    });

    //auto clean stale offer
    setTimeout(() => {
        if(queue.has(offer.offerId)){
            queue.delete(offer.offerId);
            console.log(`[OfferQueue] Offer ${offer.offerId} expired and removed.`);
        }
    }, OFFER_TTL_MS);
    console.log(`[OfferQueue] Pushed offerId=${offer.offerId} | Queue size=${queue.size}`);
}


export function getLatestOffer() {
    if(queue.size === 0) return null;

    //return the most recently pushed offer
    let latest = null;
    let latestTime = 0;
    for(const [, offer] of queue){
        if(offer.pushedAt > latestTime){
            latestTime = offer.pushedAt;
            latest = offer;
        }
    }
    return latest;

}

export function acknowledgeOffer(offerId){
    const existed = queue.has(offerId);
    queue.delete(offerId);
    if(existed){
        console.log(`[OfferQueue] Acknowledged offerId=${offerId} | Queue size=${queue.size}`);
    }
}

export function getPendingCount(){
    return queue.size;
}

export function getAllPending() {
    return [...queue.values()].sort((a, b) => b.pushedAt - a.pushedAt);
}