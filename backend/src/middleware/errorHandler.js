export function notFound(req, res) {
    res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
    let status = err.status || 500;
    let message = err.message;

    if (err.code === 11000) {
        status = 409;
        message = `${Object.keys(err.keyPattern || {})[0] || 'Value'} is already in use`;
    } else if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    } else if (err.name === 'CastError') {
        status = 400;
        message = 'Invalid identifier';
    }

    if (status >= 500) {
        console.error(err);
        message = 'Something went wrong. Please try again.';
    }
    res.status(status).json({ success: false, message, ...(err.details ? { details: err.details } : {}) });
}