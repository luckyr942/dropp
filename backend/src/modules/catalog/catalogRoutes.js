import { Router } from "express";
import { handleListRestaurants, handleGetRestaurant, handleGetMenu, handleResolveItems } from "./catalogController.js";

const router = Router();

router.get('/restaurants', handleListRestaurants);
router.get('/restaurants/:id', handleGetRestaurant);
router.get('/restaurants/:id/menu', handleGetMenu);
router.post('/resolve-items', handleResolveItems);

export default router;