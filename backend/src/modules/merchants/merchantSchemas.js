import { z } from 'zod';
import { MERCHANT_CATEGORIES } from './merchantModel.js';
import { indianPhone, optionalEmail } from '../../utils/schemas.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24-hour)');

const base = z.object({
    name: z.string().trim().min(2, 'Store name is too short').max(100),
    category: z.enum(MERCHANT_CATEGORIES),
    description: z.string().trim().max(500).optional(),
    address: z.object({
        street: z.string().trim().min(3).max(150),
        area: z.string().trim().max(100).optional(),
        city: z.string().trim().min(2).max(60),
        state: z.string().trim().min(2).max(60),
        pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
    }),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    contact: z.object({ phone: indianPhone, email: optionalEmail }),
    gstin: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN')
        .optional(),
    fssai: z.string().trim().regex(/^\d{14}$/, 'FSSAI number must be 14 digits').optional(),
    openTime: time.optional(),
    closeTime: time.optional(),
    closedDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    image: z.string().trim().url().optional(),
});

const latLngTogether = (d) => (d.latitude === undefined) === (d.longitude === undefined);
const latLngMsg = { message: 'Provide both latitude and longitude, or neither' };
export const createMerchantSchema = base.refine(latLngTogether, latLngMsg);
export const updateMerchantSchema = base
    .partial()
    .extend({
        isOpen: z.boolean().optional(),
        settings: z
            .object({
                acceptingOrders: z.boolean().optional(),
                auraSupportEnabled: z.boolean().optional(),
                autoVoiceConfirmation: z.boolean().optional(),
            })
            .optional(),
    })
    .refine(latLngTogether, latLngMsg)
    .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });