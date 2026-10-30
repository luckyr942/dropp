import { addProduct, listProducts, updateProduct, setAvailability, adjustStock } from './productService.js';
import { wrap } from '../../utils/asyncHandler.js';

export const add = wrap(async (req, res) => {
    res.status(201).json({ success: true, data: await addProduct(req.merchant._id, req.valid.body) });
});

export const list = wrap(async (req, res) => {
    res.json({ success: true, data: await listProducts(req.merchant._id, req.valid.query) });
});

export const update = wrap(async (req, res) => {
    res.json({ success: true, data: await updateProduct(req.merchant._id, req.params.productId, req.valid.body) });
});

export const availability = wrap(async (req, res) => {
    res.json({
        success: true,
        data: await setAvailability(req.merchant._id, req.params.productId, req.valid.body.availability),
    });
});

export const stock = wrap(async (req, res) => {
    res.json({ success: true, data: await adjustStock(req.merchant._id, req.params.productId, req.valid.body.delta) });
});