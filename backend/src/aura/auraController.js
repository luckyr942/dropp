import {
  startSession,
  searchRestaurant,
  getMenuForSession,
  buildDraft,
  confirmSessionOrder,
} from './auraService.js';

//POST /api/aura/session/start
// POST /api/aura/session/start
// Aura AI / Bolna calls this when the voice session starts
export async function handleStartSession(req, res, next) {
  try {
    const { sessionId, customerId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    const realCustomerId = req.user?.id || req.headers['x-customer-id'] || customerId;
    const session = await startSession(sessionId, realCustomerId);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}


// POST /api/aura/tools/search-restaurants
// Bolna calls this when user says "Pizza places dikhao" or "Biryani chahiye"
export async function handleSearchRestaurants(req, res, next){
    try{
        const{ query } = req.body;
        if(!query){
            return res.status(400).json({success: false, error: 'query is required'});
        }
        const results = await searchRestaurant(query);
        res.json({ success: true, data: results });
    } catch (err) {
     next(err);
    }        
}



// POST /api/aura/tools/get-menu
// Bolna calls this when user selects a restaurant
export async function handleGetMenu(req, res, next) {
  try {
    const { sessionId, restaurantId } = req.body;
    if (!sessionId || !restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and restaurantId are required',
      });
    }
    const menu = await getMenuForSession(sessionId, restaurantId);
    res.json({ success: true, data: menu });
  } catch (err) {
    next(err);
  }
}
// POST /api/aura/tools/build-draft
// Bolna calls this when user specifies items (e.g., "2 Biryani and 1 Coke")
export async function handleBuildDraft(req, res, next) {
  try {
    const { sessionId, items, restaurantId, customerId } = req.body;
    if (!sessionId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and items[] are required',
      });
    }
    const realCustomerId = req.user?.id || req.headers['x-customer-id'] || customerId;
    const draft = await buildDraft(sessionId, items, restaurantId, realCustomerId);
    res.json({ success: true, data: draft });
  } catch (err) {
    next(err);
  }
}
// POST /api/aura/tools/confirm-order
// Bolna calls this ONLY when user explicitly says "Haan", "Confirm karo", "Order kardo"
export async function handleConfirmOrder(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    const result = await confirmSessionOrder(sessionId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
