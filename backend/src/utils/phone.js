export function normalizeIndianPhone(input) {
    if (typeof input !== 'string') return null;
    const cleaned = input.replace(/[\s-]/g, '');
    if (!/^(\+91|91|0)?[6-9]\d{9}$/.test(cleaned)) return null;
    return '+91' + cleaned.slice(-10);
}