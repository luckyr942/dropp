export function formatCurrency(value) {
    const n = Number(value) || 0;
    try {
        return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    } catch {
        return `₹${Math.round(n)}`;
    }
}

export function shortOrderId(id) {
    return `#${String(id || '').slice(-6).toUpperCase()}`;
}

export function timeAgo(dateLike) {
    if (!dateLike) return '';
    const t = new Date(dateLike).getTime();
    if (Number.isNaN(t)) return '';
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
    return new Date(t).toLocaleDateString();
}

// "HH:mm" (24h) → "9:00 AM"
export function formatTime24(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    if (!m) return hhmm || '';
    let h = Number(m[1]);
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m[2]} ${suffix}`;
}

export function formatAddress(address) {
    if (!address) return '';
    return [address.street, address.area, address.city, address.pincode].filter(Boolean).join(', ');
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// "2026-10-31" → "Sat"
export function weekdayLabel(isoDate) {
    const d = new Date(`${isoDate}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? isoDate : WEEKDAYS[d.getUTCDay()];
}
