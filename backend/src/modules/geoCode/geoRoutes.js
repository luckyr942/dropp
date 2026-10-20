import { Router } from 'express';
import { searchPlaces } from './geocodeController.js';

const router = Router();

router.get('/search', searchPlaces);

export default router;
