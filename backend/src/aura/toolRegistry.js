//Maps the LLM-visible tools to verified backend service function
import { searchRestaurant, getMenuForSession, buildDraft } from "./auraService.js";
import { AuraSession } from "./sessionModel.js";

export const toolMap ={
    //search restaurants by cuisine, dish or name
    search_restaurants: async({ query, sessionId })=>{
        if(typeof query !== 'string' || !query.trim()){
            throw new Error("A search query is required");
        }
        const items = await searchRestaurant(query.trim());
        return { items };
    },

    //fetch menu for specific restaurant
    get_menu: async({ restaurantId, sessionId }) =>{
        if(!restaurantId || !sessionId){
            throw new Error('restaurantId and sessionId are required');
        }
        return getMenuForSession(sessionId, restaurantId);
    },

    //building a cart draft with selected items & real DB prices
    build_draft: async({ restaurantId, items, sessionId }) => {
        if(!restaurantId){
            throw new Error('restaurantId is required to add items to cart');
        }
        if(!Array.isArray(items) || items.length === 0){
            throw new Error('At least one item is required');
        }

        for (const item of items){
            const qty = Number(item.quantity ?? 1);
            if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
                throw new Error(`Invalid quantity for "${item.name}". Must be between 1 and 20.`);
            }
            item.quantity = qty;
        }

       const draft = await buildDraft(sessionId, items, restaurantId);

       await AuraSession.findOneAndUpdate(
        { sessionId },
        { $set: { stage: 'awaiting_confirmation' } }
       );
    return draft;
  },
};

// what they do, and what arguments to provide
export const TOOL_DECLARATIONS = [
  {
    name: 'search_restaurants',
    description: 'Search for open restaurants by name, cuisine type, or dish. Call when the user wants food or mentions a craving.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Restaurant name, cuisine, or dish name' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_menu',
    description: 'Fetch the full menu for a specific restaurant. Call after user chooses a restaurant or asks what is available.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: {
          type: 'string',
          description: 'The _id of the restaurant returned by search_restaurants',
        },
      },
      required: ['restaurantId'],
    },
  },
  {
    name: 'build_draft',
    description: 'Add items to cart and create a draft order. Call when user specifies items to order with quantities.',
    parameters: {
      type: 'object',
      properties: {
        restaurantId: { type: 'string', description: 'Restaurant _id' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['name'],
          },
        },
      },
      required: ['restaurantId', 'items'],
    },
  },
];