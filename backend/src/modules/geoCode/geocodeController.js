//fetch api open street map all India
export async function searchPlaces(req, res, next) {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Query too short' });
        }

        const token = process.env.MAPBOX_ACCESS_TOKEN;
        if (!token) {
            return res.status(503).json({ 
                success: false, 
                error: 'MAPBOX_ACCESS_TOKEN is not configured in backend/.env' 
            });
        }

        const encoded = encodeURIComponent(q.trim());
        const proximity = req.query.proximity || '77.2090,28.6139';
        // Biased to India (country=in) and proximity with place, locality, poi, address
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=in&proximity=${proximity}&limit=8&types=place,locality,neighborhood,address,poi&access_token=${token}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Mapbox geocoding error: ${response.status}`);
        }

        const data = await response.json();

        const results = (data.features || []).map(f => {
            const cityContext = f.context?.find(c => c.id.startsWith('place') || c.id.startsWith('district'));
            return {
                label: f.text,
                city: cityContext ? cityContext.text : '',
                address: f.place_name,
                lat: f.center[1],
                lng: f.center[0],
                placeId: f.id,
            };
        });

        return res.json({ success: true, data: results });
    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ success: false, error: 'Geocoding request timed out' });
        }
        next(err);
    }
}
