import { z } from 'zod';
import { indianPhone, optionalEmail } from '../../utils/schemas.js';

export const registerSchema = z.object({
    name: z.string().trim().min(2, 'Name is too short').max(80),
    phone: indianPhone,
    email: optionalEmail,
    password: z.string().min(8, 'Password must be at least 8 characters').max(72),
    role: z.enum(['merchant', 'customer']).default('merchant'),
});

export const loginSchema = z.object({
    identifier: z.string().trim().min(3),
    password: z.string().min(1).max(72),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });