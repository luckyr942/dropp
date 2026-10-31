// Compares one trip across Dropp and other ride apps so Aura can pick the cheapest.
// Dropp fares are live, bookable quotes. Uber / Ola / Rapido have no public booking API in India,
// so their fares are ESTIMATES from rate cards and booking them is a deep-link handoff to their app.
import { estimateRide } from './rideService.js';

// Approximate published rate cards (Delhi NCR). No surge, tolls or platform fees: always shown as "estimate".
// Tune per city as real numbers come in.
const EXTERNAL_RATE_CARDS = {
  uber: [
    { category: 'bike', product: 'Uber Moto', base: 20, perKm: 7, perMin: 1, min: 30 },
    { category: 'auto', product: 'Uber Auto', base: 30, perKm: 12, perMin: 1, min: 40 },
    { category: 'cab', product: 'Uber Go', base: 50, perKm: 14, perMin: 1.5, min: 90 },
    { category: 'premium', product: 'Uber Premier', base: 80, perKm: 19, perMin: 2, min: 130 },
  ],
  ola: [
    { category: 'bike', product: 'Ola Bike', base: 20, perKm: 7, perMin: 1, min: 30 },
    { category: 'auto', product: 'Ola Auto', base: 30, perKm: 13, perMin: 1, min: 40 },
    { category: 'cab', product: 'Ola Mini', base: 50, perKm: 15, perMin: 1.25, min: 85 },
    { category: 'premium', product: 'Ola Prime', base: 80, perKm: 18, perMin: 1.75, min: 120 },
  ],
  rapido: [
    { category: 'bike', product: 'Rapido Bike', base: 15, perKm: 6, perMin: 0.75, min: 25 },
    { category: 'auto', product: 'Rapido Auto', base: 25, perKm: 11, perMin: 0.75, min: 35 },
    { category: 'cab', product: 'Rapido Cab', base: 45, perKm: 13, perMin: 1, min: 80 },
  ],
};

const DROPP_CATEGORY = { bike: 'bike', auto: 'auto', cab_economy: 'cab', cab_premium: 'premium' };
export const CATEGORY_TO_DROPP_TYPE = { bike: 'bike', auto: 'auto', cab: 'cab_economy', premium: 'cab_premium' };

const PROVIDER_LABEL = { dropp: 'Dropp', uber: 'Uber', ola: 'Ola', rapido: 'Rapido' };

function deepLink(provider, pickup, drop) {
  const p = (s) => encodeURIComponent(String(s || '').split(',')[0]);
  switch (provider) {
    case 'uber':
      // Uber's documented universal link: opens the app (or m.uber.com) with pickup and drop filled in.
      return (
        'https://m.uber.com/ul/?action=setPickup' +
        `&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[nickname]=${p(pickup.address)}` +
        `&dropoff[latitude]=${drop.lat}&dropoff[longitude]=${drop.lng}&dropoff[nickname]=${p(drop.address)}`
      );
    case 'ola':
      // Best-effort web booking link; the user may need to re-check the drop point in Ola.
      return (
        `https://book.olacabs.com/?lat=${pickup.lat}&lng=${pickup.lng}&pickup_name=${p(pickup.address)}` +
        `&drop_lat=${drop.lat}&drop_lng=${drop.lng}&drop_name=${p(drop.address)}`
      );
    case 'rapido':
      // Rapido has no documented link with locations; this just opens the app / site.
      return 'https://www.rapido.bike/';
    default:
      return null;
  }
}

function estimateFare(card, distanceKm, durationMins) {
  const raw = card.base + distanceKm * card.perKm + durationMins * card.perMin;
  return Math.max(card.min, Math.round(raw));
}

/**
 * Returns every option for the trip, cheapest first, plus the cheapest overall and the cheapest
 * Dropp option (the one Aura can book without leaving the app).
 * category: 'bike' | 'auto' | 'cab' | 'premium' | null (null = all categories)
 */
export async function compareRides({ pickup, drop, customerId, category = 'cab' }) {
  const quote = await estimateRide({ pickup, drop, customerId });
  const { distanceKm, durationMins } = quote;

  const options = quote.fares.map((f) => ({
    provider: 'dropp',
    providerName: PROVIDER_LABEL.dropp,
    product: f.name,
    category: DROPP_CATEGORY[f.type],
    rideType: f.type,
    fare: f.fare,
    etaMins: f.etaMins,
    confidence: 'live',
    bookable: true,
    deepLink: null,
  }));

  for (const [provider, cards] of Object.entries(EXTERNAL_RATE_CARDS)) {
    for (const card of cards) {
      options.push({
        provider,
        providerName: PROVIDER_LABEL[provider],
        product: card.product,
        category: card.category,
        rideType: null,
        fare: estimateFare(card, distanceKm, durationMins),
        etaMins: null,
        confidence: 'estimate',
        bookable: false,
        deepLink: deepLink(provider, quote.pickup, quote.drop),
      });
    }
  }

  const inCategory = options
    .filter((o) => !category || o.category === category)
    .sort((a, b) => a.fare - b.fare || (a.provider === 'dropp' ? -1 : 1));

  const cheapest = inCategory[0] || null;
  const cheapestDropp = inCategory.find((o) => o.provider === 'dropp') || null;

  return {
    quoteId: quote.quoteId,
    pickup: quote.pickup,
    drop: quote.drop,
    distanceKm,
    durationMins,
    category,
    options: inCategory,
    cheapest,
    cheapestDropp,
    // How much more the Dropp option costs than the cheapest one (0 when Dropp wins)
    droppPremium: cheapest && cheapestDropp ? cheapestDropp.fare - cheapest.fare : null,
  };
}

// "sabse sasta cab" → cab, "bike" → bike, etc.
export function detectRideCategory(text) {
  if (/\b(bike|moto|motorcycle|scooty)\b/i.test(text)) return 'bike';
  if (/\b(auto|rickshaw|rikshaw)\b/i.test(text)) return 'auto';
  if (/\b(premier|premium|prime|sedan|suv)\b/i.test(text)) return 'premium';
  return 'cab';
}
