export const Colors = {
    primary: '#2563EB',        // Dropp Seller Blue
    primaryDark: '#1D4ED8',
    primaryLight: '#EFF6FF',
    primaryBorder: '#BFDBFE',
    
    background: '#F8FAFC',     // Ice blue / soft slate
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    
    shadow: 'rgba(15, 23, 42, 0.08)',
};
export const Shadows = {
    card: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    button: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
};
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const Radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const Type = {
    title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
    heading: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
    body: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
    caption: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
};

// Seller-facing order status presentation
export const OrderStatusMeta = {
    confirmed: { label: 'New order', color: '#1D4ED8', bg: '#DBEAFE' },
    accepted: { label: 'Accepted', color: '#7C3AED', bg: '#EDE9FE' },
    driver_assigned: { label: 'Driver assigned', color: '#0369A1', bg: '#E0F2FE' },
    preparing: { label: 'Preparing', color: '#B45309', bg: '#FEF3C7' },
    ready_for_pickup: { label: 'Ready for pickup', color: '#047857', bg: '#D1FAE5' },
    out_for_delivery: { label: 'Out for delivery', color: '#0E7490', bg: '#CFFAFE' },
    delivered: { label: 'Delivered', color: '#15803D', bg: '#DCFCE7' },
    cancelled: { label: 'Cancelled', color: '#B91C1C', bg: '#FEE2E2' },
};
