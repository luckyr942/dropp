export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function httpError(status, message, details) {
    return Object.assign(new Error(message), { status, details });
}