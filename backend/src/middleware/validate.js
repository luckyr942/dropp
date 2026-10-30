import { httpError } from '../utils/asyncHandler.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
        return next(httpError(400, result.error.issues[0].message, result.error.issues));
    }
    req.valid = req.valid || {};
    req.valid[source] = result.data;
    next();
};